/**
<<<<<<< HEAD
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
=======
 * Utility to extract a clean IPv4 address from a request object.
 * Handles proxy headers and IPv6-mapped IPv4 addresses.
 */
const getIPv4 = (req) => {
    try {
        // 1. Check X-Forwarded-For (common in proxies/load balancers)
        let ip = req.headers['x-forwarded-for'] || 
                 req.connection?.remoteAddress || 
                 req.socket?.remoteAddress || 
                 req.ip || 
                 '127.0.0.1';

        // 2. Handle comma-separated list of IPs (take the first/original client IP)
        if (typeof ip === 'string' && ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }

        // 3. Clean IPv6 prefix (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
        if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
            ip = ip.substring(7);
        }

        // 4. Handle localhost/private ranges for Staging/Dev
        // PrismaLink often rejects 127.0.0.1 or ::1
        if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
            const fallbackIP = '103.11.132.1'; // Indonesian Public IP for testing
            console.log(`[IP_HELPER] Local/Loopback detected. Using fallback: ${fallbackIP}`);
            return fallbackIP;
        }

        // 5. Final fallback/validation: Ensure it looks like an IP
        if (!ip || typeof ip !== 'string' || ip.length < 7) {
            return '103.11.132.1';
        }

        console.log(`[IP_HELPER] Detected Client IP: ${ip}`);
        return ip;
    } catch (e) {
        return '127.0.0.1';
    }
>>>>>>> UpdateBug
};

module.exports = { getIPv4 };
