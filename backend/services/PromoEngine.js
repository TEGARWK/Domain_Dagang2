const db = require('../config/db');

/**
 * PromoEngine Service
 * Handles automatic promo events and manual coupon discounting with anti-loss protection.
 */
class PromoEngine {
    /**
     * calculateCartTotal
     * Scenarios:
     * 1. Apply Automatic Promo Events (Tier 1)
     * 2. Apply Manual Coupon (Tier 2) - conditional on stackability
     * 3. Anti-Boncos Protection - clamp price to cost_price
     * 
     * @param {Array} items - [{ tld_id, domain_name, base_price, cost_price, duration }]
     * @param {string} couponCode - Manual coupon code entered by user
     */
    static async calculateCartTotal(items, couponCode = null) {
        const client = await db.pool.connect();
        try {
            let subtotal = 0;
            let totalDiscount = 0;
            const appliedPromos = [];
            let hasEventDiscount = false;

            if (!items || items.length === 0) {
                return {
                    subtotal: 0,
                    total_discount: 0,
                    final_total: 0,
                    applied_promos: [],
                    items: []
                };
            }

            // 1. Fetch Active Promo Events for the TLDs in cart
            const tldRegexString = /\.[a-z]{2,}(\.[a-z]{2})?$/;
            const tldsFound = [...new Set(items.map(i => {
                const match = i.name.toLowerCase().match(tldRegexString);
                return match ? match[0] : "." + i.name.split('.').slice(1).join('.');
            }))];

            const eventsRes = await client.query(`
                SELECT *
                FROM promo_events
                WHERE is_active = TRUE 
                  AND is_automatic = TRUE
                  AND (eligible_tlds ?| $1::text[] OR eligible_tlds @> '["all"]')
                  AND NOW() BETWEEN COALESCE(start_date, '1900-01-01') AND COALESCE(end_date, '9999-12-31')
                ORDER BY priority DESC
            `, [tldsFound]);

            const activeEvents = eventsRes.rows;

            // 2. Fetch Coupon details if provided
            let coupon = null;
            if (couponCode) {
                const couponRes = await client.query(`
                    SELECT * FROM coupons 
                    WHERE code = $1 
                      AND is_active = TRUE
                      AND is_automatic = FALSE
                      AND (valid_until IS NULL OR valid_until > NOW())
                `, [couponCode.toUpperCase()]);
                coupon = couponRes.rows[0];
                
                if (coupon) {
                    // Check quota
                    if (coupon.usage_limit > 0 && (coupon.usage_count + coupon.locked_count) >= coupon.usage_limit) {
                        coupon = null; // Quota full, treat as invalid coupon
                    }
                }
            }

            // 3. Process each item
            const processedItems = items.map(item => {
                let itemPrice = parseFloat(item.base_price) * (item.duration || 1);
                let itemCost = parseFloat(item.cost_price) * (item.duration || 1);
                let itemDiscount = 0;
                let eventApplied = null;

                subtotal += itemPrice;

                // A. Apply Promo Event (Automatic)
                // Find first (highest priority) event that includes this item's TLD or 'all'
                const tldRegex = /\.[a-z]{2,}(\.[a-z]{2})?$/;
                const match = item.name.toLowerCase().match(tldRegex);
                const itemTld = match ? match[0] : "." + item.name.split('.').slice(1).join('.');
                const event = activeEvents.find(e => {
                    try {
                        const tlds = typeof e.eligible_tlds === 'string' ? JSON.parse(e.eligible_tlds) : e.eligible_tlds;
                        const actions = typeof e.eligible_actions === 'string' ? JSON.parse(e.eligible_actions) : e.eligible_actions;
                        
                        const tldMatch = !tlds || tlds.length === 0 || tlds.includes(itemTld) || tlds.includes('all');
                        const actionMatch = !actions || actions.length === 0 || actions.includes(item.action) || actions.includes('all');
                        
                        return tldMatch && actionMatch;
                    } catch (err) {
                        return false;
                    }
                });

                if (event) {
                    let discountAmount = 0;
                    if (event.type === 'percentage') {
                        discountAmount = itemPrice * (parseFloat(event.value) / 100);
                        if (event.max_discount && discountAmount > parseFloat(event.max_discount)) {
                            discountAmount = parseFloat(event.max_discount);
                        }
                    } else {
                        discountAmount = parseFloat(event.value);
                    }

                    // Anti-Boncos clamping (at Item Level)
                    const potentialPrice = itemPrice - discountAmount;
                    if (potentialPrice < itemCost) {
                        discountAmount = Math.max(0, itemPrice - itemCost);
                    }

                    if (discountAmount > 0) {
                        itemDiscount += discountAmount;
                        eventApplied = { id: event.id, title: event.title, type: 'event' };
                        hasEventDiscount = true;
                    }
                }

                return { 
                    ...item, 
                    item_subtotal: itemPrice, // Base price * duration
                    current_price: itemPrice - itemDiscount, // Running total after event
                    item_discount: itemDiscount, // Event discount only for now
                    effective_price: itemPrice - itemDiscount, // Final price after capping
                    event_applied: eventApplied
                };
            });

            // B. Apply Coupon (Manual)
            let couponApplied = null;
            if (coupon) {
                // Rule: If item has event discount and coupon is not stackable, block coupon
                if (!coupon.is_stackable && hasEventDiscount) {
                    // Non-stackable with event promos.
                } else {
                    let couponTotalDiscount = 0;
                    const currentTotalAfterEvents = processedItems.reduce((acc, i) => acc + i.current_price, 0);
                    
                    if (currentTotalAfterEvents >= parseFloat(coupon.min_purchase || 0)) {
                        const couponActions = typeof coupon.eligible_actions === 'string' ? JSON.parse(coupon.eligible_actions) : coupon.eligible_actions;
                        const isActionMatchAll = !couponActions || couponActions.length === 0 || couponActions.includes('all');
                        
                        const couponTlds = typeof coupon.eligible_tlds === 'string' ? JSON.parse(coupon.eligible_tlds) : coupon.eligible_tlds;
                        const isTldMatchAll = !couponTlds || couponTlds.length === 0 || couponTlds.includes('all');

                        if (coupon.type === 'percentage') {
                            processedItems.forEach(pItem => {
                                const tldRegex = /\.[a-z]{2,}(\.[a-z]{2})?$/;
                                const match = pItem.name.toLowerCase().match(tldRegex);
                                const itemTld = match ? match[0] : "." + pItem.name.split('.').slice(1).join('.');

                                const isEligibleAction = isActionMatchAll || (Array.isArray(couponActions) && couponActions.includes(pItem.action));
                                const isEligibleTld = isTldMatchAll || (Array.isArray(couponTlds) && couponTlds.includes(itemTld));

                                if (!isEligibleAction || !isEligibleTld) return;

                                let disc = pItem.current_price * (parseFloat(coupon.value) / 100);
                                
                                // Anti-Boncos floor: current_price vs cost_price
                                const itemCost = parseFloat(pItem.cost_price) * (pItem.duration || 1);
                                const availableMargin = pItem.current_price - itemCost;
                                
                                // Cap to available margin
                                if (disc > availableMargin) disc = Math.max(0, availableMargin);
                                
                                pItem.current_price -= disc;
                                pItem.item_discount += disc;
                                pItem.effective_price = pItem.current_price;
                                couponTotalDiscount += disc;
                            });
                        } else {
                            // Fixed amount distribution (Only for eligible items)
                            let remainingFixed = parseFloat(coupon.value);
                            processedItems.forEach(pItem => {
                                const tldRegex = /\.[a-z]{2,}(\.[a-z]{2})?$/;
                                const match = pItem.name.toLowerCase().match(tldRegex);
                                const itemTld = match ? match[0] : "." + pItem.name.split('.').slice(1).join('.');

                                const isEligibleAction = isActionMatchAll || (Array.isArray(couponActions) && couponActions.includes(pItem.action));
                                const isEligibleTld = isTldMatchAll || (Array.isArray(couponTlds) && couponTlds.includes(itemTld));

                                if (!isEligibleAction || !isEligibleTld) return;

                                const itemCost = parseFloat(pItem.cost_price) * (pItem.duration || 1);
                                const availableMargin = pItem.current_price - itemCost;
                                
                                let disc = Math.min(remainingFixed, availableMargin);
                                if (disc > 0) {
                                    pItem.current_price -= disc;
                                    pItem.item_discount += disc;
                                    pItem.effective_price = pItem.current_price;
                                    couponTotalDiscount += disc;
                                    remainingFixed -= disc;
                                }
                            });
                        }

                        if (couponTotalDiscount > 0) {
                            couponApplied = { id: coupon.id, code: coupon.code, type: 'coupon' };
                        }
                    }
                }
            }

            const finalTotal = processedItems.reduce((acc, i) => acc + i.current_price, 0);
            totalDiscount = subtotal - finalTotal;

            // Collect unique promos applied
            const events = [...new Set(processedItems.filter(i => i.event_applied).map(i => i.event_applied.title))];
            const resultApplied = events.map(t => ({ title: t, type: 'event' }));
            if (couponApplied) resultApplied.push(couponApplied);

            return {
                subtotal,
                total_discount: totalDiscount, // This is effective_discount (Subtotal - Final)
                final_total: finalTotal,
                applied_promos: resultApplied,
                items: processedItems
            };

        } finally {
            client.release();
        }
    }

