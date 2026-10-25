const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const imageMap = {
  'Toyota Camry': '/images/cars/toyota-camry.svg',
  'Honda Civic': '/images/cars/honda-civic.svg',
  'Hyundai Creta': '/images/cars/hyundai-creta.svg',
  'Tata Nexon': '/images/cars/tata-nexon.svg',
  'BMW 3 Series': '/images/cars/bmw-3-series.svg',
  'Maruti Swift': '/images/cars/maruti-swift.svg',
};

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_craftdb',
  });

  const [rows] = await connection.query('SELECT id, make, model FROM vehicles ORDER BY id');
  let updated = 0;

  for (const row of rows) {
    const key = `${row.make} ${row.model}`.trim();
    const imageUrl = imageMap[key];

    if (imageUrl) {
      await connection.execute('UPDATE vehicles SET image_url = ? WHERE id = ?', [imageUrl, row.id]);
      updated += 1;
    }
  }

  console.log(`Updated ${updated} vehicle image URLs.`);
  await connection.end();
}

main().catch((error) => {
  console.error('Failed to sync vehicle image URLs:', error.message);
  process.exit(1);
});
