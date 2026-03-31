const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

pool.on("connect", () => {
    // pg connects on demand.
});

console.log(`✅ Configured for PostgreSQL: ${process.env.DB_HOST}`);

// Adapter to mimic MySQL's query signature: query(sql, params, callback)
// AND translate '?' to '$1', '$2', etc.
const query = (text, params, callback) => {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }

  let paramIndex = 1;
  const translatedText = text.replace(/\?/g, () => `$${paramIndex++}`);

  // PROMISE SUPPORT: If no callback provided, return a promise
  if (!callback) {
    return new Promise((resolve, reject) => {
      pool.query(translatedText, params, (err, res) => {
        if (err) {
          console.error("❌ SQL Error:", err.message);
          return reject(err);
        }
        const results = res.rows;
        results.affectedRows = res.rowCount;
        resolve(results);
      });
    });
  }

  // CALLBACK SUPPORT
  return pool.query(translatedText, params, (err, res) => {
    if (err) {
      console.error("❌ SQL Error:", err.message);
      console.error("   Query:", translatedText);
      console.error("   Params:", params);
      if (callback) callback(err, null);
      return;
    }
    const results = res.rows;
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
