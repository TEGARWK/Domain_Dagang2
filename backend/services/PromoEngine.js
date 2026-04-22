const db = require('../config/db');

/**
 * PromoEngine Service
 * Handles automatic promo events and manual coupon discounting with anti-loss protection.
 * Schema standard: discount_type, discount_value, quota, quota_used, min_transaction, started_at, expired_at.
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
                const name = i.domain_name || i.name || '';
                const match = name.toLowerCase().match(tldRegexString);
                return match ? match[0] : "." + name.split('.').slice(1).join('.');
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
                    SELECT * FROM vouchers 
                    WHERE code = $1 
                      AND is_active = TRUE
                      AND is_automatic = FALSE
                      AND (expired_at IS NULL OR expired_at > NOW())
                `, [couponCode.toUpperCase()]);
                coupon = couponRes.rows[0];
                
                if (coupon) {
                    // Check quota
                    const currentUsage = parseInt(coupon.quota_used || 0) + parseInt(coupon.locked_count || 0);
                    if (coupon.quota > 0 && currentUsage >= coupon.quota) {
                        coupon = null; // Quota full
                    }
                }
            }

            // 3. Process each item
            const processedItems = items.map(item => {
                const name = item.domain_name || item.name || '';
                let itemPrice = parseFloat(item.base_price || item.price || 0) * (item.duration || 1);
                let itemCost = parseFloat(item.cost_price || 0) * (item.duration || 1);
                let itemDiscount = 0;
                let eventApplied = null;

                subtotal += itemPrice;

                // A. Apply Promo Event (Automatic)
                const tldRegex = /\.[a-z]{2,}(\.[a-z]{2})?$/;
                const match = name.toLowerCase().match(tldRegex);
                const itemTld = match ? match[0] : "." + name.split('.').slice(1).join('.');
                
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

                    // Anti-Boncos clamping
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
                    item_subtotal: itemPrice,
                    current_price: itemPrice - itemDiscount,
                    item_discount: itemDiscount,
                    effective_price: itemPrice - itemDiscount,
                    event_applied: eventApplied
                };
            });

            // B. Apply Coupon (Manual)
            let couponApplied = null;
            if (coupon) {
                if (!coupon.is_stackable && hasEventDiscount) {
                    // Skip if not stackable
                } else {
                    let couponTotalDiscount = 0;
                    const currentTotalAfterEvents = processedItems.reduce((acc, i) => acc + i.current_price, 0);
                    
                    if (currentTotalAfterEvents >= parseFloat(coupon.min_transaction || 0)) {
                        const couponActions = typeof coupon.eligible_actions === 'string' ? JSON.parse(coupon.eligible_actions) : coupon.eligible_actions;
                        const isActionMatchAll = !couponActions || couponActions.length === 0 || couponActions.includes('all');
                        
                        const couponTlds = typeof coupon.applicable_to === 'string' ? JSON.parse(coupon.applicable_to) : coupon.applicable_to;
                        const isTldMatchAll = !couponTlds || couponTlds.length === 0 || couponTlds.includes('all');

                        if (coupon.discount_type === 'percentage') {
                            processedItems.forEach(pItem => {
                                const pName = pItem.domain_name || pItem.name || '';
                                const tldRegex = /\.[a-z]{2,}(\.[a-z]{2})?$/;
                                const match = pName.toLowerCase().match(tldRegex);
                                const itemTld = match ? match[0] : "." + pName.split('.').slice(1).join('.');

                                const isEligibleAction = isActionMatchAll || (Array.isArray(couponActions) && couponActions.includes(pItem.action));
                                const isEligibleTld = isTldMatchAll || (Array.isArray(couponTlds) && couponTlds.includes(itemTld));

                                if (!isEligibleAction || !isEligibleTld) return;

                                let disc = pItem.current_price * (parseFloat(coupon.discount_value) / 100);
                                
                                const itemCost = parseFloat(pItem.cost_price || 0) * (pItem.duration || 1);
                                const availableMargin = pItem.current_price - itemCost;
                                
                                if (disc > availableMargin) disc = Math.max(0, availableMargin);
                                
                                pItem.current_price -= disc;
                                pItem.item_discount += disc;
                                pItem.effective_price = pItem.current_price;
                                couponTotalDiscount += disc;
                            });
                        } else {
                            let remainingFixed = parseFloat(coupon.discount_value);
                            processedItems.forEach(pItem => {
                                const pName = pItem.domain_name || pItem.name || '';
                                const tldRegex = /\.[a-z]{2,}(\.[a-z]{2})?$/;
                                const match = pName.toLowerCase().match(tldRegex);
                                const itemTld = match ? match[0] : "." + pName.split('.').slice(1).join('.');

                                const isEligibleAction = isActionMatchAll || (Array.isArray(couponActions) && couponActions.includes(pItem.action));
                                const isEligibleTld = isTldMatchAll || (Array.isArray(couponTlds) && couponTlds.includes(itemTld));

                                if (!isEligibleAction || !isEligibleTld) return;

                                const itemCost = parseFloat(pItem.cost_price || 0) * (pItem.duration || 1);
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

            const events = [...new Set(processedItems.filter(i => i.event_applied).map(i => i.event_applied.title))];
            const resultApplied = events.map(t => ({ title: t, type: 'event' }));
            if (couponApplied) resultApplied.push(couponApplied);

            return {
                subtotal,
                total_discount: totalDiscount,
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
     */
    static async reserveCoupon(userId, couponId, invoiceId, client) {
        const couponRes = await client.query(`
            SELECT id, quota, quota_used, locked_count 
            FROM vouchers 
            WHERE id = $1 
            FOR UPDATE
        `, [couponId]);

        const coupon = couponRes.rows[0];
        if (!coupon) throw new Error("Coupon not found");

        if (coupon.quota > 0) {
            const currentUsage = parseInt(coupon.quota_used || 0) + parseInt(coupon.locked_count || 0);
            if (currentUsage >= parseInt(coupon.quota)) {
                throw new Error("Coupon quota has been reached (Fully Reserved)");
            }
        }

        const expiresAt = new Date(Date.now() + 15 * 60000);
        await client.query(`
            INSERT INTO coupon_reservations (coupon_id, user_id, invoice_id, expires_at)
            VALUES ($1, $2, $3, $4)
        `, [couponId, userId, invoiceId, expiresAt]);

        await client.query(`
            UPDATE vouchers 
            SET locked_count = COALESCE(locked_count, 0) + 1, updated_at = NOW() 
            WHERE id = $1
        `, [couponId]);

        return { success: true, expires_at: expiresAt };
    }
}

module.exports = PromoEngine;
