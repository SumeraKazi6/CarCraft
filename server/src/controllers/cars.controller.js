
const pool = require('../config/database');

// Remove duplicate vehicle listings based on their descriptive details.
function deduplicateVehicles(vehicles = []) {
    const seen = new Map();

    for (const vehicle of vehicles) {
        const key = [
            String(vehicle.make || '').trim().toLowerCase(),
            String(vehicle.model || '').trim().toLowerCase(),
            String(vehicle.year || vehicle.model_year || '').trim().toLowerCase(),
            String(vehicle.category || vehicle.cat || '').trim().toLowerCase(),
            String(vehicle.color || '').trim().toLowerCase(),
        ].join('|');

        if (!key || seen.has(key)) {
            continue;
        }

        seen.set(key, vehicle);
    }

    return Array.from(seen.values());
}

// GET /api/vehicles/:id
async function getVehicleById(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: 'Invalid vehicle ID.'
            });
        }

        const [vehicles] = await pool.execute(
            `SELECT
                id,
                make,
                model,
                category AS cat,
                price,
                stock,
                year,
                fuel,
                transmission AS trans,
                mileage AS km,
                color,
                image_url AS imageUrl
             FROM vehicles
             WHERE id = ?`,
            [id]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                message: 'Vehicle not found.'
            });
        }

        return res.status(200).json(vehicles[0]);
    } catch (error) {
        console.error('Failed to fetch vehicle:', error);

        return res.status(500).json({
            message: 'Unable to load vehicle.'
        });
    }
}

// GET /api/vehicles
// Anyone can view, search, and filter vehicles.
async function getVehicles(req, res) {
    try {
        let sql = `
            SELECT
                id,
                make,
                model,
                category AS cat,
                price,
                stock,
                year,
                fuel,
                transmission AS trans,
                mileage AS km,
                color,
                image_url AS imageUrl
            FROM vehicles
            WHERE 1 = 1
        `;

        const values = [];

        if (req.query.search) {
            sql += ` AND (
                make LIKE ?
                OR model LIKE ?
                OR category LIKE ?
            )`;

            const search = `%${req.query.search}%`;
            values.push(search, search, search);
        }

        if (req.query.make) {
            sql += ' AND make = ?';
            values.push(req.query.make);
        }

        if (req.query.model) {
            sql += ' AND model = ?';
            values.push(req.query.model);
        }

        if (req.query.category) {
            sql += ' AND category = ?';
            values.push(req.query.category);
        }

        if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
            const minPrice = Number(req.query.minPrice);

            if (!Number.isFinite(minPrice)) {
                return res.status(400).json({
                    message: 'Invalid minimum price.'
                });
            }

            sql += ' AND price >= ?';
            values.push(minPrice);
        }

        if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
            const maxPrice = Number(req.query.maxPrice);

            if (!Number.isFinite(maxPrice)) {
                return res.status(400).json({
                    message: 'Invalid maximum price.'
                });
            }

            sql += ' AND price <= ?';
            values.push(maxPrice);
        }

        sql += ' ORDER BY created_at DESC';

        const [vehicles] = await pool.execute(sql, values);
        let vehiclesToReturn = vehicles;

        if (req.query.all !== 'true' && req.query.all !== '1') {
            vehiclesToReturn = deduplicateVehicles(vehicles);
        }

        return res.status(200).json(vehiclesToReturn);
    } catch (error) {
        console.error('Failed to fetch vehicles:', error);

        return res.status(500).json({
            message: 'Unable to load vehicles.'
        });
    }
}

// GET /api/vehicles/search
async function searchVehicles(req, res) {
    return getVehicles(req, res);
}

