const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

console.log("🛠 Migrating Schema to PostgreSQL...");

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const schemaPath = path.join(__dirname, "../database_pg.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Connection FAILED:", err.message);
    process.exit(1);
  }

  console.log("✅ Connected. Applying schema...");
  
  // Split formatting might be needed if multiple statements, 
  // but pg driver usually handles multiple statements in one query call if strictly valid SQL.
  client.query(schemaSql, (err, result) => {
    release();
    if (err) {
      console.error("❌ Error executing schema:", err.message);
    } else {
      console.log("✅ Schema applied successfully!");
    }
    process.exit(0);
  });
});
