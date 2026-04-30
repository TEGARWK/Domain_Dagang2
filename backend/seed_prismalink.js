const db = require('./config/db');

async function seedPrismalink() {
    try {
        const check = await db.pool.query("SELECT id FROM payment_gateways WHERE provider = 'prismalink'");
        if (check.rows.length === 0) {
            console.log('Seed: Adding Prismalink provider to database...');
            await db.pool.query(`
                INSERT INTO payment_gateways (provider, is_active, mode, bank_name, account_number, account_holder, instructions)
                VALUES ('prismalink', false, 'sandbox', 'Prismalink Gateway', '-', 'System', 'Automatic Payment')
            `);
            console.log('Seed: Prismalink added successfully!');
        } else {
            console.log('Seed: Prismalink provider already exists.');
        }
    } catch (err) {
        console.error('Seed Error:', err.message);
    } finally {
        process.exit();
    }
}

seedPrismalink();
