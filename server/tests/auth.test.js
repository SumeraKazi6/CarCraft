const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(() => 'mock-jwt-token'),
    verify: jest.fn(),
}));

jest.mock('../src/config/database', () => ({
    execute: jest.fn(),
    getConnection: jest.fn(),
}));

const pool = require('../src/config/database');
const { register, login } = require('../src/controllers/auth.controller');
const { getDashboard } = require('../src/controllers/dashboard.controller');
const { getPurchaseHistory } = require('../src/controllers/bookings.controller');

function createMockResponse() {
    const res = {
        statusCode: 200,
        status: jest.fn(function (code) {
            this.statusCode = code;
            return this;
        }),
        json: jest.fn(function (payload) {
            this.body = payload;
            return this;
        }),
    };

    return res;
}

describe('Customer authentication API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
    });

    test('register should succeed for a new customer', async () => {
        pool.execute
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{ insertId: 42 }]);

        bcrypt.hash.mockResolvedValue('hashed-password');

        const req = {
            body: {
                fullName: 'Ada Lovelace',
                email: 'ada@example.com',
                password: 'password123',
            },
        };

        const res = createMockResponse();

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('created successfully'),
                customer: expect.objectContaining({
                    id: 42,
                    fullName: 'Ada Lovelace',
                    email: 'ada@example.com',
                    role: 'customer',
                }),
            })
        );
    });

    test('register should reject a duplicate email', async () => {
        pool.execute.mockResolvedValueOnce([[{ customer_id: 5 }]]);

        const req = {
            body: {
                fullName: 'Ada Lovelace',
                email: 'ada@example.com',
                password: 'password123',
            },
        };

        const res = createMockResponse();

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('already exists'),
            })
        );
    });

    test('register should reject invalid data', async () => {
        const req = {
            body: {
                fullName: '',
                email: 'not-an-email',
                password: 'short',
            },
        };

        const res = createMockResponse();

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.any(String),
            })
        );
    });

    test('login should succeed with valid credentials', async () => {
        pool.execute.mockResolvedValueOnce([
            [{
                customer_id: 8,
                full_name: 'Ada Lovelace',
                email: 'ada@example.com',
                password_hash: 'hashed-password',
                role: 'customer',
            }],
        ]);

        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue('signed-jwt');

        const req = {
            body: {
                email: 'ada@example.com',
                password: 'password123',
            },
        };

        const res = createMockResponse();

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(jwt.sign).toHaveBeenCalledWith(
            { customerId: 8 },
            'test-secret',
            expect.objectContaining({ expiresIn: '24h', issuer: 'carcraft-api' })
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                token: 'signed-jwt',
                customer: expect.objectContaining({
                    id: 8,
                    fullName: 'Ada Lovelace',
                    email: 'ada@example.com',
                    role: 'customer',
                }),
            })
        );
    });

    test('login should reject invalid credentials', async () => {
        pool.execute.mockResolvedValueOnce([[]]);

        const req = {
            body: {
                email: 'unknown@example.com',
                password: 'badpassword',
            },
        };

        const res = createMockResponse();

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Invalid email or password.',
        });
    });

    test('login should reject missing email or password', async () => {
        const req = {
            body: {
                email: '',
                password: '',
            },
        };

        const res = createMockResponse();

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Please enter your email and password.',
        });
    });

    test('login should return the standard customer payload shape', async () => {
        pool.execute.mockResolvedValueOnce([
            [{
                customer_id: 99,
                full_name: 'Guest Driver',
                email: 'guest@example.com',
                password_hash: 'hashed-password',
                role: 'customer',
            }],
        ]);

        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue('signed-jwt');

        const req = {
            body: {
                email: 'guest@example.com',
                password: 'password123',
            },
        };

        const res = createMockResponse();

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                token: 'signed-jwt',
                customer: expect.objectContaining({
                    id: 99,
                    email: 'guest@example.com',
                    role: 'customer',
                }),
            })
        );
    });

    test('customer dashboard should return real purchase totals and recent purchases', async () => {
        const req = {
            user: { id: 99, role: 'customer' }
        };
        const res = createMockResponse();

        pool.execute
            .mockResolvedValueOnce([[{
                id: 12,
                make: 'Toyota',
                model: 'Camry',
                category: 'Sedan',
                price: 28500,
                stock: 3,
                year: 2025,
                fuel: 'Hybrid',
                transmission: 'Automatic',
                mileage: 0,
                color: 'Silver',
                image_url: null,
                created_at: '2026-10-25'
            }]])
            .mockResolvedValueOnce([[{ name: 'Toyota', count: 1 }]])
            .mockResolvedValueOnce([[{ month: '2026-10', total: 28500 }]])
            .mockResolvedValueOnce([[{
                type: 'booking',
                title: 'Toyota Camry',
                detail: 'confirmed',
                created_at: '2026-10-25T12:00:00.000Z'
            }]])
            .mockResolvedValueOnce([[{
                type: 'customer',
                title: 'QA Driver',
                detail: 'Registered Oct 25',
                created_at: '2026-10-25T12:00:00.000Z'
            }]])
            .mockResolvedValueOnce([[{ purchase_count: 2, total_spend: 57000 }]])
            .mockResolvedValueOnce([[{
                id: 1,
                quantity: 1,
                total_price: 28500,
                status: 'confirmed',
                created_at: '2026-10-25T12:00:00.000Z',
                make: 'Toyota',
                model: 'Camry',
                year: 2025,
                stock: 2,
                image_url: null
            }, {
                id: 2,
                quantity: 1,
                total_price: 28500,
                status: 'confirmed',
                created_at: '2026-10-25T13:00:00.000Z',
                make: 'Toyota',
                model: 'Camry',
                year: 2025,
                stock: 1,
                image_url: null
            }]]);

        await getDashboard(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                customer: expect.objectContaining({
                    purchaseCount: 2,
                    totalSpend: 57000,
                    recentPurchases: expect.arrayContaining([
                        expect.objectContaining({
                            make: 'Toyota',
                            model: 'Camry',
                            status: 'confirmed',
                        })
                    ])
                })
            })
        );
    });

    test('customer purchase history should return only the authenticated customer records', async () => {
        const req = { user: { id: 99, role: 'customer' } };
        const res = createMockResponse();

        pool.execute.mockResolvedValueOnce([[
            {
                id: 1,
                customer_id: 99,
                vehicle_id: 12,
                quantity: 1,
                total_price: 28500,
                status: 'confirmed',
                created_at: '2026-10-25T12:00:00.000Z',
                make: 'Toyota',
                model: 'Camry',
                year: 2025,
                image_url: '/images/cars/toyota-camry.svg'
            }
        ]]);

        await getPurchaseHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                purchases: expect.arrayContaining([
                    expect.objectContaining({
                        customerId: 99,
                        make: 'Toyota',
                        model: 'Camry',
                        totalPrice: 28500,
                        imageUrl: '/images/cars/toyota-camry.svg'
                    })
                ])
            })
        );
    });

    test('customer purchase history should reject unauthenticated requests', async () => {
        const req = {};
        const res = createMockResponse();

        await getPurchaseHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Please log in to continue.' });
    });

    test('register should return 500 when the database fails', async () => {
        pool.execute.mockRejectedValue(new Error('database down'));

        const req = {
            body: {
                fullName: 'Ada Lovelace',
                email: 'ada@example.com',
                password: 'password123',
            },
        };

        const res = createMockResponse();

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Unable to create your account. Please try again.',
        });
    });
});
