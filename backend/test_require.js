const fs = require('fs');
const path = require('path');

const files = [
    './config/db',
    './middleware/authMiddleware',
    './middleware/adminMiddleware',
    './middleware/errorMiddleware',
    './services/NotificationService',
    './services/WalletService',
    './services/VoucherService',
    './services/PromoEngine',
    './services/PromoEventService',
    './services/PrismaLinkService',
    './services/InvoiceService',
    './routes/auth',
    './routes/domains',
    './routes/checkout',
    './routes/billing',
    './routes/prismaLink',
    './routes/daftarnama',
    './routes/transferRoutes',
    './routes/users',
    './routes/pricing',
    './routes/content',
    './routes/paymentGateways',
    './routes/admin',
    './routes/vouchers',
    './routes/promoEvents',
    './routes/coupons',
    './routes/notifications',
    './routes/wallet',
    './routes/upload',
    './routes/faqRoutes',
    './routes/supportTicketRoutes'
];

files.forEach(file => {
    try {
        console.log(`Checking ${file}...`);
        require(file);
        console.log(`✅ ${file} OK`);
    } catch (err) {
        console.error(`❌ FAILED TO REQUIRE ${file}:`, err.message);
        if (err.stack) console.error(err.stack);
    }
});
