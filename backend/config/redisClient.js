const redis = require('redis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * REDIS CLIENT CONFIGURATION
 * Handles connection, logging, and automatic reconnection.
 */

let client;
const isEnabled = process.env.REDIS_URL ? true : false;

if (isEnabled) {
    client = redis.createClient({
        url: process.env.REDIS_URL
    });

    client.on('error', (err) => {
        console.warn('⚠️  [Redis] Connection Error:', err.message);
    });

    client.on('connect', () => {
        console.log('✅ [Redis] Connection established.');
    });

    client.on('reconnecting', () => {
        console.log('🔄 [Redis] Reconnecting...');
    });

    // Handle startup
    (async () => {
        try {
            await client.connect();
        } catch (err) {
            console.warn('❌ [Redis] Failed to connect on startup. Graceful fallback enabled.');
        }
    })();
} else {
    console.warn('⚠️  [Redis] REDIS_URL not found in .env. Redis features are disabled.');
}

/**
 * Wrapper for Redis operations with Graceful Fallback
 * Ensures the app doesn't crash if Redis is down.
 */

const redisClient = {
    /**
     * Set key with expiry
     */
    async setWithExpiry(key, value, seconds) {
        if (!client?.isOpen) return null;
        try {
            return await client.set(key, value, { EX: seconds });
        } catch (err) {
            console.error('[Redis] setWithExpiry Failed:', err.message);
            return null;
        }
    },

    /**
     * Get value
     */
    async getValue(key) {
        if (!client?.isOpen) return null;
        try {
            return await client.get(key);
        } catch (err) {
            console.error('[Redis] getValue Failed:', err.message);
            return null;
        }
    },

    /**
     * Delete key
     */
    async deleteKey(key) {
        if (!client?.isOpen) return 0;
        try {
            return await client.del(key);
        } catch (err) {
            console.error('[Redis] deleteKey Failed:', err.message);
            return 0;
        }
    },

    /**
     * Atomic Decrement (Used for Voucher Quotas)
     */
    async atomicDecrement(key) {
        if (!client?.isOpen) {
            console.warn('[Redis] atomicDecrement: Redis unavailable, quota check skipped.');
            return null;
        }
        try {
            return await client.decr(key);
        } catch (err) {
            console.error('[Redis] atomicDecrement Failed:', err.message);
            return null;
        }
    },

    /**
     * Check if Redis is actually usable
     */
    isAvailable() {
        return client?.isOpen || false;
    }
};

module.exports = redisClient;
