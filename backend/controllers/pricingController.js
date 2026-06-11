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
exports.syncPricing = async (req, res) => {
    try {
        console.log("Syncing prices from Daftarnama (Standard Price Filter)...");
        const apiResponse = await DaftarnamaService.getTLDPricings();
        
        if (!apiResponse || !apiResponse.data) {
            return res.status(500).json({ message: "Invalid response from Daftarnama API" });
        }

        const rawData = apiResponse.data;
        const bestPricings = {};

        // 1. Group by TLD and select the CHEAPEST 1-year registration price
        // This filters out "Premium" domain entries from the registrar response
        for (const item of rawData) {
            let basePricing = item.pricings?.find(p => p.duration == 1);
            if (!basePricing && item.pricings && item.pricings.length > 0) {
                basePricing = item.pricings[0]; // Fallback to first available duration if 1 year is not found
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
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                ON CONFLICT (tld) 
                DO UPDATE SET 
                    cost_register = EXCLUDED.cost_register,
                    cost_renew = EXCLUDED.cost_renew,
                    cost_transfer = EXCLUDED.cost_transfer,
                    cost_restore = EXCLUDED.cost_restore,
                    price_register = EXCLUDED.price_register,
                    price_renew = EXCLUDED.price_renew,
                    price_transfer = EXCLUDED.price_transfer,
                    price_restore = EXCLUDED.price_restore,
                    updated_at = CURRENT_TIMESTAMP;
            `;

            // Margin 1.0 (Harga jual = Harga modal)
            const margin = 1.0;
            const pReg = Math.round(item.cReg * margin);
            const pRen = Math.round(item.cRen * margin);
            const pTra = Math.round(item.cTra * margin);
            const pRes = Math.round(item.cRes * margin);

            await db.pool.query(updateQuery, [
                item.tld, 
                item.cReg, item.cRen, item.cTra, item.cRes,
                pReg, pRen, pTra, pRes
            ]);
            updatedCount++;
        }

        // Audit Log
        await createLog({
            user_id: req.user.id,
            action: 'SYNC_PRICING',
            entity_type: 'pricing',
            new_value: { count: updatedCount, method: "cheapest_filter" },
            req
        });

        res.json({ 
            success: true, 
            message: `Successfully synced ${updatedCount} TLDs with standard pricing.`, 
            data: mappings 
        });

    } catch (error) {
        console.error("Sync error:", error);
        res.status(500).json({ message: "Failed to sync prices", error: error.message });
    }
};


// 3. Update Selling Price (Admin Only)
exports.updatePricing = (req, res) => {
  const { id } = req.params; // Fix: Extract ID
  const { 
    price_register, price_renew, price_transfer, price_restore,
    cost_register, cost_renew, cost_transfer, cost_restore,
    discount_price_reg
  } = req.body;

  const query = `
    UPDATE pricing 
    SET 
        price_register = $1, price_renew = $2, price_transfer = $3, price_restore = $4,
        cost_register = $5, cost_renew = $6, cost_transfer = $7, cost_restore = $8,
        discount_price_reg = $9,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $10
  `;

  db.query(query, [
    price_register, price_renew, price_transfer, price_restore,
    cost_register, cost_renew, cost_transfer, cost_restore,
    discount_price_reg || 0,
    id
  ], async (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // In pg, it's result.rowCount, not result.affectedRows
    if (result.rowCount === 0) return res.status(404).json({ error: "Pricing ID not found" });

    // Audit Log
    await createLog({
        user_id: req.user.id,
        action: 'UPDATE_PRICING',
        entity_type: 'pricing',
        entity_id: id,
        new_value: req.body,
        req
    });

    res.json({ message: "Pricing updated successfully (v2)" });
  });
};

// 4. Add New TLD (Manual)
exports.addPricing = (req, res) => {
  const { 
    tld, 
    price_register, price_renew, price_transfer, price_restore,
    cost_register, cost_renew, cost_transfer, cost_restore,
    discount_price_reg
  } = req.body;

  const query = `
    INSERT INTO pricing (
        tld, 
        price_register, price_renew, price_transfer, price_restore,
        cost_register, cost_renew, cost_transfer, cost_restore,
        discount_price_reg
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
  `;
  db.query(query, [
    tld, 
    price_register, price_renew, price_transfer, price_restore,
    cost_register, cost_renew, cost_transfer, cost_restore,
    discount_price_reg || 0
  ], async (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const newId = result.rows ? result.rows[0]?.id : (result[0]?.id || null);

    // Audit Log
    await createLog({
        user_id: req.user.id,
        action: 'ADD_PRICING',
        entity_type: 'pricing',
        entity_id: newId,
        new_value: req.body,
        req
    });

    res.json({ message: "TLD added successfully (v2)", id: newId });
  });
};

// 5. Delete TLD
exports.deletePricing = (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM pricing WHERE id = $1";
  db.query(query, [id], async (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    // Audit Log
    await createLog({
        user_id: req.user.id,
        action: 'DELETE_PRICING',
        entity_type: 'pricing',
        entity_id: id,
        req
    });

    res.json({ message: "TLD deleted successfully" });
  });
};
