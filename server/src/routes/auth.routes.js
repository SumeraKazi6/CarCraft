const express = require('express');
const router = express.Router();

const {
    register,
    login,
    logout,
    getCurrentCustomer
} = require('../controllers/auth.controller');

const { authenticateToken } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getCurrentCustomer);
router.post('/logout', logout);

module.exports = router;
