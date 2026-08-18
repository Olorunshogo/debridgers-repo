import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "../src/infrastructure/persistence/index";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

interface CreateCustomerDto {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

async function createPaystackCustomer(
  dto: CreateCustomerDto,
): Promise<{ id: number; customer_code: string }> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not set");

  const response = await fetch("https://api.paystack.co/customer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: dto.email,
      first_name: dto.firstName,
      last_name: dto.lastName,
      phone: dto.phone,
    }),
  });

  const data = (await response.json()) as {
    status: boolean;
    message?: string;
    data?: { id: number; customer_code: string };
  };

  if (!data.status || !data.data) {
    throw new Error(`Failed to create Paystack customer: ${data.message}`);
  }

  return data.data;
}

async function resolvePreferredBank(): Promise<string> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not set");

  const response = await fetch(
    "https://api.paystack.co/dedicated_account/available_providers",
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );

  const data = (await response.json()) as {
    status: boolean;
    message?: string;
    data?: Array<{ provider_slug: string }>;
  };

  if (!data.status || !data.data?.length) {
    throw new Error(`No DVA providers available: ${data.message}`);
  }

  const configured = process.env.PAYSTACK_PREFERRED_BANK;
  const match = configured
    ? data.data.find((p) => p.provider_slug === configured)
    : undefined;

  return match?.provider_slug ?? data.data[0].provider_slug;
}

/*
 * POST /dedicated_account against an existing customer returns the account
 * synchronously. The previous version called /dedicated_account/assign and then
 * polled GET /dedicated_account?customer=, reading .account_number off a
 * response whose data is an array - so it never matched and every buyer hit the
 * 30-second timeout.
 */
async function createDvaForCustomer(
  customerCode: string,
  preferredBank: string,
): Promise<{
  account_number: string;
  bank_name: string;
  account_name: string;
}> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not set");

  const response = await fetch("https://api.paystack.co/dedicated_account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: customerCode,
      preferred_bank: preferredBank,
    }),
  });

  const data = (await response.json()) as {
    status: boolean;
    message?: string;
    data?: {
      account_number: string;
      account_name: string;
      bank: { name: string; id: number; slug: string };
    };
  };

  if (!data.status || !data.data?.account_number) {
    throw new Error(`Failed to create DVA: ${data.message}`);
  }

  return {
    account_number: data.data.account_number,
    bank_name: data.data.bank.name,
    account_name: data.data.account_name,
  };
}

async function backfillDvas() {
  console.log("🔵 Starting DVA backfill for existing buyers...");

  try {
    // Get all buyers without DVA
    const buyers = await db
      .select()
      .from(schema.users)
      .innerJoin(
        schema.buyerWallets,
        eq(schema.users.id, schema.buyerWallets.user_id),
      )
      .where(eq(schema.users.role, "buyer"));

    console.log(`✓ Found ${buyers.length} buyer wallets`);

    const buyersWithoutDva = buyers.filter(
      (b) => !b.buyer_wallets.paystack_customer_code,
    );
    console.log(`✓ ${buyersWithoutDva.length} need DVA backfill`);

    if (buyersWithoutDva.length === 0) {
      console.log("✓ All buyers already have DVAs!");
      await pool.end();
      return;
    }

    const preferredBank = await resolvePreferredBank();
    console.log(`✓ Using provider: ${preferredBank}`);

    let successCount = 0;
    let failCount = 0;

    for (const record of buyersWithoutDva) {
      const user = record.users;
      const wallet = record.buyer_wallets;

      try {
        console.log(`\n📝 Processing user ${user.id} (${user.email})...`);

        // Create Paystack customer
        const customer = await createPaystackCustomer({
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone || "",
        });
        console.log(`  ✓ Created Paystack customer ${customer.customer_code}`);

        // Create the dedicated account
        const dva = await createDvaForCustomer(
          customer.customer_code,
          preferredBank,
        );
        console.log(
          `  ✓ Created DVA: ${dva.account_number} (${dva.bank_name})`,
        );

        // Update database
        await db
          .update(schema.buyerWallets)
          .set({
            paystack_customer_code: customer.customer_code,
            account_number: dva.account_number,
            bank_name: dva.bank_name,
            account_name: dva.account_name,
          })
          .where(eq(schema.buyerWallets.id, wallet.id));

        console.log(`  ✓ Updated wallet in database`);
        successCount++;

        // Rate limit: wait 100ms between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `  ✗ Failed to create DVA for user ${user.id}:`,
          error instanceof Error ? error.message : error,
        );
        failCount++;
      }
    }

    console.log(`\n\n✓ DVA backfill complete!`);
    console.log(`  ✓ Success: ${successCount}`);
    console.log(`  ✗ Failed: ${failCount}`);
  } catch (error) {
    console.error("✗ Backfill failed:", error);
  } finally {
    await pool.end();
  }
}

backfillDvas();