// Validate vehicle data.
function validateVehicle(data, isUpdate = false) {
    const requiredFields = [
        'model',
        'category',
        'price',
        'year'
    ];

    for (const field of requiredFields) {
        if (
            (!isUpdate || data[field] !== undefined) &&
            (
                data[field] === null ||
                data[field] === undefined ||
                String(data[field]).trim() === ''
            )
        ) {
            return `${field} is required.`;
        }
    }

    if (
        data.make !== undefined &&
        (typeof data.make !== 'string' || !data.make.trim())
    ) {
        return 'Make must be a non-empty string.';
    }

    if (
        data.model !== undefined &&
        (typeof data.model !== 'string' || !data.model.trim())
    ) {
        return 'Model must be a non-empty string.';
    }

    if (
        data.category !== undefined &&
        (typeof data.category !== 'string' || !data.category.trim())
    ) {
        return 'Category must be a non-empty string.';
    }

    if (data.price !== undefined) {
        if (
            !Number.isFinite(Number(data.price)) ||
            Number(data.price) <= 0
        ) {
            return 'Price must be a positive number.';
        }
    }

    if (data.stock !== undefined) {
        if (
            !Number.isInteger(Number(data.stock)) ||
            Number(data.stock) < 0
        ) {
            return 'Stock must be a non-negative whole number.';
        }
    }

    if (data.year !== undefined) {
        if (
            !Number.isInteger(Number(data.year)) ||
            Number(data.year) < 1886 ||
            Number(data.year) > new Date().getFullYear() + 1
        ) {
            return 'Please enter a valid vehicle year.';
        }
    }

    if (data.mileage !== undefined) {
        if (
            !Number.isInteger(Number(data.mileage)) ||
            Number(data.mileage) < 0
        ) {
            return 'Mileage must be a non-negative whole number.';
        }
    }

    return null;
}

