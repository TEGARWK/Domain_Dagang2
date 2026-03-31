const db = require('../config/db');

class PromoEventService {
    
    /**
     * Get all currently active promo events with their associated TLDs
     */
    static async getActivePromos() {
        const query = `
            SELECT 
                id, title, type as discount_type, value as discount_value,
                type, value, 
                max_discount as max_discount_amount, 
                start_date as start_at, 
                COALESCE(end_date, valid_until) as end_at, 
                priority,
                min_purchase, eligible_tlds as applicable_tlds
            FROM vouchers
            WHERE is_active = TRUE 
            AND is_automatic = TRUE
            AND (start_date IS NULL OR start_date <= NOW())
            AND (COALESCE(end_date, valid_until) IS NULL OR COALESCE(end_date, valid_until) > NOW())
            ORDER BY priority DESC, COALESCE(end_date, valid_until) ASC
        `;
        
        try {
            const { rows } = await db.pool.query(query);
            const formatted = rows.map(r => {
                let rules = [];
                try {
                    const raw = typeof r.applicable_tlds === 'string' ? JSON.parse(r.applicable_tlds) : r.applicable_tlds;
                    if (Array.isArray(raw)) {
                        rules = raw.map(t => (typeof t === 'string' ? { tld: t, min_purchase: r.min_purchase || 0 } : t));
                    }
                } catch(e) {
                    console.error("Failed to parse applicable_tlds:", e);
                }

                return {
                    ...r,
                    applicable_tlds: rules
                };
            });
            return formatted;
        } catch (error) {
            console.error("PromoEventService.getActivePromos Error:", error);
            throw error;
        }
    }

    /**
     * Calculate discounted price for a single item based on active promos
     * @param {Object} item - { name: "example.com", price: 100000 }
     * @param {Array} activePromos - List of promos from getActivePromos (optional optimization)
     */
    static async applyBestPromo(item, activePromos = null) {
        if (!activePromos) {
            activePromos = await this.getActivePromos();
        }

        const tld = '.' + item.name.split('.').slice(1).join('.');
        let bestPrice = item.price;
        let appliedPromo = null;

        for (const promo of activePromos) {
            // Check TLD eligibility
            const tldRule = promo.applicable_tlds.find(r => r.tld === tld || r.tld === 'all');
            if (!tldRule) continue;

            // Check min purchase (using item price as proxy for now, ideally cart total)
            if (item.price < parseFloat(tldRule.min_purchase)) continue;

            // Calculate Discount
            let discount = 0;
            if (promo.discount_type === 'percentage') {
                discount = item.price * (parseFloat(promo.discount_value) / 100);
                if (promo.max_discount_amount > 0) {
                    discount = Math.min(discount, parseFloat(promo.max_discount_amount));
                }
            } else { // Assuming 'fixed' type for now
                discount = parseFloat(promo.discount_value);
            }

            // Apply priority (Promos are sorted by priority DESC)
            // Since they are sorted, the first one that matches is the best (highest priority)
            // unless we want to find best VALUE among same priority.
            // For now, assuming Priority > Value.
            const newPrice = item.price - discount;
            if (newPrice < bestPrice) {
                 bestPrice = Math.max(0, newPrice); // No negative price
                 appliedPromo = promo;
                 // Since sorted by priority, can we break? 
                 // If priority is strictly hierarchical, yes.
                 // If priority is equal, maybe check next?
                 // Let's break for strict priority enforcement.
                 break; 
            }
        }

        return {
            originalPrice: item.price,
            finalPrice: bestPrice,
            discountAmount: item.price - bestPrice,
            appliedPromo
        };
    }
}

module.exports = PromoEventService;
