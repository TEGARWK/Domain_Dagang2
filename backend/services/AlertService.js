class AlertService {
    /**
     * Send Alert to Admin
     * @param {string} level - INFO, WARNING, CRITICAL
     * @param {string} message - Alert message
     * @param {object} context - Additional data (invoiceId, domainName, etc)
     */
    async sendAlert(level, message, context = {}) {
        const timestamp = new Date().toLocaleString('id-ID');
        const alertMsg = `[${level}] [${timestamp}] ${message} | Context: ${JSON.stringify(context)}`;
        
        // 1. Always log to console (and thus PM2/server logs)
        console.error(`📢 [ADMIN ALERT] ${alertMsg}`);

        // 2. Mock: Integration with External Service (e.g. Telegram / Slack)
        // If process.env.TELEGRAM_TOKEN is set, we could send it here.
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            // this.sendToTelegram(alertMsg);
        }

        // 3. Optional: Store in DB alerts table
        // await db.query("INSERT INTO system_alerts ...");
    }
}

module.exports = new AlertService();
