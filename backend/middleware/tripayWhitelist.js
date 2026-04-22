/**
 * Middleware to whitelist Tripay callback IPs
 */
const tripayWhitelist = (req, res, next) => {
    const isEnabled = process.env.TRIPAY_WHITELIST_ENABLED === 'true';
    
    if (!isEnabled) {
        return next();
    }

    const whitelist = [
        '95.111.200.230', // IPv4
        '2a04:3543:1000:2310:ac92:4cff:fe87:63f9' // IPv6
    ];

    let clientIp = req.ip || req.socket.remoteAddress;

    // Normalize IPv6-mapped-IPv4 (e.g. ::ffff:95.111.200.230 -> 95.111.200.230)
    if (clientIp.includes('::ffff:')) {
        clientIp = clientIp.split('::ffff:')[1];
    }

    if (!whitelist.includes(clientIp)) {
        console.warn(`[TRIPAY CALLBACK] Blocked request from IP: ${clientIp}`);
        return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
};

module.exports = tripayWhitelist;
