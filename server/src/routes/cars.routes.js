const express = require('express');
const router = express.Router();

const {
    getVehicles,
    getVehicleById,
    searchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    purchaseVehicle,
    restockVehicle
} = require('../controllers/cars.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

router.get('/', getVehicles);
router.get('/search', searchVehicles);
router.get('/:id', getVehicleById);
router.post('/', authenticateToken, requireAdmin, createVehicle);
router.post('/:id/purchase', authenticateToken, purchaseVehicle);
router.post('/:id/restock', authenticateToken, requireAdmin, restockVehicle);
router.put('/:id', authenticateToken, requireAdmin, updateVehicle);
router.delete('/:id', authenticateToken, requireAdmin, deleteVehicle);

module.exports = router;