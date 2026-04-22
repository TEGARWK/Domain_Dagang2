/**
 * Recovery Script: Sync missed topup credits for a specific user.
 * This script identifies PAID topup invoices that are missing from wallet_transactions
 * and credits the wallet accordingly.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const WalletService = require('../services/WalletService');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
});

// Provide db.pool to WalletService or ensure it uses the same config
// WalletService already requires ../config/db which should be the same.

async function sync() {
    const userId = 11; // Targeted user
    console.log(`🚀 Starting recovery sync for User ID: ${userId}`);

    try {
        // Find paid topup invoices for this user
        const res = await pool.query(`
            SELECT i.id, i.total, i.status
            FROM invoices i
            WHERE i.user_id = $1 
              AND i.status = 'paid'
              AND (i.type = 'TOPUP' OR i.id LIKE 'TOPUP-%')
        `, [userId]);

        const paidInvoices = res.rows;
        console.log(`🔍 Found ${paidInvoices.length} PAID topup invoices.`);

        for (const inv of paidInvoices) {
            // Check if already in wallet_transactions
            const txCheck = await pool.query(`
                SELECT id FROM wallet_transactions 
                WHERE reference_id = $1 
                  AND type = 'CREDIT'
            `, [inv.id]);

            if (txCheck.rows.length === 0) {
                console.log(`💸 Syncing missed credit for Invoice: ${inv.id} (Amount: ${inv.total})`);
                await WalletService.credit(
                    userId, 
                    parseFloat(inv.total), 
                    'TOPUP', 
                    inv.id, 
                    'Recovery Sync: Top Up via Tripay'
                );
                console.log(`✅ Credited ${inv.total} for ${inv.id}`);
            } else {
                console.log(`⏭️ Invoice ${inv.id} already has a transaction record. Skipping.`);
            }
        }

        // Final balance check
        const wallet = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
        console.log(`\n✨ Sync Complete! New balance for User ${userId}: Rp${wallet.rows[0].balance}`);

    } catch (err) {
        console.error('❌ Sync Error:', err.message);
    } finally {
        await pool.end();
    }
}

sync();
