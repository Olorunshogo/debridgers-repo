const { Client } = require("pg");
require("dotenv").config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("✓ Connected successfully");

    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(
      "Tables in database:",
      result.rows.map((r) => r.table_name),
    );

    await client.end();
  } catch (err) {
    console.error("✗ Error:", err.message);
    process.exit(1);
  }
}

test();
