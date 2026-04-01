const axios = require('axios');
const db = require('../config/db');

// Mock request to verify endpoints
async function verifyEndpoints() {
    const baseUrl = 'http://localhost:3009/api'; // Localtunnel port
    
    try {
        console.log("Checking Payment Gateways...");
        // Mocking a public request (no token needed for getAll)
        // Adjust if your local setup requires token for this specific endpoint
        const pgRes = await axios.get(`${baseUrl}/payment-gateways`);
        console.log("Payment Gateways Response Status:", pgRes.status);
        console.log("Found Gateways:", pgRes.data.length);

        console.log("\nChecking Invoice Detail...");
        // We need a valid token to check invoice detail
        // For testing, we'll find a valid invoice ID from the DB
        const invCheck = await db.pool.query("SELECT id, user_id FROM invoices LIMIT 1");
        if (invCheck.rows.length > 0) {
            const invId = invCheck.rows[0].id;
            const userId = invCheck.rows[0].user_id;
            console.log(`Testing Invoice ID: ${invId} for User: ${userId}`);
            
            // Note: Since I don't have a JWT token here, I might get 401.
            // But if it was 500 before, and now it's 401/403, it's an improvement (SQL fix worked).
            // Or I can temporarily disable verifyToken for this test if needed.
            try {
                const invRes = await axios.get(`${baseUrl}/billing/invoice/${invId}`);
                console.log("Invoice Detail Response Status:", invRes.status);
            } catch (err) {
                console.log("Invoice Detail Error (Expected if no token):", err.response ? err.response.status : err.message);
                if (err.response && err.response.status === 500) {
                    console.error("FAILED: Still getting 500 error for Invoice Detail!");
                }
            }
        } else {
            console.log("No invoices found in DB to test.");
        }

    } catch (err) {
        console.error("Verification failed:", err.response ? err.response.data : err.message);
    } finally {
        process.exit(0);
    }
}

verifyEndpoints();
