import { Pool } from "pg";
import { readBackendEnv } from "./backend-env";
import { resolveTestDatabaseUrl, assertIsTestDatabase } from "./test-db";

/*
 * POST /buyer/wallet/deposit calls Paystack's live transaction/initialize on
 * every request, so using it to fund a wallet made the suite depend on an
 * outbound API with its own rate limit: running the suite a few times in a row
 * turned wallet and lifecycle specs red on "Paystack error: Rate limit
 * exceeded!" rather than on anything the backend did. The reference is just an
 * opaque string as far as the webhook handler is concerned, so the pending
 * deposit row is written directly and the signed charge.success webhook then
 * drives the real crediting path under test.
 */
export async function seedPendingDeposit(
  buyerEmail: string,
  amountKobo: number,
): Promise<string> {
  const databaseUrl = resolveTestDatabaseUrl(
    readBackendEnv().DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  );
  assertIsTestDatabase(databaseUrl);

  const reference = `e2e_dep_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const inserted = await pool.query<{ id: number }>(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, status, reference, description)
       SELECT w.id, 'deposit', $2, 'pending', $3, 'E2E seeded deposit'
       FROM buyer_wallets w
       JOIN users u ON u.id = w.user_id
       WHERE u.email = $1
       RETURNING id`,
      [buyerEmail, amountKobo, reference],
    );

    if (inserted.rowCount === 0) {
      throw new Error(`seedPendingDeposit: no wallet found for ${buyerEmail}`);
    }

    return reference;
  } finally {
    await pool.end();
  }
}
