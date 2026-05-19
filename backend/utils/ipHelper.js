/**
 * Utility to extract a clean IPv4 address from a request object.
 * Handles proxy headers and IPv6-mapped IPv4 addresses.
 * Includes a fallback to a public Indonesian IP for local testing with PrismaLink.
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
            console.log(`[IP_HELPER] Local/Loopback detected. Using fallback: \${fallbackIP}`);
            return fallbackIP;
        }

        // 5. Final fallback/validation: Ensure it looks like an IP
        if (!ip || typeof ip !== 'string' || ip.length < 7) {
            return '103.11.132.1';
        }

        console.log(`[IP_HELPER] Detected Client IP: \${ip}`);
        return ip;
    } catch (e) {
        console.error("[IP_HELPER] Error:", e.message);
        return '103.11.132.1';
    }
};

module.exports = { getIPv4 };