    /**
     * reserveCoupon
     * Reserves a slot for a coupon to prevent double-spending in high-concurrency.
     * Must be called inside a transaction.
     */
    static async reserveCoupon(userId, couponId, invoiceId, client) {
        // 1. Lock Coupon Row for Update
        const couponRes = await client.query(`
            SELECT id, usage_limit_total, used_count, locked_count 
            FROM coupons 
            WHERE id = $1 
            FOR UPDATE
        `, [couponId]);

        const coupon = couponRes.rows[0];
        if (!coupon) throw new Error("Coupon not found");

        // 2. Check Capacity
        if (coupon.usage_limit_total > 0) {
            const currentUsage = parseInt(coupon.used_count) + parseInt(coupon.locked_count);
            if (currentUsage >= parseInt(coupon.usage_limit_total)) {
                throw new Error("Coupon quota has been reached (Fully Reserved)");
            }
        }

        // 3. Insert Reservation
        const expiresAt = new Date(Date.now() + 15 * 60000); // 15 Minutes expiry
        await client.query(`
            INSERT INTO coupon_reservations (coupon_id, user_id, invoice_id, expires_at)
            VALUES ($1, $2, $3, $4)
        `, [couponId, userId, invoiceId, expiresAt]);

        // 4. Update Locked Count
        await client.query(`
            UPDATE coupons 
            SET locked_count = locked_count + 1, updated_at = NOW() 
            WHERE id = $1
        `, [couponId]);

        return { success: true, expires_at: expiresAt };
    }
}

module.exports = PromoEngine;
