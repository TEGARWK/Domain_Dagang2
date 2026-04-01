/**
 * Utility to get a clean IPv4 address from the request.
 * Handles reverse proxy headers (X-Forwarded-For) and strips IPv6 prefixes.
 * Includes a fallback to a public Indonesian IP for local testing with PrismaLink.
 */
const getIPv4 = (req) => {
    // 1. Ambil dari X-Forwarded-For (kalau dibalik proxy) atau remoteAddress
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

    if (ip && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }

    // 2. Bersihkan prefix IPv6 (::ffff:)
    if (ip && ip.includes('::ffff:')) {
        ip = ip.replace('::ffff:', '');
    }

    // 3. Handle localhost/loopback (PrismaLink Staging reject 127.0.0.1 / ::1)
    // Jika terdeteksi local, kita kasih fallback IP Publik Indonesia (Staging Friendly)
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
        console.log(`[DEBUG] Local IP detected (\${ip}), falling back to Public IP for PrismaLink compatibility.`);
        return '103.11.132.1'; 
    }

    return ip;
};

module.exports = { getIPv4 };
