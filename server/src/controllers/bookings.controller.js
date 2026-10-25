
const pool = require('../config/database');

async function getPurchaseHistory(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Please log in to continue.' });
    }

    const customerId = Number(req.user.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
        return res.status(401).json({ message: 'Please log in to continue.' });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT
                b.id,
                b.customer_id AS customerId,
                b.vehicle_id AS vehicleId,
                b.quantity,
                b.total_price AS totalPrice,
                b.status,
                b.created_at AS createdAt,
                v.make,
                v.model,
                v.year,
                v.image_url AS imageUrl
             FROM bookings b
             LEFT JOIN vehicles v ON v.id = b.vehicle_id
             WHERE b.customer_id = ?
             ORDER BY b.created_at DESC`,
            [customerId]
        );

        const purchases = rows.map((row) => ({
            id: row.id,
            customerId: Number(row.customerId ?? row.customer_id ?? 0),
            vehicleId: Number(row.vehicleId ?? row.vehicle_id ?? 0),
            quantity: Number(row.quantity || 0),
            totalPrice: Number(row.totalPrice ?? row.total_price ?? 0),
            status: row.status || 'confirmed',
            createdAt: row.createdAt ?? row.created_at ?? null,
            make: row.make,
            model: row.model,
            year: row.year,
            imageUrl: row.imageUrl ?? row.image_url ?? null
        }));

        return res.status(200).json({ purchases });
    } catch (error) {
        console.error('Failed to load purchase history:', error.message);
        return res.status(500).json({ message: 'Unable to load your purchase history.' });
    }
}

// POST /api/bookings
// Purchase a vehicle and reduce its stock by one.
async function purchaseVehicle(req, res) {
    const customerId = req.user.id;
    const { vehicleId } = req.body;

    // Check whether the vehicle ID was provided.
    if (
        vehicleId === undefined ||
        !Number.isInteger(Number(vehicleId)) ||
        Number(vehicleId) <= 0
    ) {
        return res.status(400).json({
            message: 'A valid vehicle ID is required.'
        });
    }

    const connection = await pool.getConnection();

    try {
        // Start a transaction so the purchase and stock update
        // succeed together or are rolled back together.
        await connection.beginTransaction();

        // Lock this vehicle row to prevent two customers from
        // purchasing the last available vehicle simultaneously.
        const [vehicles] = await connection.execute(
            `SELECT id, make, model, price, stock
             FROM vehicles
             WHERE id = ?
             FOR UPDATE`,
            [Number(vehicleId)]
        );

        if (vehicles.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: 'Vehicle not found.'
            });
        }

        const vehicle = vehicles[0];

        if (vehicle.stock <= 0) {
            await connection.rollback();

            return res.status(409).json({
                message: 'This vehicle is out of stock.'
            });
        }

        // Reduce the available stock by one.
        await connection.execute(
            `UPDATE vehicles
             SET stock = stock - 1
             WHERE id = ?`,
            [Number(vehicleId)]
        );

        // Record the purchase in the bookings table.
        const [result] = await connection.execute(
            `INSERT INTO bookings
             (customer_id, vehicle_id, quantity, total_price, status)
             VALUES (?, ?, ?, ?, ?)`,
            [
                customerId,
                Number(vehicleId),
                1,
                vehicle.price,
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
                quantity: 1,
                totalPrice: vehicle.price,
                status: 'confirmed'
            }
        });
    } catch (error) {
        await connection.rollback();

        console.error('Vehicle purchase failed:', error.message);

        return res.status(500).json({
            message: 'Unable to complete the purchase.'
        });
    } finally {
        connection.release();
    }
}

module.exports = {
    getPurchaseHistory,
    purchaseVehicle
};
