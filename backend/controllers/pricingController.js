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
        console.log("Syncing prices from Daftarnama...");
        const apiResponse = await DaftarnamaService.getTLDPricings();
        
        if (!apiResponse || !apiResponse.data) {
            return res.status(500).json({ message: "Invalid response from Daftarnama API" });
        }

        // REMOVED FILTER: Now syncing ALL TLDs provided by the API (or Mock)
        const mappings = apiResponse.data;

        let updatedCount = 0;

        for (const item of mappings) {
            // Logic: Update cost_prices based on API response
            // Daftarnama API response structure (based on audit): register_price, renewal_price, transfer_price, restore_price
            const price1Year = item.pricings.find(p => p.duration === 1);
            
            if (!price1Year) {
                console.warn(`No 1-year pricing found for ${item.tld}`);
                continue;
            }

            const cReg = price1Year.register_price; 
            const cRen = price1Year.renewal_price;
            const cTra = price1Year.transfer_price;
            const cRes = price1Year.restore_price || 0; // Backup if not provided

            const updateQuery = `
                INSERT INTO pricing (
                    tld, 
                    cost_register, cost_renew, cost_transfer, cost_restore,
                    price_register, price_renew, price_transfer, price_restore
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (tld) 
                DO UPDATE SET 
                    cost_register = EXCLUDED.cost_register,
                    cost_renew = EXCLUDED.cost_renew,
                    cost_transfer = EXCLUDED.cost_transfer,
                    cost_restore = EXCLUDED.cost_restore,
                    updated_at = CURRENT_TIMESTAMP;
            `;

            // Default selling price = cost + 20% margin for NEW inserts
            const margin = 1.20;
            const pReg = cReg * margin;
            const pRen = cRen * margin;
            const pTra = cTra * margin;
            const pRes = cRes * margin;

            await new Promise((resolve, reject) => {
                db.query(updateQuery, [
                    item.tld, 
                    cReg, cRen, cTra, cRes,
                    pReg, pRen, pTra, pRes
                ], (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });
            updatedCount++;
        }

        // Audit Log for Sync
        await createLog({
            user_id: req.user.id,
            action: 'SYNC_PRICING',
            entity_type: 'pricing',
            new_value: { count: updatedCount },
            req
        });

        res.json({ 
            success: true, 
            message: `Successfully synced ${updatedCount} TLDs (v2 Granular)`, 
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

    // Audit Log
    await createLog({
        user_id: req.user.id,
        action: 'ADD_PRICING',
        entity_type: 'pricing',
        entity_id: result[0].id,
        new_value: req.body,
        req
    });

    res.json({ message: "TLD added successfully (v2)", id: result[0].id });
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
