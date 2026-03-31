const axios = require('axios');
const crypto = require('crypto');
const PrismaLinkService = require('./PrismaLinkService');
const { CONFIG, getFormattedDate } = PrismaLinkService;

class PrismaDisbursementService {

    /**
     * Send Disbursement to PrismaLink
     * @param {object} data { bank_code, account_number, account_name, amount, reference_id }
     * @returns {Promise<object>} { success, reference_id, gateway_response, raw }
     */
    async sendDisbursement(data) {
        const fs = require('fs');
        const path = require('path');
        const logFile = path.join(__dirname, '../debug_disbursement.log');



        try {
            const timestamp = getFormattedDate();
            
            // Construct Payload
            const payload = {
                merchant_id: CONFIG.merchant_id,
                merchant_key_id: CONFIG.key_id,
                merchant_ref_no: data.reference_id,
                transmission_date_time: timestamp,
                bank_code: data.bank_code,
                account_number: data.account_number,
                account_name: data.account_name,
                transaction_amount: parseInt(data.amount),
                description: "Withdrawal System",
                signature: "" 
            };
            
            const endpoint = `${CONFIG.base_url}/payment/integration/transaction/api/submit-disbursement`;
            
            // Signature Generation
            const rawBody = JSON.stringify(payload);
            const signature = crypto.createHmac('sha256', CONFIG.secret_key)
                .update(rawBody)
                .digest('hex');

            const reqLog = {
                timestamp: new Date().toISOString(),
                type: 'REQUEST',
                endpoint: endpoint,
                payload: payload,
                signature: signature
            };
            fs.appendFileSync(logFile, JSON.stringify(reqLog, null, 2) + "\n---\n");



            const response = await axios.post(endpoint, rawBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'mac': signature
                },
                timeout: 30000 
            });

            const resLog = {
                timestamp: new Date().toISOString(),
                type: 'RESPONSE',
                status: response.status,
                data: response.data
            };
            fs.appendFileSync(logFile, JSON.stringify(resLog, null, 2) + "\n---\n");



            const respData = response.data;
            const isSuccess = respData.response_code === '00' || respData.response_code === 'PL000';
            
            return {
                success: isSuccess,
                reference_id: respData.plink_ref_no || data.reference_id,
                gateway_response: respData,
                raw: respData
            };

        } catch (error) {
            const errLog = {
                timestamp: new Date().toISOString(),
                type: 'ERROR',
                message: error.message,
                response: error.response?.data
            };
            fs.appendFileSync(logFile, JSON.stringify(errLog, null, 2) + "\n---\n");

            console.error("[Disbursement] API Failed:", error.response?.data || error.message);
            
            if (error.response?.data) {
                throw new Error(error.response.data.response_message || "Gateway Error");
            }
            throw error;
        }
    }
}

module.exports = new PrismaDisbursementService();
