# CarCraft JWT migration helper
# Run this script from the Car_craft project root in PowerShell.
# It creates backups before replacing any files.

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$serverFolder = Join-Path $root "server"
$frontendApi = Join-Path $root "src\api.js"

if (!(Test-Path $serverFolder) -or !(Test-Path $frontendApi)) {
    Write-Host "ERROR: Open PowerShell in your Car_craft project root first." -ForegroundColor Red
    Write-Host "Expected to find .\server and .\src\api.js"
    exit 1
}

$backupFolder = Join-Path $root ("backup-before-jwt-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backupFolder | Out-Null

$filesToBackup = @(
    "server\src\middleware\auth.middleware.js",
    "server\src\controllers\auth.controller.js",
    "server\src\routes\auth.routes.js",
    "src\api.js"
)

foreach ($relativePath in $filesToBackup) {
    $sourcePath = Join-Path $root $relativePath
    if (Test-Path $sourcePath) {
        $destinationPath = Join-Path $backupFolder $relativePath
        New-Item -ItemType Directory -Force -Path (Split-Path $destinationPath) | Out-Null
        Copy-Item $sourcePath $destinationPath
    }
}

# Ensure the JWT package is installed.
Push-Location $serverFolder
try {
    & npm.cmd install jsonwebtoken
    if ($LASTEXITCODE -ne 0) { throw "npm install jsonwebtoken failed." }
} finally {
    Pop-Location
}

$middleware = @'
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
'@

$controller = @'
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

        if (typeof email !== 'string' || typeof password !== 'string' ||
            !email.trim() || !password) {
            return res.status(400).json({ message: 'Please enter your email and password.' });
        }

        const [customers] = await pool.execute(
            `SELECT customer_id, full_name, email, password_hash, role
             FROM customers
             WHERE email = ?`,
            [email.trim().toLowerCase()]
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
'@

$routes = @'
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
'@

$api = @'
const API_BASE_URL = 'http://localhost:5000/api';
const TOKEN_KEY = 'carcraft.token';

// Return common headers, including the JWT when one is saved.
function getAuthHeaders(extraHeaders = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = { ...extraHeaders };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

// Register a new customer.
export async function registerCustomer(customer) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
    }

    return data;
}

// Log in and store the JWT for later authenticated requests.
export async function loginCustomer(credentials) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password.');
    }

    if (!data.token) {
        throw new Error('The server did not return an authentication token.');
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
}

// Get the currently authenticated customer.
export async function getCurrentCustomer() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
        }
        throw new Error(data.message || 'You are not logged in.');
    }

    return data.customer;
}

// Log out and remove the local JWT.
export async function logoutCustomer() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Logout failed.');
        }

        return data;
    } finally {
        localStorage.removeItem(TOKEN_KEY);
    }
}

// Fetch vehicles from the backend.
export async function getVehicles() {
    const response = await fetch(`${API_BASE_URL}/cars`);

    if (!response.ok) {
        throw new Error('Unable to load vehicles.');
    }

    const data = await response.json();

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.vehicles)) return data.vehicles;

    throw new Error('The server returned an unexpected vehicle format.');
}

// Format vehicle prices.
export const money = (amount) =>
    '$' + Number(amount).toLocaleString('en-US');
'@

$writes = @{
    "server\src\middleware\auth.middleware.js" = $middleware
    "server\src\controllers\auth.controller.js" = $controller
    "server\src\routes\auth.routes.js" = $routes
    "src\api.js" = $api
}

foreach ($relativePath in $writes.Keys) {
    $targetPath = Join-Path $root $relativePath
    New-Item -ItemType Directory -Force -Path (Split-Path $targetPath) | Out-Null
    Set-Content -Path $targetPath -Value $writes[$relativePath] -Encoding UTF8
    Write-Host "Updated: $relativePath" -ForegroundColor Green
}

# Check that JWT_SECRET exists without printing its value.
$envPath = Join-Path $serverFolder ".env"
if (Test-Path $envPath) {
    $envText = Get-Content $envPath -Raw
    if ($envText -notmatch '(?m)^JWT_SECRET=.+') {
        Write-Host "WARNING: Add JWT_SECRET=... to server\.env before starting the server." -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING: server\.env was not found." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "JWT files updated. Backups saved to: $backupFolder" -ForegroundColor Cyan
Write-Host "Next: restart the backend and test login. The old session setup in server.js can remain temporarily."
