const db = require('../config/db');

class FinanceService {
    /**
     * Get financial data for a specific period (month/year)
     */
    async getPeriodData(month, year) {
        try {
            // 1. Dapatkan atau buat periode
            let periodRes = await db.pool.query("SELECT * FROM finance_periods WHERE month = $1 AND year = $2", [month, year]);
            let period;

            if (periodRes.rows.length === 0) {
                const newPeriod = await db.pool.query(
                    "INSERT INTO finance_periods (month, year, created_at) VALUES ($1, $2, NOW()) RETURNING *",
                    [month, year]
                );
                period = newPeriod.rows[0];
            } else {
                period = periodRes.rows[0];
            }

            // 2. Ambil data pendukung
            const [configRes, locationRes, holderRes, mutationRes] = await Promise.all([
                db.pool.query("SELECT * FROM finance_configs WHERE period_id = $1", [period.id]),
                db.pool.query("SELECT * FROM finance_money_locations ORDER BY is_main DESC, name ASC"),
                db.pool.query("SELECT * FROM finance_profit_holders ORDER BY id ASC"),
                db.pool.query(`
                    SELECT m.*, l.name as location_name, tl.name as target_name 
                    FROM finance_internal_mutations m 
                    LEFT JOIN finance_money_locations l ON m.location_id = l.id 
                    LEFT JOIN finance_money_locations tl ON m.target_location_id = tl.id 
                    WHERE m.period_id = $1 
                    ORDER BY m.created_at DESC
                `, [period.id])
            ]);

            // 3. HITUNG REAL OMSET DARI INVOICES (Exclude Topup)
            const omsetRes = await db.pool.query(`
                SELECT COALESCE(SUM(final_amount), 0) as total 
                FROM invoices 
                WHERE status = 'paid' 
                AND EXTRACT(MONTH FROM paid_at) = $1 
                AND EXTRACT(YEAR FROM paid_at) = $2
                AND type != 'TOPUP'
                AND id NOT LIKE 'TOPUP-%'
            `, [month, year]);
            
            const realOmsetPenjualan = parseFloat(omsetRes.rows[0].total);

            // 4. HITUNG STATS DASHBOARD DARI MUTASI INTERNAL
            const statsRes = await db.pool.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN type = 'IN' AND category = 'REVENUE' THEN nominal ELSE 0 END), 0) as total_revenue,
                    COALESCE(SUM(CASE WHEN type = 'OUT' THEN nominal ELSE 0 END), 0) as total_expense
                FROM finance_internal_mutations 
                WHERE period_id = $1
            `, [period.id]);

            const totalRevenue = parseFloat(statsRes.rows[0].total_revenue);
            const totalExpense = parseFloat(statsRes.rows[0].total_expense);

            // 5. Hitung Laba Bersih
            const netProfit = Math.max(0, realOmsetPenjualan - totalExpense);

            // RETURN DATA (Sesuai ekspektasi Frontend)
            return {
                period: {
                    ...period,
                    omset: realOmsetPenjualan, // Update field 'omset' agar sinkron dengan Frontend
                    net_profit: netProfit
                },
                configs: configRes.rows,
                locations: locationRes.rows,
                holders: holderRes.rows,
                mutations: mutationRes.rows,
                stats: {
                    revenue: totalRevenue,
                    expense: totalExpense,
                    netProfit: netProfit
                }
            };
        } catch (error) {
            console.error("FinanceService.getPeriodData Error:", error);
            throw error;
        }
    }

    /**
     * Add a financial mutation
     */
    async addMutation(data) {
        const { period_id, type, category, nominal, location_id, target_location_id, description, created_at } = data;
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            const mutationRes = await client.query(`
                INSERT INTO finance_internal_mutations 
                (period_id, type, category, nominal, location_id, target_location_id, description, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                period_id, 
                type, 
                category || 'OTHER', 
                nominal, 
                location_id, 
                target_location_id || null, 
                description,
                created_at || new Date()
            ]);

            if (type === 'IN') {
                await client.query("UPDATE finance_money_locations SET balance = balance + $1 WHERE id = $2", [nominal, location_id]);
            } else if (type === 'OUT') {
                await client.query("UPDATE finance_money_locations SET balance = balance - $1 WHERE id = $2", [nominal, location_id]);
            } else if (type === 'TRANSFER' && target_location_id) {
                await client.query("UPDATE finance_money_locations SET balance = balance - $1 WHERE id = $2", [nominal, location_id]);
                await client.query("UPDATE finance_money_locations SET balance = balance + $1 WHERE id = $2", [nominal, target_location_id]);
            }

            await client.query('COMMIT');
            return mutationRes.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Save configs
     */
    async saveConfigs(periodId, data) {
        const { holders, configs, locations } = data;
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            if (holders && Array.isArray(holders)) {
                for (const holder of holders) {
                    await client.query("UPDATE finance_profit_holders SET name = $1 WHERE id = $2", [holder.name, holder.id]);
                }
            }

            if (configs && Array.isArray(configs)) {
                await client.query("DELETE FROM finance_configs WHERE period_id = $1", [periodId]);
                for (const conf of configs) {
                    await client.query(
                        "INSERT INTO finance_configs (period_id, type, name, percentage) VALUES ($1, $2, $3, $4)",
                        [periodId, conf.type, conf.name, conf.percentage]
                    );
                }
            }

            if (locations && Array.isArray(locations)) {
                for (const loc of locations) {
                    await client.query(
                        "UPDATE finance_money_locations SET name = $1, balance = $2, is_main = $3 WHERE id = $4",
                        [loc.name, loc.balance, loc.is_main || false, loc.id]
                    );
                }
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new FinanceService();
