const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Create a signed token containing only the customer's database ID.
function createToken(customer) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing from the environment.');
    }

    return jwt.sign(
        { customerId: customer.customer_id },
        process.env.JWT_SECRET,
        { expiresIn: '24h', issuer: 'carcraft-api', audience: 'carcraft-client' }
    );
}

// Register a new customer. New accounts always receive the customer role.
async function register(req, res) {
    try {
        const { fullName, email, password, phone } = req.body || {};

        if (typeof fullName !== 'string' || typeof email !== 'string' ||
            typeof password !== 'string' || !fullName.trim() || !email.trim() || !password) {
            return res.status(400).json({
                message: 'Full name, email, and password are required.'
            });
        }

        const cleanName = fullName.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({
                message: 'Password must contain at least 8 characters and cannot exceed 72 bytes.'
            });
        }

        const [existingCustomers] = await pool.execute(
            'SELECT customer_id FROM customers WHERE email = ?',
            [cleanEmail]
        );

        if (existingCustomers.length > 0) {
            return res.status(409).json({
                message: 'An account with this email already exists. Please log in.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const [result] = await pool.execute(
            `INSERT INTO customers (full_name, email, password_hash, phone)
             VALUES (?, ?, ?, ?)`,
            [cleanName, cleanEmail, passwordHash, phone || null]
        );

        return res.status(201).json({
            message: 'Your CarCraft account was created successfully! You can now log in.',
            customer: {
                id: result.insertId,
                fullName: cleanName,
                email: cleanEmail,
                role: 'customer'
            }
        });
    } catch (error) {
        console.error('Registration error:', error.message);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'An account with this email already exists. Please log in.'
            });
        }

        return res.status(500).json({
            message: 'Unable to create your account. Please try again.'
        });
    }
}

// Verify credentials and return a JWT.
async function login(req, res) {
    try {
        const { email, password } = req.body || {};
        const safeEmail = typeof email === 'string' ? email.trim().toLowerCase() : 'missing';

        if (typeof email !== 'string' || typeof password !== 'string' ||
            !email.trim() || !password) {
            return res.status(400).json({ message: 'Please enter your email and password.' });
        }

        const [customers] = await pool.execute(
            `SELECT customer_id, full_name, email, password_hash, role
             FROM customers
             WHERE email = ?`,
            [safeEmail]
        );

        if (customers.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const customer = customers[0];
        const passwordMatches = await bcrypt.compare(password, customer.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = createToken(customer);

        return res.status(200).json({
            message: 'Login successful!',
            token,
            customer: {
                id: customer.customer_id,
                fullName: customer.full_name,
                email: customer.email,
                role: customer.role
            }
        });
    } catch (error) {
        console.error('Login error for email:', typeof req?.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'missing');
        console.error('Login error:', error.message);
        return res.status(500).json({ message: 'Unable to log in right now. Please try again.' });
    }
}

// JWTs are stateless. The frontend logs out by deleting its stored token.
function logout(req, res) {
    return res.status(200).json({ message: 'You have logged out successfully.' });
}

// authenticateToken must run before this controller.
function getCurrentCustomer(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Please log in to continue.' });
    }

    return res.status(200).json({
        customer: {
            id: req.user.id,
            fullName: req.user.fullName,
            email: req.user.email,
            role: req.user.role
        }
    });
}

module.exports = { register, login, logout, getCurrentCustomer };
