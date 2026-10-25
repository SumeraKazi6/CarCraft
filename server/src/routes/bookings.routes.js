
const express = require('express');
const router = express.Router();

const { getPurchaseHistory, purchaseVehicle } = require('../controllers/bookings.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, getPurchaseHistory);
router.get('/me', authenticateToken, getPurchaseHistory);

// Only logged-in customers can purchase vehicles.
router.post('/', authenticateToken, purchaseVehicle);

module.exports = router;
