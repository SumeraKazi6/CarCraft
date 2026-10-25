
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();

const pool = require('./src/config/database');
const { ensureDatabaseTables } = require('./src/config/initDatabase');
const authRoutes = require('./src/routes/auth.routes');
const carsRoutes = require('./src/routes/cars.routes');
const bookingsRoutes = require('./src/routes/bookings.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5176',
    'http://localhost:5177',
    'http://127.0.0.1:5177',
    'http://localhost:5178',
    'http://127.0.0.1:5178',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    process.env.CLIENT_URL
].filter(Boolean);

const uniqueOrigins = [...new Set(allowedOrigins)];

// Allow the frontend to communicate with the backend.
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || uniqueOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
        },
        credentials: true
    })
);

// Parse incoming JSON requests.
app.use(express.json());

// Parse URL-encoded form data.
app.use(express.urlencoded({ extended: true }));

// Configure the MySQL session store.
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000
});

// Configure sessions.
app.use(
    session({
        name: 'carcraft.sid',
        secret: process.env.SESSION_SECRET || 'carcraft-development-secret',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

// Basic server health check.
app.get('/', (req, res) => {
    res.json({
        message: 'CarCraft backend is running!',
        status: 'OK'
    });
});

// Database health check.
app.get('/api/health/db', async (req, res) => {
    try {
        await pool.query('SELECT 1');

        res.json({
            message: 'Database connection successful!',
            databaseConnected: true
        });
    } catch (error) {
        console.error('Database health check failed:', error.message);

        res.status(500).json({
            message: 'Database connection failed.',
            databaseConnected: false
        });
    }
});


// Authentication routes.
app.use('/api/auth', authRoutes);

// Vehicle routes.
app.use('/api/cars', carsRoutes);
app.use('/api/vehicles', carsRoutes);

// Dashboard summary and activity routes.
app.use('/api/dashboard', dashboardRoutes);

// Booking and vehicle purchase routes.
app.use('/api/bookings', bookingsRoutes);

// Handle unknown API routes.
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found.'
    });
});

// Handle unexpected errors.
app.use((error, req, res, next) => {
    console.error('Server error:', error.message);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        message: 'An unexpected server error occurred.'
    });
});

// Ensure the required database tables exist before serving requests.
(async () => {
    try {
        await ensureDatabaseTables();
        app.listen(PORT, () => {
            console.log(`CarCraft backend running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Database bootstrap failed:', error.message);
        process.exit(1);
    }
})();
