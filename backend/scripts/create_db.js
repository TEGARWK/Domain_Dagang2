const { Client } = require("pg");
require("dotenv").config();

console.log("🛠 Try Creating Database...");

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
  database: "postgres", // Connect to default DB first
});

client.connect(async (err) => {
  if (err) {
    console.error("❌ Connection FAILED:", err.message);
    process.exit(1);
  }

  try {
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME}'`);
    if (res.rowCount === 0) {
        console.log(`Database ${process.env.DB_NAME} not found. Creating...`);
        await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
        console.log("✅ Database created successfully!");
    } else {
        console.log("✅ Database already exists.");
    }
  } catch (e) {
    console.error("❌ Failed to create DB:", e.message);
  } finally {
    client.end();
  }
});
