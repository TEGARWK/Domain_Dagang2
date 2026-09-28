const DaftarnamaService = require("../services/DaftarnamaService");
const db = require("../config/db");
const { createLog } = require("./auditController");

// 1. Get All Prices (Public)
exports.getAllPricing = (req, res) => {
  const query = "SELECT * FROM pricing ORDER BY tld ASC";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// 2. Sync Prices from Daftarnama (Admin Only)
// Uses /customer-tld-pricings which returns retail prices (harga modal from registrar)
exports.syncPricing = async (req, res) => {
    try {
        console.log("🔄 Syncing prices from Daftarnama (customer-tld-pricings)...");

        // Get pricings from Daftarnama API
        const apiResponse = await DaftarnamaService.getTLDPricings();

        if (!apiResponse || !apiResponse.data) {
            // Fallback to standard endpoint if customer endpoint fails
            console.log("⚠️ customer-tld-pricings failed, trying standard endpoint...");
            return await this.syncPricingStandard(req, res);
        }

        const rawData = apiResponse.data;
        let syncedCount = 0;
        let skippedCount = 0;

        for (const item of rawData) {
            // Parse TLD
            const tld = item.tld.startsWith('.') ? item.tld : `.${item.tld}`;

            // Get pricing data from API
            const pricings = item.pricings || [];
            const yearlyPricing = pricings.find(p => p.duration == 1) || pricings[0];

            if (!yearlyPricing) {
                console.log(`⚠️ No pricing data for ${tld}, skipping...`);
                skippedCount++;
                continue;
            }

            // These are the COST prices (harga modal dari Daftarnama)
            const costReg = parseFloat(yearlyPricing.register_price) || 0;
            const costRen = parseFloat(yearlyPricing.renewal_price) || 0;
            const costTra = parseFloat(yearlyPricing.transfer_price) || 0;
            const costRes = parseFloat(yearlyPricing.restore_price) || 0;

            if (costReg === 0 && costRen === 0) {
                console.log(`⚠️ ${tld} has zero prices, skipping...`);
                skippedCount++;
                continue;
            }

            // Check if TLD exists and has custom margin
            const existing = await db.pool.query("SELECT id, margin FROM pricing WHERE tld = $1", [tld]);
            let margin = 1.20; // Default 20% markup
            let currentPrices = {};

            if (existing.rows.length > 0) {
                margin = parseFloat(existing.rows[0].margin) || 1.20;
            }

            // Calculate SELLING prices based on margin
            const priceReg = Math.round(costReg * margin);
            const priceRen = Math.round(costRen * margin);
            const priceTra = Math.round(costTra * margin);
            const priceRes = Math.round(costRes * margin);

            // Upsert pricing
            const updateQuery = `
                INSERT INTO pricing (
                    tld,
                    cost_register, cost_renew, cost_transfer, cost_restore,
                    price_register, price_renew, price_transfer, price_restore,
                    margin,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                ON CONFLICT (tld)
                DO UPDATE SET
                    cost_register = EXCLUDED.cost_register,
                    cost_renew = EXCLUDED.cost_renew,
                    cost_transfer = EXCLUDED.cost_transfer,
                    cost_restore = EXCLUDED.cost_restore,
                    -- Only update selling prices if margin changed, otherwise keep admin-set prices
                    price_register = CASE WHEN pricing.margin != EXCLUDED.margin THEN EXCLUDED.price_register ELSE pricing.price_register END,
                    price_renew = CASE WHEN pricing.margin != EXCLUDED.margin THEN EXCLUDED.price_renew ELSE pricing.price_renew END,
                    price_transfer = CASE WHEN pricing.margin != EXCLUDED.margin THEN EXCLUDED.price_transfer ELSE pricing.price_transfer END,
                    price_restore = CASE WHEN pricing.margin != EXCLUDED.margin THEN EXCLUDED.price_restore ELSE pricing.price_restore END,
                    margin = EXCLUDED.margin,
                    updated_at = CURRENT_TIMESTAMP;
            `;

            await db.pool.query(updateQuery, [
                tld,
                costReg, costRen, costTra, costRes,
                priceReg, priceRen, priceTra, priceRes,
                margin
            ]);

            syncedCount++;
            console.log(`✅ ${tld}: Cost=${formatRupiah(costReg)} | Margin=${(margin * 100 - 100).toFixed(0)}% | Sell=${formatRupiah(priceReg)}`);
        }

        // Audit Log
        await createLog({
            user_id: req.user?.id,
            action: 'SYNC_PRICING',
            entity_type: 'pricing',
            new_value: { synced: syncedCount, skipped: skippedCount, method: "customer-tld-pricings" },
            req
        });

        res.json({
            success: true,
            message: `Synced ${syncedCount} TLDs. ${skippedCount} skipped (no data).`,
            synced: syncedCount,
            skipped: skippedCount
        });

    } catch (error) {
        console.error("❌ Sync error:", error);
        res.status(500).json({ message: "Failed to sync prices", error: error.message });
    }
};

// Fallback: Sync using standard endpoint (not recommended for production)
exports.syncPricingStandard = async (req, res) => {
    try {
        console.log("🔄 Syncing with standard endpoint (fallback)...");
        const apiResponse = await DaftarnamaService.getTLDPricings();

        if (!apiResponse || !apiResponse.data) {
            return res.status(500).json({ message: "Failed to connect to Daftarnama API" });
        }

        const rawData = apiResponse.data;
        const bestPricings = {};

        // 1. Group by TLD and select the CHEAPEST 1-year registration price
        for (const item of rawData) {
            let basePricing = item.pricings?.find(p => p.duration == 1);
            if (!basePricing && item.pricings && item.pricings.length > 0) {
                basePricing = item.pricings[0];
            }
            if (!basePricing) continue;

            const tld = item.tld.startsWith('.') ? item.tld : `.${item.tld}`;
            const currentRegPrice = parseFloat(basePricing.register_price) || 0;

            if (!bestPricings[tld] || currentRegPrice < bestPricings[tld].cReg) {
                bestPricings[tld] = {
                    tld,
                    cReg: currentRegPrice,
                    cRen: parseFloat(basePricing.renewal_price) || 0,
                    cTra: parseFloat(basePricing.transfer_price) || 0,
                    cRes: parseFloat(basePricing.restore_price || 0) || 0
                };
            }
        }

        const mappings = Object.values(bestPricings);
        let updatedCount = 0;

        for (const item of mappings) {
            const updateQuery = `
                INSERT INTO pricing (
                    tld,
                    cost_register, cost_renew, cost_transfer, cost_restore,
                    price_register, price_renew, price_transfer, price_restore,
                    margin,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                ON CONFLICT (tld)
                DO UPDATE SET
                    cost_register = EXCLUDED.cost_register,
                    cost_renew = EXCLUDED.cost_renew,
                    cost_transfer = EXCLUDED.cost_transfer,
                    cost_restore = EXCLUDED.cost_restore,
                    price_register = CASE WHEN pricing.margin != EXCLUDED.margin THEN EXCLUDED.price_register ELSE pricing.price_register END,
                    price_renew = CASE WHEN pricing.margin != EXCLUDED.margin THEN EXCLUDED.price_renew ELSE pricing.price_renew END,
                    price_transfer = CASE WHEN pricing.margin != EXCLUDED.margin THEN EXCLUDED.price_transfer ELSE pricing.price_transfer END,
                    price_restore = CASE WHEN pricing.margin != EXCLUDED.margin THEN EXCLUDED.price_restore ELSE pricing.price_restore END,
                    margin = EXCLUDED.margin,
                    updated_at = CURRENT_TIMESTAMP;
            `;

            // Default 20% margin
            const margin = 1.20;
            const pReg = Math.round(item.cReg * margin);
            const pRen = Math.round(item.cRen * margin);
            const pTra = Math.round(item.cTra * margin);
            const pRes = Math.round(item.cRes * margin);

            await db.pool.query(updateQuery, [
                item.tld,
                item.cReg, item.cRen, item.cTra, item.cRes,
                pReg, pRen, pTra, pRes,
                margin
            ]);
            updatedCount++;
        }

        res.json({
            success: true,
            message: `Synced ${updatedCount} TLDs (standard method).`,
            synced: updatedCount
        });

    } catch (error) {
        console.error("❌ Standard sync error:", error);
        res.status(500).json({ message: "Failed to sync prices", error: error.message });
    }
};

// 3. Update Margin Only (Admin Only)
exports.updateMargin = async (req, res) => {
    const { id } = req.params;
    const { margin } = req.body;

    try {
        // Get current pricing to calculate new selling prices
        const current = await db.pool.query("SELECT * FROM pricing WHERE id = $1", [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: "Pricing not found" });
        }

        const p = current.rows[0];
        const newMargin = parseFloat(margin) || 1.0;

        // Recalculate selling prices based on new margin
        const priceReg = Math.round(p.cost_register * newMargin);
        const priceRen = Math.round(p.cost_renew * newMargin);
        const priceTra = Math.round(p.cost_transfer * newMargin);
        const priceRes = Math.round(p.cost_restore * newMargin);

        await db.pool.query(`
            UPDATE pricing SET
                price_register = $1,
                price_renew = $2,
                price_transfer = $3,
                price_restore = $4,
                margin = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
        `, [priceReg, priceRen, priceTra, priceRes, newMargin, id]);

        // Audit Log
        await createLog({
            user_id: req.user?.id,
            action: 'UPDATE_PRICING_MARGIN',
            entity_type: 'pricing',
            entity_id: id,
            new_value: { margin: newMargin, oldMargin: p.margin },
            req
        });

        res.json({
            success: true,
            message: `Margin updated to ${((newMargin - 1) * 100).toFixed(0)}%`,
            data: {
                margin: newMargin,
                price_register: priceReg,
                price_renew: priceRen,
                price_transfer: priceTra,
                price_restore: priceRes
            }
        });
    } catch (error) {
        console.error("Update margin error:", error);
        res.status(500).json({ error: error.message });
    }
};

