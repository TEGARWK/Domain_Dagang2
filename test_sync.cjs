const DaftarnamaService = require('./backend/services/DaftarnamaService');
require('dotenv').config({ path: './backend/.env' });

async function testSync() {
    console.log("--- Testing Daftarnama Sync ---");
    try {
        const domains = await DaftarnamaService.listDomains();
        console.log("Response from Daftarnama:", JSON.stringify(domains, null, 2));
    } catch (error) {
        console.error("Error fetching domains:", error.message);
    }
}

testSync();
