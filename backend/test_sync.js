require('dotenv').config();
const SyncService = require('./services/SyncService');

(async () => {
    console.log("Testing SyncService...");
    const res = await SyncService.syncManualList(["google.com", "belajar.id"]);
    console.log("Result:", JSON.stringify(res, null, 2));
    process.exit(0);
})();
