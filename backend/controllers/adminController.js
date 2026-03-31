const db = require("../config/db");

exports.getDashboardStats = (req, res) => {
  // Navigation offset: 0 = current, 1 = previous period, 2 = 2 periods ago, etc.
  const chartOffset = parseInt(req.query.offset) || 0;

  // Calculate bracket conditions based on offset
  const dailyOffsetStart = chartOffset * 7;
  const dailyOffsetEnd = dailyOffsetStart + 7;
  
  const monthlyOffsetStart = chartOffset * 12;
  const monthlyOffsetEnd = monthlyOffsetStart + 12;

  const yearlyOffsetStart = chartOffset * 5;
  const yearlyOffsetEnd = yearlyOffsetStart + 5;

  const queries = {
    totalUsers: "SELECT COUNT(*) as count FROM users",
    activeDomains: "SELECT COUNT(*) as count FROM domains WHERE status = 'active'",
    pendingInvoices: "SELECT COUNT(*) as count FROM invoices WHERE status = 'pending'",
    totalRevenue: "SELECT SUM(total) as total FROM invoices WHERE status = 'paid'",
    troubledDomains: "SELECT COUNT(*) as count FROM domains WHERE status IN ('failed', 'paid', 'registering', 'provisioned')",
    // Added Sales Analytics with Offset Support
    dailySales: `
        WITH date_series AS (
            SELECT generate_series(
                CURRENT_DATE - INTERVAL '${dailyOffsetEnd - 1} days',
                CURRENT_DATE - INTERVAL '${dailyOffsetStart} days',
                '1 day'::interval
            )::DATE AS date
        )
        SELECT 
            TO_CHAR(ds.date, 'Dy') as label,
            COALESCE(SUM(i.total), 0) as value
        FROM date_series ds
        LEFT JOIN invoices i ON i.date::DATE = ds.date AND i.status = 'paid'
        GROUP BY ds.date
        ORDER BY ds.date ASC
    `,
    monthlySales: `
        WITH month_series AS (
            SELECT generate_series(
                date_trunc('month', CURRENT_DATE) - INTERVAL '${monthlyOffsetEnd - 1} months',
                date_trunc('month', CURRENT_DATE) - INTERVAL '${monthlyOffsetStart} months',
                '1 month'::interval
            )::DATE AS month
        )
        SELECT 
            TO_CHAR(ms.month, 'Mon') as label,
            COALESCE(SUM(i.total), 0) as value
        FROM month_series ms
        LEFT JOIN invoices i ON date_trunc('month', i.date::DATE) = ms.month AND i.status = 'paid'
        GROUP BY ms.month
        ORDER BY ms.month ASC
    `,
    yearlySales: `
        WITH year_series AS (
            SELECT generate_series(
                date_trunc('year', CURRENT_DATE) - INTERVAL '${yearlyOffsetEnd - 1} years',
                date_trunc('year', CURRENT_DATE) - INTERVAL '${yearlyOffsetStart} years',
                '1 year'::interval
            )::DATE AS year
        )
        SELECT 
            TO_CHAR(ys.year, 'YYYY') as label,
            COALESCE(SUM(i.total), 0) as value
        FROM year_series ys
        LEFT JOIN invoices i ON date_trunc('year', i.date::DATE) = ys.year AND i.status = 'paid'
        GROUP BY ys.year
        ORDER BY ys.year ASC
    `
  };

  const queryPromise = (sql) => {
      return new Promise((resolve, reject) => {
          db.query(sql, (err, result) => {
              if (err) reject(err);
              else resolve(result); // Return full result array
          });
      });
  };

  Promise.all([
      queryPromise(queries.totalUsers),
      queryPromise(queries.activeDomains),
      queryPromise(queries.pendingInvoices),
      queryPromise(queries.totalRevenue),
      queryPromise(queries.troubledDomains),
      queryPromise(queries.dailySales),
      queryPromise(queries.monthlySales),
      queryPromise(queries.yearlySales)
  ])
  .then(([users, domains, invoices, revenue, troubled, daily, monthly, yearly]) => {
      res.json({
          totalUsers: users[0].count,
          activeDomains: domains[0].count,
          pendingInvoices: invoices[0].count,
          totalRevenue: revenue[0].total || 0,
          troubledDomains: troubled[0].count,
          analytics: {
              Daily: daily,
              Monthly: monthly,
              Yearly: yearly
          }
      });
  })
  .catch(err => {
      console.error("Stats Error:", err);
      res.status(500).json({ error: "Failed to fetch stats" });
  });
};
