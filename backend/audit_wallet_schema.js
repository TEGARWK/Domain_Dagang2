const db = require('./config/db');

async function auditWalletSchema() {
    try {
        const fs = require('fs');
        let output = "";
        
        output += "--- WALLETS TABLE ---\n";
        const resWallets = await db.pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'wallets'
            ORDER BY ordinal_position
        `);
        output += JSON.stringify(resWallets.rows, null, 2) + "\n\n";

        output += "--- WALLET_TRANSACTIONS TABLE ---\n";
        const resTx = await db.pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'wallet_transactions'
            ORDER BY ordinal_position
        `);
        output += JSON.stringify(resTx.rows, null, 2) + "\n";
        
        fs.writeFileSync('wallet_schema_results.txt', output);
        console.log("Results written to wallet_schema_results.txt");

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

auditWalletSchema();
