const db = require('../config/db');

exports.seedDummyData = async (req, res) => {
    try {
        console.log("Seeding dummy data starting from Controller...");
        
        // Cek apakah user id 1 (Admin/Customer yang sering dipakai) ada
        const [users] = await db.execute("SELECT id, name, email FROM users LIMIT 1");
        if (users.length === 0) {
            return res.status(400).json({ error: "No users found" });
        }
        
        const userId = users[0].id;
        const userName = users[0].name;

        // Seed 15 Dummy Invoices
        for (let i = 1; i <= 15; i++) {
            const isPaid = i % 2 !== 0; 
            const subtotal = Math.floor(Math.random() * 500000) + 150000;
            const status = isPaid ? 'paid' : 'pending';
            const payMethod = isPaid ? (i % 3 === 0 ? 'QRIS' : 'BCA Virtual Account') : null;
            const refNo = isPaid ? `PLINK-DUMMY-${Math.floor(Math.random() * 999999)}` : null;
            
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            const dateString = date.toISOString().slice(0, 19).replace('T', ' ');

            const [invResult] = await db.execute(`
                INSERT INTO invoices (user_id, total, status, payment_method, plink_ref_no, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, subtotal, status, payMethod, refNo, dateString, dateString]);
            
            const invoiceId = invResult.insertId;

            await db.execute(`
                INSERT INTO invoice_items (invoice_id, order_id, type, domain_name, price) 
                VALUES (?, ?, ?, ?, ?)
            `, [invoiceId, null, 'Register', `dummy-domain-${i}.id`, subtotal]);

            if (isPaid) {
                 await db.execute(`
                    INSERT INTO invoice_logs (invoice_id, action, description, created_by)
                    VALUES (?, ?, ?, ?)
                `, [invoiceId, 'Invoice Dibuat', 'Sistem berhasil membuat tagihan pendaftaran domain', 'System']);

                 await db.execute(`
                    INSERT INTO invoice_logs (invoice_id, action, description, created_by)
                    VALUES (?, ?, ?, ?)
                `, [invoiceId, 'Pembayaran Diterima (QRIS)', 'Gateway merespons sukses', 'PrismaLink Webhook']);
            }
        }
        
        // Seed 5 active dummy domains
        for (let k = 1; k <= 5; k++) {
             const date = new Date();
             const dateString = date.toISOString().slice(0, 19).replace('T', ' ');
             await db.execute(`
                INSERT INTO domains (user_id, domain_name, status, registration_date, expiration_date, epp_code, is_locked)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, `dummy-active-${k}.com`, 'active', dateString, dateString, 'XYZ123', false]);
        }
        
        return res.json({ message: "Dummy data seeded successfully!" });
    } catch (e) {
        console.error("Error seeding:", e);
        return res.status(500).json({ error: e.message });
    }
};
