/**
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

        // 4. Handle localhost IPv6
        if (ip === '::1') {
            return '127.0.0.1';
        }

        // 5. Final fallback/validation: Ensure it looks like an IP
        // If it's not a string or looks empty, return localhost
        if (!ip || typeof ip !== 'string') {
            return '127.0.0.1';
        }

        return ip;
    } catch (e) {
        return '127.0.0.1';
    }
};

module.exports = { getIPv4 };
