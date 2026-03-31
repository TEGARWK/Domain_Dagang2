const express = require('express');
const { seedDummyData } = require('../controllers/devController');

const router = express.Router();

// Route khusus untuk dev/testing: menyuntikkan data invoice
router.get('/seed-dummy', seedDummyData);

module.exports = router;
