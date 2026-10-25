
// Import Supertest to send HTTP requests to the test application.
const request = require('supertest');

// Import Express to create a test application.
const express = require('express');

// Mock the database so tests do not need a real MySQL connection.
jest.mock('../src/config/database', () => ({
    execute: jest.fn(),
    getConnection: jest.fn()
}));

// Import the mocked database.
const pool = require('../src/config/database');

// Import the actual vehicle controller.
const {
    getVehicles,
    searchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    purchaseVehicle,
    restockVehicle
} = require('../src/controllers/cars.controller');

// Create an Express application for testing.
const app = express();

// Allow the application to read JSON requests.
app.use(express.json());

// Kata-required routes.
app.get('/api/vehicles', getVehicles);
app.get('/api/vehicles/search', searchVehicles);
app.post('/api/vehicles', createVehicle);
app.put('/api/vehicles/:id', updateVehicle);
app.delete('/api/vehicles/:id', deleteVehicle);
app.post('/api/vehicles/:id/purchase', (req, res, next) => {
    req.user = { id: 42, role: 'customer' };
    next();
}, purchaseVehicle);
app.post('/api/vehicles/:id/restock', (req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
}, restockVehicle);

// Group all vehicle API tests together.
describe('Vehicle Inventory API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('GET /api/vehicles should return a list of vehicles', async () => {
        const sampleVehicles = [
            {
                id: 1,
                make: 'Toyota',
                model: 'Camry',
                category: 'Sedan',
                price: 25000,
                stock: 3
            }
        ];

        pool.execute.mockResolvedValue([sampleVehicles]);

        const response = await request(app).get('/api/vehicles');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toEqual(sampleVehicles);
        expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    test('GET /api/vehicles/search should filter by make and price range', async () => {
        const sampleVehicles = [
            {
                id: 2,
                make: 'Honda',
                model: 'Civic',
                category: 'Sedan',
                price: 24000,
                stock: 4
            }
        ];

        pool.execute.mockResolvedValue([sampleVehicles]);

        const response = await request(app)
            .get('/api/vehicles/search')
            .query({ make: 'Honda', minPrice: 20000, maxPrice: 30000 });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toEqual(sampleVehicles);
    });

    test('GET /api/vehicles should deduplicate repeated make/model entries', async () => {
        const sampleVehicles = [
            {
                id: 11,
                make: 'Toyota',
                model: 'Camry',
                category: 'Sedan',
                price: 2800000,
                stock: 2,
                year: 2024,
                fuel: 'Petrol',
                trans: 'Automatic',
                km: 15000,
                color: 'Silver',
                imageUrl: 'https://example.com/camry-1.jpg'
            },
            {
                id: 12,
                make: 'Toyota',
                model: 'Camry',
                category: 'Sedan',
                price: 2800000,
                stock: 2,
                year: 2024,
                fuel: 'Petrol',
                trans: 'Automatic',
                km: 15000,
                color: 'Silver',
                imageUrl: 'https://example.com/camry-2.jpg'
            }
        ];

        pool.execute.mockResolvedValue([sampleVehicles]);

        const response = await request(app).get('/api/vehicles');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({ make: 'Toyota', model: 'Camry' });
    });

    test('POST /api/vehicles should create a new vehicle for admins', async () => {
        pool.execute.mockResolvedValue([{ insertId: 99 }]);

        const response = await request(app)
            .post('/api/vehicles')
            .send({
                make: 'BMW',
                model: 'X5',
                category: 'SUV',
                price: 900000,
                stock: 2,
                year: 2025,
                fuel: 'Petrol',
                transmission: 'Automatic',
                mileage: 1000,
                color: 'Black',
                image_url: 'https://example.com/x5.jpg'
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Vehicle added successfully.');
        expect(response.body).toHaveProperty('id', 99);
    });

    test('POST /api/vehicles should derive a make from the model when the admin leaves the make field blank', async () => {
        pool.execute.mockResolvedValue([{ insertId: 88 }]);

        const response = await request(app)
            .post('/api/vehicles')
            .send({
                model: 'A8',
                category: 'Luxury',
                price: 750000,
                stock: 1,
                year: 2025,
                fuel: 'Petrol',
                transmission: 'Automatic',
                mileage: 200,
                color: 'Silver',
                image_url: 'https://example.com/a8.jpg'
            });

        expect(response.status).toBe(201);
        expect(pool.execute).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO vehicles'),
            expect.arrayContaining(['A8', 'A8', 'Luxury', expect.any(Number), expect.any(Number), expect.any(Number), 'Petrol', 'Automatic', expect.any(Number), 'Silver', 'https://example.com/a8.jpg'])
        );
    });

    test('PUT /api/vehicles/:id should allow updating a vehicle image URL', async () => {
        pool.execute.mockResolvedValue([{ affectedRows: 1 }]);

        const response = await request(app)
            .put('/api/vehicles/7')
            .send({
                stock: 4,
                image_url: 'https://example.com/updated.jpg'
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Vehicle updated successfully.');
    });

    test('POST /api/vehicles/:id/purchase should decrease stock', async () => {
        const connection = {
            beginTransaction: jest.fn().mockResolvedValue(),
            execute: jest.fn()
                .mockResolvedValueOnce([[{ id: 3, make: 'Toyota', model: 'Fortuner', price: 500000, stock: 2 }]])
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([{ insertId: 88 }]),
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
            release: jest.fn()
        };

        pool.getConnection.mockResolvedValue(connection);

        const response = await request(app)
            .post('/api/vehicles/3/purchase')
            .send({ quantity: 1 });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Vehicle purchased successfully.');
        expect(connection.execute).toHaveBeenCalled();
    });

    test('POST /api/vehicles/:id/restock should increase stock for admins', async () => {
        pool.execute.mockResolvedValue([{ affectedRows: 1 }]);

        const response = await request(app)
            .post('/api/vehicles/3/restock')
            .send({ quantity: 4 });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Vehicle restocked successfully.');
    });

    test('GET /api/vehicles should return 500 when the database fails', async () => {
        pool.execute.mockRejectedValue(new Error('Database connection failed'));

        const response = await request(app).get('/api/vehicles');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Unable to load vehicles.' });
        expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    test('GET /api/vehicles?all=true should return all vehicles without deduplication', async () => {
        const sampleVehicles = [
            { id: 11, make: 'Toyota', model: 'Camry', category: 'Sedan', color: 'Silver' },
            { id: 12, make: 'Toyota', model: 'Camry', category: 'Sedan', color: 'Silver' }
        ];

        pool.execute.mockResolvedValue([sampleVehicles]);

        const response = await request(app).get('/api/vehicles').query({ all: 'true' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0].id).toBe(11);
        expect(response.body[1].id).toBe(12);
    });

    test('DELETE /api/vehicles/:id should delete vehicle when it exists and has no bookings', async () => {
        pool.execute
            .mockResolvedValueOnce([[{ id: 5 }]]) // SELECT id (vehicle exists)
            .mockResolvedValueOnce([[{ count: 0 }]]) // SELECT COUNT(*) FROM bookings (no bookings)
            .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE FROM vehicles

        const response = await request(app).delete('/api/vehicles/5');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Vehicle deleted successfully.',
            deletedVehicleId: 5
        });
        expect(pool.execute).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM vehicles WHERE id = ?'),
            [5]
        );
    });

    test('DELETE /api/vehicles/:id should return 400 for an invalid ID', async () => {
        const response = await request(app).delete('/api/vehicles/invalid-id');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid vehicle ID.');
    });

    test('DELETE /api/vehicles/:id should return 404 when vehicle is not found', async () => {
        pool.execute.mockResolvedValueOnce([[]]); // SELECT id returns empty

        const response = await request(app).delete('/api/vehicles/999');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Vehicle not found in the database.');
    });

    test('DELETE /api/vehicles/:id should return 409 when vehicle is referenced by bookings', async () => {
        pool.execute
            .mockResolvedValueOnce([[{ id: 4 }]]) // SELECT id (vehicle exists)
            .mockResolvedValueOnce([[{ count: 2 }]]); // SELECT COUNT(*) (2 bookings exist)

        const response = await request(app).delete('/api/vehicles/4');

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('This vehicle is referenced by existing bookings or purchases');
    });

    test('DELETE /api/vehicles/:id should handle foreign key constraint errors with 409', async () => {
        const fkError = new Error('Foreign key violation');
        fkError.code = 'ER_ROW_IS_REFERENCED_2';
        fkError.errno = 1451;

        pool.execute
            .mockResolvedValueOnce([[{ id: 7 }]])
            .mockResolvedValueOnce([[{ count: 0 }]])
            .mockRejectedValueOnce(fkError);

        const response = await request(app).delete('/api/vehicles/7');

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('This vehicle is referenced by existing bookings or purchases');
    });
});
