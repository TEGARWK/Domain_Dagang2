const db = require('../config/db');

/**
 * ReportService
 * Handles financial and marketing analytics for the administrative dashboard.
 */
class ReportService {
    /**
     * getDiscountPerformance
     * Aggregates revenue and discount metrics from historical invoices.
     * @param {string} startDate - optional ISO date
     * @param {string} endDate - optional ISO date
     */
    static async getDiscountPerformance(startDate = null, endDate = null) {
        // Default to last 30 days if not provided
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();

        try {
            // 1. Core Financial Metrics (Paid/Settled invoices only for accurate revenue)
            const metricsQuery = `
                SELECT 
                    SUM(subtotal) as gross_revenue,
                    SUM(total_discount) as total_discounts_given,
                    SUM(final_amount) as net_revenue,
                    COUNT(*) as total_invoices
                FROM invoices
                WHERE date BETWEEN $1 AND $2
                AND status IN ('paid', 'settled', 'COMPLETED')
            `;
            const metricsRes = await db.pool.query(metricsQuery, [start, end]);
            const metrics = metricsRes.rows[0];

            // 2. Top Performing Vouchers
            const topVouchersQuery = `
                SELECT 
                    coupon_code,
                    COUNT(*) as usage_count,
                    SUM(total_discount) as total_savings_provided
                FROM invoices
                WHERE date BETWEEN $1 AND $2
                AND coupon_code IS NOT NULL
                AND status IN ('paid', 'settled', 'COMPLETED')
                GROUP BY coupon_code
                ORDER BY usage_count DESC
                LIMIT 5
            `;
            const topVouchersRes = await db.pool.query(topVouchersQuery, [start, end]);

            return {
                summary: {
                    period: { start, end },
                    gross_revenue: parseFloat(metrics.gross_revenue || 0),
                    total_discounts: parseFloat(metrics.total_discounts_given || 0),
                    net_revenue: parseFloat(metrics.net_revenue || 0),
                    total_invoices: parseInt(metrics.total_invoices || 0),
                    average_discount_rate: metrics.gross_revenue > 0 
                        ? (parseFloat(metrics.total_discounts_given || 0) / parseFloat(metrics.gross_revenue)) * 100 
                        : 0
                },
                top_vouchers: topVouchersRes.rows.map(v => ({
                    code: v.coupon_code,
                    usage: parseInt(v.usage_count),
                    savings: parseFloat(v.total_savings_provided)
                }))
            };

        } catch (error) {
            console.error("ReportService.getDiscountPerformance Error:", error);
            throw error;
        }
    }
}

module.exports = ReportService;
