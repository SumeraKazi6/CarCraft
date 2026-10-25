const pool = require('../config/database');

function toMoney(value) {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric : 0;
}

async function getDashboard(req, res) {
    try {
        const [vehicles] = await pool.execute(`
            SELECT
                id,
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
                image_url,
                created_at
            FROM vehicles
            ORDER BY created_at DESC
        `);

        const totalVehicles = vehicles.length;
        const available = vehicles.filter((vehicle) => Number(vehicle.stock || 0) > 0).length;
        const reserved = vehicles.filter((vehicle) => Number(vehicle.stock || 0) > 0 && Number(vehicle.stock || 0) <= 2).length;
        const totalValue = vehicles.reduce((sum, vehicle) => sum + toMoney(vehicle.price), 0);

        const [brandRows] = await pool.execute(`
            SELECT make AS name, COUNT(*) AS count
            FROM vehicles
            GROUP BY make
            ORDER BY count DESC, make ASC
            LIMIT 6
        `);

        const [salesRows] = await pool.execute(`
            SELECT
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                COALESCE(SUM(total_price), 0) AS total
            FROM bookings
            WHERE created_at IS NOT NULL
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
            LIMIT 12
        `);

        const [activityRows] = await pool.execute(`
            SELECT
                'booking' AS type,
                CONCAT(v.make, ' ', v.model) AS title,
                b.status AS detail,
                b.created_at AS created_at
            FROM bookings b
            LEFT JOIN vehicles v ON v.id = b.vehicle_id
            ORDER BY b.created_at DESC
            LIMIT 5
        `);

        const [customerRows] = await pool.execute(`
            SELECT
                'customer' AS type,
                full_name AS title,
                CONCAT('Registered ', DATE_FORMAT(created_at, '%b %d')) AS detail,
                created_at AS created_at
            FROM customers
            ORDER BY created_at DESC
            LIMIT 5
        `);

        const customerId = req.user?.id;
        const customerSummary = {
            purchaseCount: 0,
            totalSpend: 0,
            recentPurchases: []
        };

        if (customerId) {
            const [customerPurchaseRows] = await pool.execute(
                `SELECT
                    COUNT(*) AS purchase_count,
                    COALESCE(SUM(total_price), 0) AS total_spend
                 FROM bookings
                 WHERE customer_id = ?`,
                [customerId]
            );

            const [recentPurchaseRows] = await pool.execute(
                `SELECT
                    b.id,
                    b.quantity,
                    b.total_price,
                    b.status,
                    b.created_at,
                    v.make,
                    v.model,
                    v.year,
                    v.price AS vehicle_price,
                    v.stock,
                    v.image_url
                 FROM bookings b
                 JOIN vehicles v ON v.id = b.vehicle_id
                 WHERE b.customer_id = ?
                 ORDER BY b.created_at DESC
                 LIMIT 5`,
                [customerId]
            );

            customerSummary.purchaseCount = Number(customerPurchaseRows[0]?.purchase_count || 0);
            customerSummary.totalSpend = Number(customerPurchaseRows[0]?.total_spend || 0);
            customerSummary.recentPurchases = recentPurchaseRows.map((row) => ({
                id: row.id,
                quantity: Number(row.quantity || 0),
                totalPrice: Number(row.total_price || 0),
                status: row.status || 'confirmed',
                createdAt: row.created_at,
                make: row.make,
                model: row.model,
                year: row.year,
                stock: Number(row.stock || 0),
                imageUrl: row.image_url || null
            }));
        }

        const activity = [...activityRows, ...customerRows]
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .slice(0, 8)
            .map((item) => ({
                type: item.type,
                title: item.title || 'CarCraft update',
                detail: item.detail || 'Recent activity',
                createdAt: item.created_at
            }));

        return res.status(200).json({
            summary: {
                totalVehicles,
                available,
                reserved,
                totalValue
            },
            customer: customerSummary,
            sales: salesRows.map((row) => ({
                month: row.month,
                total: Number(row.total || 0)
            })),
            brands: brandRows.map((row) => ({
                name: row.name,
                count: Number(row.count || 0)
            })),
            activity
        });
    } catch (error) {
        console.error('Dashboard query failed:', error.message);
        return res.status(500).json({
            message: 'Unable to load dashboard data.'
        });
    }
}

module.exports = { getDashboard };
