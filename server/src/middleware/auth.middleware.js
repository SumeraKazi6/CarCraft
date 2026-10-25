const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Verify the JWT and load the user's current role from MySQL.
async function authenticateToken(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Please log in to continue.' });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
        return res.status(401).json({ message: 'Please log in to continue.' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is missing from the environment.');
        return res.status(500).json({ message: 'Authentication is not configured correctly.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [customers] = await pool.execute(
            `SELECT customer_id, full_name, email, role
             FROM customers
             WHERE customer_id = ?`,
            [decoded.customerId]
        );

        if (customers.length === 0) {
            return res.status(401).json({ message: 'Account not found. Please log in again.' });
        }

        const customer = customers[0];
        req.user = {
            id: customer.customer_id,
            fullName: customer.full_name,
            email: customer.email,
            role: customer.role
        };

        return next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ||
            error.name === 'NotBeforeError') {
            return res.status(401).json({
                message: 'Your login token is invalid or expired. Please log in again.'
            });
        }

        console.error('Authentication error:', error.message);
        return res.status(500).json({ message: 'Unable to verify your login.' });
    }
}

// Protect admin-only operations.
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Administrator access is required.' });
    }
    return next();
}

module.exports = { authenticateToken, requireAdmin };
