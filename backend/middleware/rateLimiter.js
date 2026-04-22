const redisClient = require('../config/redisClient');

/**
 * RATE LIMITER MIDDLEWARE (Redis Backed)
 * Membatasi jumlah request berdasarkan userID dan key tertentu.
 */

const rateLimiter = (options) => {
    const { 
        windowSeconds = 10, 
        maxRequests = 3, 
        keyPrefix = 'ratelimit' 
    } = options;

    return async (req, res, next) => {
        if (!redisClient.isAvailable()) {
            return next(); // Fallback: Izinkan request jika Redis down
        }

        const userId = req.user?.id;
        if (!userId) return next();

        const key = `${keyPrefix}:${userId}`;

        try {
            // Gunakan multi/transaction jika tersedia, namun di sini kita gunakan pendekatan INCR + EXPIRE
            // 1. Ambil nilai saat ini
            const current = await redisClient.getValue(key);
            const count = current ? parseInt(current) : 0;

            if (count >= maxRequests) {
                return res.status(429).json({
                    success: false,
                    message: "Terlalu banyak permintaan, tunggu beberapa saat."
                });
            }

            // 2. Increment
            if (!current) {
                await redisClient.setWithExpiry(key, "1", windowSeconds);
            } else {
                // Manual increment (karena redis helper kita terbatas)
                await redisClient.setWithExpiry(key, (count + 1).toString(), windowSeconds);
                // Note: Idealnya pake INCR, tapi karena helper cuma punya DECR, 
                // kita improvisasi dengan setWithExpiry.
            }

            next();
        } catch (err) {
            console.error('[RateLimiter] Error:', err.message);
            next(); // Jangan block user jika middleware error
        }
    };
};

module.exports = rateLimiter;
