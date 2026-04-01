require('dotenv').config();
const { query } = require('./config/db');

async function clean() {
    console.log("Memulai pembersihan data..");
    
    const candidateTables = [
        'invoices',
        'invoice_items',
        'domain_event_logs',
        'wallet_mutations',
        'wallet_transactions',
        'transfer_requests',
        'withdrawal_requests',
        'support_ticket_messages',
        'support_tickets',
        'dns_records',
        'domains'
    ];

    try {
        const rows = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        const existingTables = rows.map(r => r.table_name);
        const tablesToTruncate = candidateTables.filter(t => existingTables.includes(t));

        if (tablesToTruncate.length > 0) {
            const sql = `TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE;`;
            console.log(`Menjalankan: ${sql}`);
            await query(sql);
            console.log("Semua data transaksi/testing berhasil dihapus.");
        } else {
            console.log("Tidak ada tabel yang cocok untuk dihapus.");
        }
    } catch (error) {
        console.error("Gagal membersihkan data:", error.message);
    }
    
    process.exit(0);
}

clean();