// 4. Update Selling Price Only (Admin Only)
// IMPORTANT: This only updates selling prices, NOT cost prices
exports.updatePricing = async (req, res) => {
    const { id } = req.params;
    const {
        price_register, price_renew, price_transfer, price_restore
    } = req.body;

    try {
        // First get current data
        const current = await db.pool.query("SELECT * FROM pricing WHERE id = $1", [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: "Pricing not found" });
        }

        const p = current.rows[0];

        // Calculate new margin based on selling price vs cost
        let newMargin = p.margin || 1.20;
        if (price_register && p.cost_register > 0) {
            newMargin = parseFloat(price_register) / parseFloat(p.cost_register);
        }

        const updateQuery = `
            UPDATE pricing SET
                price_register = $1,
                price_renew = $2,
                price_transfer = $3,
                price_restore = $4,
                margin = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
        `;

        await db.pool.query(updateQuery, [
            price_register || p.price_register,
            price_renew || p.price_renew,
            price_transfer || p.price_transfer,
            price_restore || p.price_restore,
            newMargin,
            id
        ]);

        // Audit Log
        await createLog({
            user_id: req.user?.id,
            action: 'UPDATE_PRICING',
            entity_type: 'pricing',
            entity_id: id,
            new_value: req.body,
            req
        });

        res.json({
            success: true,
            message: "Selling prices updated successfully",
            margin: newMargin
        });

    } catch (error) {
        console.error("Update pricing error:", error);
        res.status(500).json({ error: error.message });
    }
};