// POST /api/vehicles
// Admin only: add a vehicle.
async function createVehicle(req, res) {
    try {
        const data = req.body;

        const validationError = validateVehicle(data);

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        const {
            make,
            model,
            category,
            price,
            stock = 0,
            year,
            fuel = null,
            transmission = null,
            mileage = 0,
            color = null,
            image_url = null
        } = data;

        const normalizedMake =
            (
                make !== undefined && make !== null
                    ? String(make).trim()
                    : ''
            ) ||
            (
                model
                    ? String(model).trim()
                    : 'CarCraft'
            );

        const [result] = await pool.execute(
            `INSERT INTO vehicles (
                make,
                model,
                category,
                price,
                stock,
                year,
                fuel,
                transmission,
                mileage,
                color,
                image_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                normalizedMake,
                String(model).trim(),
                String(category).trim(),
                Number(price),
                Number(stock),
                Number(year),
                fuel,
                transmission,
                Number(mileage),
                color,
                image_url
            ]
        );

        return res.status(201).json({
            message: 'Vehicle added successfully.',
            id: result.insertId
        });
    } catch (error) {
        console.error('Failed to create vehicle:', error);

        return res.status(500).json({
            message: 'Unable to add vehicle.'
        });
    }
}

// PUT /api/vehicles/:id
// Admin only: update a vehicle.
async function updateVehicle(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: 'Invalid vehicle ID.'
            });
        }

        const data = req.body;
        const validationError = validateVehicle(data, true);

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        const allowedFields = {
            make: 'make',
            model: 'model',
            category: 'category',
            price: 'price',
            stock: 'stock',
            year: 'year',
            fuel: 'fuel',
            transmission: 'transmission',
            mileage: 'mileage',
            color: 'color',
            image_url: 'image_url'
        };

        const updates = [];
        const values = [];

        for (const field of Object.keys(allowedFields)) {
            if (data[field] !== undefined) {
                let value = data[field];

                if (
                    ['price', 'stock', 'year', 'mileage'].includes(field)
                ) {
                    value = Number(value);
                }

                if (typeof value === 'string') {
                    value = value.trim();
                }

                updates.push(`${allowedFields[field]} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                message: 'Provide at least one field to update.'
            });
        }

        values.push(id);

        const [result] = await pool.execute(
            `UPDATE vehicles
             SET ${updates.join(', ')}
             WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            const [existing] = await pool.execute(
                'SELECT id FROM vehicles WHERE id = ?',
                [id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    message: 'Vehicle not found.'
                });
            }
        }

        return res.status(200).json({
            message: 'Vehicle updated successfully.'
        });
    } catch (error) {
        console.error('Failed to update vehicle:', error);

        return res.status(500).json({
            message: 'Unable to update vehicle.'
        });
    }
}

// DELETE /api/vehicles/:id
// Admin only: delete a vehicle from MySQL.
async function deleteVehicle(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: 'Invalid vehicle ID.'
            });
        }

        // Verify that this vehicle exists.
        const [vehicles] = await pool.execute(
            'SELECT id FROM vehicles WHERE id = ?',
            [id]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                message: 'Vehicle not found in the database.'
            });
        }

        // Check if the vehicle is referenced by existing bookings or purchases.
        const [bookingReferences] = await pool.execute(
            'SELECT COUNT(*) AS count FROM bookings WHERE vehicle_id = ?',
            [id]
        );

        if (bookingReferences[0]?.count > 0) {
            return res.status(409).json({
                message:
                    'This vehicle is referenced by existing bookings or purchases. ' +
                    'It cannot be permanently deleted while those references exist.'
            });
        }

        // Delete the vehicle row.
        const [result] = await pool.execute(
            'DELETE FROM vehicles WHERE id = ?',
            [id]
        );

        if (result.affectedRows !== 1) {
            return res.status(500).json({
                message: 'The vehicle could not be deleted.'
            });
        }

        console.log(`Vehicle ID ${id} deleted successfully.`);

        return res.status(200).json({
            success: true,
            message: 'Vehicle deleted successfully.',
            deletedVehicleId: id
        });
    } catch (error) {
        console.error('Failed to delete vehicle:', error);

        if (
            error.code === 'ER_ROW_IS_REFERENCED_2' ||
            error.code === 'ER_ROW_IS_REFERENCED' ||
            error.errno === 1451
        ) {
            return res.status(409).json({
                message:
                    'This vehicle is referenced by existing bookings or purchases. ' +
                    'It cannot be permanently deleted while those references exist.'
            });
        }

        return res.status(500).json({
            message: 'Unable to delete vehicle from the database.',
            error: error.message
        });
    }
}

// POST /api/vehicles/:id/purchase
async function purchaseVehicle(req, res) {
    const customerId = req.user?.id;
    const vehicleId = Number(req.params.id);
    const requestedQuantity = Number(req.body.quantity ?? 1);

    if (!customerId) {
        return res.status(401).json({
            message: 'Please log in to continue.'
        });
    }

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
        return res.status(400).json({
            message: 'A valid vehicle ID is required.'
        });
    }

    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
        return res.status(400).json({
            message: 'Purchase quantity must be a positive whole number.'
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();

        await connection.beginTransaction();

        const [vehicles] = await connection.execute(
            `SELECT id, make, model, price, stock
             FROM vehicles
             WHERE id = ?
             FOR UPDATE`,
            [vehicleId]
        );

        if (vehicles.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: 'Vehicle not found.'
            });
        }

        const vehicle = vehicles[0];

        if (vehicle.stock < requestedQuantity) {
            await connection.rollback();

            return res.status(409).json({
                message: 'Not enough stock available.'
            });
        }

        await connection.execute(
            'UPDATE vehicles SET stock = stock - ? WHERE id = ?',
            [requestedQuantity, vehicleId]
        );

        const [result] = await connection.execute(
            `INSERT INTO bookings (
                customer_id,
                vehicle_id,
                quantity,
                total_price,
                status
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                customerId,
                vehicleId,
                requestedQuantity,
                Number(vehicle.price) * requestedQuantity,
                'confirmed'
            ]
        );

        await connection.commit();

        return res.status(201).json({
            message: 'Vehicle purchased successfully.',
            booking: {
                id: result.insertId,
                customerId,
                vehicleId: vehicle.id,
                make: vehicle.make,
                model: vehicle.model,
                quantity: requestedQuantity,
                totalPrice: Number(vehicle.price) * requestedQuantity,
                status: 'confirmed'
            }
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Purchase rollback failed:', rollbackError);
            }
        }

        console.error('Vehicle purchase failed:', error);

        return res.status(500).json({
            message: 'Unable to complete the purchase.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// POST /api/vehicles/:id/restock
// Admin only: restock a vehicle.
async function restockVehicle(req, res) {
    const vehicleId = Number(req.params.id);
    const quantity = Number(req.body.quantity ?? 1);

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
        return res.status(400).json({
            message: 'A valid vehicle ID is required.'
        });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
            message: 'Restock quantity must be a positive whole number.'
        });
    }

    try {
        const [result] = await pool.execute(
            'UPDATE vehicles SET stock = stock + ? WHERE id = ?',
            [quantity, vehicleId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Vehicle not found.'
            });
        }

        return res.status(200).json({
            message: 'Vehicle restocked successfully.',
            vehicleId,
            quantity
        });
    } catch (error) {
        console.error('Vehicle restock failed:', error);

        return res.status(500).json({
            message: 'Unable to restock the vehicle.'
        });
    }
}

// Export controller functions.
module.exports = {
    getVehicleById,
    getVehicles,
    searchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    purchaseVehicle,
    restockVehicle
};
