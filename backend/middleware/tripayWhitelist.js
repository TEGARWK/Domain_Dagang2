/**
 * Middleware to whitelist Tripay callback IPs
 * IP addresses are loaded from environment variables for flexibility
 */

const tripayWhitelist = (req, res, next) => {
    const isEnabled = process.env.TRIPAY_WHITELIST_ENABLED === 'true';

    if (!isEnabled) {
        return next();
    }

    // Load whitelisted IPs from environment variable
    // Format: comma-separated IP addresses
    // Example: TRIPAY_WHITELIST_IPS=95.111.200.230,2a04:3543:1000:2310:ac92:4cff:fe87:63f9
    const whitelistString = process.env.TRIPAY_WHITELIST_IPS || '';
    const whitelist = whitelistString
        .split(',')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);

    // If no IPs configured, allow all (fail open) but log warning
    if (whitelist.length === 0) {
        console.warn('[TRIPAY CALLBACK] ⚠️ No IP whitelist configured! Allowing all IPs. Set TRIPAY_WHITELIST_IPS in .env');
        return next();
    }

    let clientIp = req.ip || req.socket.remoteAddress;

    // Normalize IPv6-mapped-IPv4 (e.g. ::ffff:95.111.200.230 -> 95.111.200.230)
    if (clientIp && clientIp.includes('::ffff:')) {
        clientIp = clientIp.split('::ffff:')[1];
    }

    // Check if IP is whitelisted
    if (!whitelist.includes(clientIp)) {
        console.warn(`[TRIPAY CALLBACK] 🚫 Blocked request from non-whitelisted IP: ${clientIp}`);
        return res.status(403).json({ success: false, message: "Forbidden - IP not whitelisted" });
    }

    next();
};

module.exports = tripayWhitelist;
