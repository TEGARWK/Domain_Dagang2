const express = require("express");
const router = express.Router();
const regionController = require("../controllers/regionController");

// /api/regions/provinces
router.get("/provinces", regionController.getProvinces);

// /api/regions/children/:parentId
router.get("/children/:parentId", regionController.getChildren);

module.exports = router;
