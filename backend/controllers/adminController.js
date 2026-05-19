const db = require("../config/db");
const referralService = require("../services/referralService");
const redisClient = require("../config/redisClient");

exports.renderDashboard = async (req, res) => {
  try {
    // 1. Ambil Stats General
    const statsQuery = {
      totalRevenue: "SELECT SUM(total) as val FROM invoices WHERE status = 'paid'",
      totalUsers: "SELECT COUNT(*) as val FROM users",
      activeVouchers: "SELECT COUNT(*) as val FROM vouchers WHERE is_active = true",
      pendingReferrals: "SELECT SUM(reward_amount) as val FROM referral_rewards WHERE status = 'pending'",
      newUsersToday: "SELECT COUNT(*) as val FROM users WHERE created_at >= CURRENT_DATE"
    };

    const [rev, users, voc, ref, newUsers] = await Promise.all([
      db.pool.query(statsQuery.totalRevenue),
      db.pool.query(statsQuery.totalUsers),
      db.pool.query(statsQuery.activeVouchers),
      db.pool.query(statsQuery.pendingReferrals),
      db.pool.query(statsQuery.newUsersToday)
    ]);

    // 2. Data Grafik (7 Hari Terakhir)
    const chartRes = await db.pool.query(`
        WITH date_series AS (
            SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::DATE AS date
        )
        SELECT 
            TO_CHAR(ds.date, 'DD/MM') as label,
            COALESCE(SUM(i.total), 0) as value
        FROM date_series ds
        LEFT JOIN invoices i ON i.date::DATE = ds.date AND i.status = 'paid'
        GROUP BY ds.date
        ORDER BY ds.date ASC
    `);

    // 3. Sumber User (Pie Chart)
    const sourceRes = await db.pool.query(`
        SELECT 
            CASE WHEN referred_by_id IS NULL THEN 'Organik' ELSE 'Referral' END as label,
            COUNT(*) as value
        FROM users
        GROUP BY label
    `);

    res.render('admin/dashboard', {
        title: 'Dashboard Admin',
        activePage: 'dashboard',
        stats: {
            revenue: rev.rows[0].val || 0,
            users: users.rows[0].val || 0,
            vouchers: voc.rows[0].val || 0,
            referrals: ref.rows[0].val || 0,
            newUsers: newUsers.rows[0].val || 0
        },
        charts: {
            sales: chartRes.rows,
            sources: sourceRes.rows
        }
    });

  } catch (err) {
    console.error("Render Dashboard Error:", err);
    res.status(500).send("Gagal memuat dashboard admin.");
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const chartOffset = parseInt(req.query.offset) || 0;
    
    const dailyOffsetStart = chartOffset * 7;
    const dailyOffsetEnd = dailyOffsetStart + 7;
    const monthlyOffsetStart = chartOffset * 12;
    const monthlyOffsetEnd = monthlyOffsetStart + 12;
    const yearlyOffsetStart = chartOffset * 5;
    const yearlyOffsetEnd = yearlyOffsetStart + 5;

    // Execute all queries in parallel gracefully
    const [
      usersRes, domainsRes, invoicesRes, paidInvoicesRes, revenueRes, troubledRes, 
      dailyRes, monthlyRes, yearlyRes, pendingTicketsRes, manualVerifRes, 
      extensionDistRes, recentTxRes
    ] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM users"),
      db.query("SELECT COUNT(*) as count FROM domains WHERE status = 'active'"),
      db.query("SELECT COUNT(*) as count FROM invoices WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) as count FROM invoices WHERE status = 'paid'"),
      db.query("SELECT SUM(final_amount) as total FROM invoices WHERE status = 'paid' AND type != 'TOPUP' AND id NOT LIKE 'TOPUP-%' AND EXTRACT(MONTH FROM paid_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM paid_at) = EXTRACT(YEAR FROM CURRENT_DATE)"),
      db.query("SELECT COUNT(*) as count FROM domains WHERE status IN ('failed', 'paid', 'registering', 'provisioned')"),
      db.query(`
          WITH date_series AS (
              SELECT generate_series(
                  CURRENT_DATE - (INTERVAL '1 day' * ${dailyOffsetEnd - 1}),
                  CURRENT_DATE - (INTERVAL '1 day' * ${dailyOffsetStart}),
                  '1 day'::interval
              )::DATE AS date
          )
          SELECT TO_CHAR(ds.date, 'Dy') as label, COALESCE(SUM(i.final_amount), 0) as value
          FROM date_series ds
          LEFT JOIN invoices i ON i.paid_at::DATE = ds.date AND i.status = 'paid' AND i.type != 'TOPUP' AND i.id NOT LIKE 'TOPUP-%'
          GROUP BY ds.date, ds.date ORDER BY ds.date ASC
      `),
      db.query(`
          WITH month_series AS (
              SELECT generate_series(
                  date_trunc('month', CURRENT_DATE) - (INTERVAL '1 month' * ${monthlyOffsetEnd - 1}),
                  date_trunc('month', CURRENT_DATE) - (INTERVAL '1 month' * ${monthlyOffsetStart}),
                  '1 month'::interval
              )::DATE AS month
          )
          SELECT TO_CHAR(ms.month, 'Mon') as label, COALESCE(SUM(i.final_amount), 0) as value
          FROM month_series ms
          LEFT JOIN invoices i ON date_trunc('month', i.paid_at::DATE) = ms.month AND i.status = 'paid' AND i.type != 'TOPUP' AND i.id NOT LIKE 'TOPUP-%'
          GROUP BY ms.month, ms.month ORDER BY ms.month ASC
      `),
      db.query(`
          WITH year_series AS (
              SELECT generate_series(
                  date_trunc('year', CURRENT_DATE) - (INTERVAL '1 year' * ${yearlyOffsetEnd - 1}),
                  date_trunc('year', CURRENT_DATE) - (INTERVAL '1 year' * ${yearlyOffsetStart}),
                  '1 year'::interval
              )::DATE AS year
          )
          SELECT TO_CHAR(ys.year, 'YYYY') as label, COALESCE(SUM(i.final_amount), 0) as value
          FROM year_series ys
          LEFT JOIN invoices i ON date_trunc('year', i.paid_at::DATE) = ys.year AND i.status = 'paid' AND i.type != 'TOPUP' AND i.id NOT LIKE 'TOPUP-%'
          GROUP BY ys.year, ys.year ORDER BY ys.year ASC
      `),
      db.query("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'"),
      db.query("SELECT COUNT(*) as count FROM invoices WHERE status = 'pending' AND (payment_method LIKE 'MANUAL_%' OR payment_method = 'MANUAL')"),
      db.query(`
          SELECT 
            '.' || split_part(domain_name, '.', array_length(string_to_array(domain_name, '.'), 1)) as tld, 
            COUNT(*) as count 
          FROM domains 
          WHERE status = 'active' AND domain_name LIKE '%.%'
          GROUP BY tld 
          ORDER BY count DESC 
          LIMIT 5
      `),
      db.query(`
          SELECT i.id, i.total, i.date, i.status, COALESCE(u.name, 'Customer') as customer_name,
          (SELECT action_type FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as action_type,
          (SELECT name FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as first_item
          FROM invoices i
          LEFT JOIN users u ON i.user_id = u.id
          ORDER BY i.date DESC
          LIMIT 5
      `)
    ]);

    // Robust extraction (handling both array and object responses if db wrapper differs)
    const getCount = (res) => (Array.isArray(res) ? res[0]?.count : res?.rows?.[0]?.count) || 0;
    const getSum = (res) => (Array.isArray(res) ? res[0]?.total : res?.rows?.[0]?.total) || 0;
    const getRows = (res) => (Array.isArray(res) ? res : res?.rows || []);

    console.log(`[AdminStats] Users: ${getCount(usersRes)}, Domains: ${getCount(domainsRes)}, Pending Inv: ${getCount(invoicesRes)}`);
    console.log(`[AdminStats] Extension Dist Rows: ${getRows(extensionDistRes).length}`);
    console.log(`[AdminStats] Recent Tx Rows: ${getRows(recentTxRes).length}`);

    // Recent Transactions with Mapping
    const recentTxRows = getRows(recentTxRes).map(tx => {
        let category = 'REGISTER';
        const at = (tx.action_type || '').toUpperCase();
        const firstItem = (tx.first_item || '').toLowerCase();
        
        if (at === 'TOPUP' || firstItem.includes('top up')) category = 'TOPUP';
        else if (at === 'TRANSFER') category = 'TRANSFER';
        else if (at === 'RENEW') category = 'RENEW';
        else if (at === 'RESTORE') category = 'RESTORE';
        return { ...tx, category };
    });

    res.json({
        totalUsers: getCount(usersRes),
        activeDomains: getCount(domainsRes),
        pendingInvoices: getCount(invoicesRes),
        paidInvoices: getCount(paidInvoicesRes),
        totalRevenue: getSum(revenueRes),
        troubledDomains: getCount(troubledRes),
        pendingTickets: getCount(pendingTicketsRes),
        manualVerifPending: getCount(manualVerifRes),
        extensionDistribution: getRows(extensionDistRes),
        recentTransactions: recentTxRows,
        analytics: {
            Daily: getRows(dailyRes),
            Monthly: getRows(monthlyRes),
            Yearly: getRows(yearlyRes)
        }
    });
  } catch (err) {
    console.error("Stats API Error:", err);
    res.status(500).json({ error: "Gagal memuat statistik." });
  }
};

exports.renderTransactions = async (req, res) => {
  try {
    const query = `
        SELECT i.*, u.name as user_name
        FROM invoices i
        JOIN users u ON i.user_id = u.id
        ORDER BY i.date DESC
        LIMIT 100
    `;
    const result = await db.pool.query(query);

    res.render('admin/transaction_list', {
        title: 'Daftar Transaksi',
        activePage: 'transactions',
        transactions: result.rows
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.renderUsers = async (req, res) => {
  try {
    const query = `
        SELECT u.*, 
        (SELECT COUNT(*) FROM invoices WHERE user_id = u.id AND status = 'paid') as total_orders,
        (SELECT SUM(total) FROM invoices WHERE user_id = u.id AND status = 'paid') as total_spent,
        (SELECT tier_name FROM referral_tiers WHERE min_referrals <= (SELECT COUNT(*) FROM referral_rewards WHERE referrer_id = u.id AND status = 'active') ORDER BY min_referrals DESC LIMIT 1) as referral_tier
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT 100
    `;
    const result = await db.pool.query(query);

    res.render('admin/user_list', {
        title: 'Daftar User',
        activePage: 'users',
        users: result.rows
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
};
