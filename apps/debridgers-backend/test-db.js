const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
require("dotenv").config();

async function test() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });
  try {
    // Test basic connection
    const result = await pool.query("SELECT COUNT(*) as count FROM products");
    console.log("Direct query success:", result.rows[0]);
  } catch (err) {
    console.error("Direct query failed:", err.message);
  }

  await pool.end();
}

test();