// 5. Add New TLD (Manual)
exports.addPricing = async (req, res) => {
    const {
        tld,
        price_register, price_renew, price_transfer, price_restore,
        cost_register, cost_renew, cost_transfer, cost_restore,
        margin
    } = req.body;

    try {
        // Calculate margin if not provided
        let finalMargin = parseFloat(margin) || 1.20;
        if (!finalMargin && cost_register && price_register) {
            finalMargin = parseFloat(price_register) / parseFloat(cost_register);
        }

        const insertQuery = `
            INSERT INTO pricing (
                tld,
                price_register, price_renew, price_transfer, price_restore,
                cost_register, cost_renew, cost_transfer, cost_restore,
                margin
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        `;

        const result = await db.pool.query(insertQuery, [
            tld,
            price_register || cost_register || 0,
            price_renew || cost_renew || 0,
            price_transfer || cost_transfer || 0,
            price_restore || cost_restore || 0,
            cost_register || 0,
            cost_renew || 0,
            cost_transfer || 0,
            cost_restore || 0,
            finalMargin
        ]);

        const newId = result.rows[0]?.id;

        // Audit Log
        await createLog({
            user_id: req.user?.id,
            action: 'ADD_PRICING',
            entity_type: 'pricing',
            entity_id: newId,
            new_value: req.body,
            req
        });

        res.json({
            success: true,
            message: "TLD added successfully",
            id: newId,
            margin: finalMargin
        });

    } catch (error) {
        console.error("Add pricing error:", error);
        res.status(500).json({ error: error.message });
    }
};

// 6. Delete TLD
exports.deletePricing = async (req, res) => {
    const { id } = req.params;

    try {
        await db.pool.query("DELETE FROM pricing WHERE id = $1", [id]);

        // Audit Log
        await createLog({
            user_id: req.user?.id,
            action: 'DELETE_PRICING',
            entity_type: 'pricing',
            entity_id: id,
            req
        });

        res.json({ success: true, message: "TLD deleted successfully" });
    } catch (error) {
        console.error("Delete pricing error:", error);
        res.status(500).json({ error: error.message });
    }
};

// Helper function
function formatRupiah(num) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(num || 0);
}
