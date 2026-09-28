/**
 * Failed Activation Retry Queue
 * Handles failed domain activations by storing them for retry
 */

const db = require('../config/db');

class ActivationRetryService {

    /**
     * Add a failed activation to the retry queue
     */
    async enqueue(invoiceId, domainName, errorMessage, attemptNumber = 1) {
        const maxRetries = parseInt(process.env.ACTIVATION_MAX_RETRIES) || 5;

        // Check if already in queue
        const existing = await db.pool.query(
            "SELECT * FROM activation_retry_queue WHERE invoice_id = $1 AND domain_name = $2 AND status = 'pending'",
            [invoiceId, domainName]
        );

        if (existing.rows.length > 0) {
            // Update attempt count
            const row = existing.rows[0];
            if (row.attempt_count >= maxRetries) {
                // Mark as permanently failed
                await db.pool.query(
                    "UPDATE activation_retry_queue SET status = 'failed', last_error = $1, updated_at = NOW() WHERE id = $2",
                    [errorMessage, row.id]
                );
                return { success: false, message: 'Max retries reached' };
            }

            // Increment attempt
            const nextRetry = this.calculateNextRetry(row.attempt_count + 1);
            await db.pool.query(
                "UPDATE activation_retry_queue SET attempt_count = attempt_count + 1, last_error = $1, next_retry_at = $2, updated_at = NOW() WHERE id = $3",
                [errorMessage, nextRetry, row.id]
            );
            return { success: true, message: 'Retry scheduled', nextRetry };
        }

        // Insert new entry
        const nextRetry = this.calculateNextRetry(attemptNumber);
        await db.pool.query(`
            INSERT INTO activation_retry_queue (invoice_id, domain_name, attempt_count, last_error, next_retry_at, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
        `, [invoiceId, domainName, attemptNumber, errorMessage, nextRetry]);

        return { success: true, message: 'Queued for retry', nextRetry };
    }

    /**
     * Calculate next retry time with exponential backoff
     */
    calculateNextRetry(attemptNumber) {
        // Exponential backoff: 2, 4, 8, 16, 32 minutes
        const intervals = [2, 4, 8, 16, 32];
        const minutes = intervals[Math.min(attemptNumber - 1, intervals.length - 1)];
        return new Date(Date.now() + minutes * 60 * 1000);
    }

    /**
     * Get all pending retries that are due
     */
    async getPendingRetries() {
        const result = await db.pool.query(`
            SELECT * FROM activation_retry_queue
            WHERE status = 'pending' AND next_retry_at <= NOW()
            ORDER BY created_at ASC
            LIMIT 10
        `);
        return result.rows;
    }

    /**
     * Mark retry as successful
     */
    async markSuccess(queueId) {
        await db.pool.query(
            "UPDATE activation_retry_queue SET status = 'completed', updated_at = NOW() WHERE id = $1",
            [queueId]
        );
    }

    /**
     * Mark retry as permanently failed
     */
    async markFailed(queueId, errorMessage) {
        await db.pool.query(
            "UPDATE activation_retry_queue SET status = 'failed', last_error = $1, updated_at = NOW() WHERE id = $2",
            [errorMessage, queueId]
        );
    }

    /**
     * Process all pending retries
     */
    async processPendingRetries() {
        const pending = await this.getPendingRetries();

        if (pending.length === 0) {
            return { processed: 0 };
        }

        const OrderService = require('./OrderService');
        let successCount = 0;
        let failCount = 0;

        for (const item of pending) {
            try {
                const result = await OrderService.activateDomain(item.invoice_id);
                if (result.success) {
                    await this.markSuccess(item.id);
                    successCount++;
                } else {
                    // Re-queue with incremented attempt
                    await this.enqueue(item.invoice_id, item.domain_name, result.message, item.attempt_count + 1);
                    failCount++;
                }
            } catch (err) {
                await this.enqueue(item.invoice_id, item.domain_name, err.message, item.attempt_count + 1);
                failCount++;
            }
        }

        return { processed: pending.length, success: successCount, failed: failCount };
    }
}

module.exports = new ActivationRetryService();
