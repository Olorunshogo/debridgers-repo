import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, isNull } from "drizzle-orm";
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

  if (!data.status) {
    throw new Error(`Failed to create Paystack customer: ${data.message}`);
  }

  return data.data!;
}

async function assignDvaToCustomer(
  customerCode: string,
  dto: CreateCustomerDto,
): Promise<{
  account_number: string;
  bank: string;
  account_name: string;
}> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not set");

  const response = await fetch(
    "https://api.paystack.co/dedicated_account/assign",
    {
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
        preferred_bank: "wema-bank",
        country: "NG",
      }),
    },
  );

  const data = (await response.json()) as {
    status: boolean;
    message?: string;
    data?: {
      account_number: string;
      bank: string;
      account_name: string;
    };
  };

  if (!data.status) {
    throw new Error(`Failed to assign DVA: ${data.message}`);
  }

  // DVA assignment is asynchronous, so we poll for the account details
  // Wait up to 30 seconds for the DVA to be ready
  for (let attempt = 0; attempt < 30; attempt++) {
    const getResponse = await fetch(
      `https://api.paystack.co/dedicated_account?customer=${customerCode}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    const getData = (await getResponse.json()) as {
      status: boolean;
      data?: {
        account_number: string;
        bank: string;
        account_name: string;
      };
    };

    if (getData.status && getData.data?.account_number) {
      return getData.data;
    }

    // Wait 1 second before retry
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    "DVA assignment timeout - account details not ready after 30 seconds",
  );
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

        // Assign DVA
        const dva = await assignDvaToCustomer(customer.customer_code, {
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone || "",
        });
        console.log(`  ✓ Created DVA: ${dva.account_number} (${dva.bank})`);

        // Update database
        await db
          .update(schema.buyerWallets)
          .set({
            paystack_customer_code: customer.customer_code,
            account_number: dva.account_number,
            bank_name: dva.bank,
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
