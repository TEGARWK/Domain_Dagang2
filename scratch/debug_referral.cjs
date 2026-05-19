const db = require('../backend/config/db');

async function debugReferral() {
    try {
        console.log('--- DEBUG REFERRAL ---');
        
        // 1. Check User Flipcat
        const flipcatRes = await db.pool.query("SELECT id, name, email, referred_by_id FROM users WHERE email = 'flipcat506@gmail.com'");
        if (flipcatRes.rows.length === 0) {
            console.log('User flipcat506@gmail.com not found.');
            return;
        }
        const flipcat = flipcatRes.rows[0];
        console.log('Flipcat User:', flipcat);

        // 2. Check Referrer Tegar
        const tegarRes = await db.pool.query("SELECT id, name, email, referral_code FROM users WHERE email = 'tegarwirakesuma675@gmail.com'");
        if (tegarRes.rows.length === 0) {
            console.log('User tegarwirakesuma675@gmail.com not found.');
        } else {
            console.log('Tegar User:', tegarRes.rows[0]);
        }

        // 3. Check Invoices for Flipcat
        const invoiceRes = await db.pool.query("SELECT id, status, total FROM invoices WHERE user_id = $1", [flipcat.id]);
        console.log('Invoices for Flipcat:', invoiceRes.rows);

        // 4. Check Referral Rewards
        const rewardRes = await db.pool.query("SELECT * FROM referral_rewards WHERE referee_id = $1", [flipcat.id]);
        console.log('Rewards for Flipcat Registration/Purchase:', rewardRes.rows);

    } catch (err) {
        console.error('Error debugging:', err);
    } finally {
        process.exit();
    }
}

debugReferral();
