const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  // --- POOL OPTIMIZATION ---
  max: 40, // Increase max connections (Default is 10)
  idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
  connectionTimeoutMillis: 5000, // Return an error if a connection cannot be established within 5 seconds
});

// --- POOL MONITORING ---
pool.on("connect", (client) => {
    // Log only once per new connection to avoid noise
});

pool.on("acquire", (client) => {
    // Current pool health metrics
    const total = pool.totalCount;
    const idle = pool.idleCount;
    const waiting = pool.waitingCount;
    if (waiting > 0) {
        console.warn(`[DB Pool Warning] Connection Acquired. Total: ${total}, Idle: ${idle}, Waiting: ${waiting}`);
    }
});

pool.on("error", (err, client) => {
  console.error("❌ Unexpected error on idle client", err.message);
});

console.log(`✅ Configured for PostgreSQL: ${process.env.DB_HOST}`);

// Adapter to mimic MySQL's query signature: query(sql, params, callback)
// AND translate '?' to '$1', '$2', etc.
const query = (text, params, callback) => {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }
  
  if (!params) params = [];

  let paramIndex = 1;
  const translatedText = text.replace(/\?/g, () => `$${paramIndex++}`);

  const fs = require('fs');
  const path = require('path');
  const logFile = path.join(__dirname, '../db_queries.log');
  
  // Log the query for debugging
  const logEntry = `[${new Date().toISOString()}] QUERY: ${translatedText} | PARAMS: ${JSON.stringify(params)}\n`;
  fs.appendFileSync(logFile, logEntry);

  // PROMISE SUPPORT: If no callback provided, return a promise
  if (!callback) {
    return new Promise((resolve, reject) => {
      pool.query(translatedText, params, (err, res) => {
        if (err) {
          const sanitizedErr = { message: err.message, code: err.code, detail: err.detail };
          fs.appendFileSync(logFile, `[${new Date().toISOString()}] ❌ ERROR: ${err.message}\n`);
          console.error("❌ SQL Error:", err.message);
          return reject(sanitizedErr);
        }
        const results = res.rows || [];
        results.affectedRows = res.rowCount;
        resolve(results);
      });
    });
  }

  // CALLBACK SUPPORT
  return pool.query(translatedText, params, (err, res) => {
    if (err) {
      const sanitizedErr = { message: err.message, code: err.code, detail: err.detail };
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] ❌ ERROR: ${err.message}\n`);
      console.error("❌ SQL Error:", err.message);
      console.error("   Query:", translatedText);
      console.error("   Params:", params);
      if (callback) callback(sanitizedErr, null);
      return;
    }
    const results = res.rows || [];
    results.affectedRows = res.rowCount;
    if (callback) callback(null, results);
  });
};

const promise = function() {
    return {
        query: (text, params = []) => {
            return new Promise((resolve, reject) => {
                query(text, params, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve([results, null]);
                    }
                });
            });
        }
    };
};

module.exports = {
  query,
  pool,
  promise,
};
