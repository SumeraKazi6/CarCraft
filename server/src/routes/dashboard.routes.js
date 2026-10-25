const express = require('express');
const router = express.Router();

const { getDashboard } = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, getDashboard);

module.exports = router;
