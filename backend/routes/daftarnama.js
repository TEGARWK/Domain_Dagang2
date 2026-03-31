const express = require("express");
const router = express.Router();
const controller = require("../controllers/daftarnamaController");
const { verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/adminMiddleware");

router.get("/balance", verifyAdmin, controller.getBalance);
router.get("/pricings", controller.getPricings);

// DNS Management (Directly mapping to Daftarnama path)
router.get("/domains/:domain_name/dns-records", verifyToken, controller.getDnsRecords);
router.post("/domains/:domain_name/dns-records", verifyToken, controller.addDnsRecord);
router.delete("/domains/:domain_name/dns-records/:record_id", verifyToken, controller.deleteDnsRecord);

module.exports = router;
