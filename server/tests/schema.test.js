const pool = require('../src/config/database');
const { ensureDatabaseTables } = require('../src/config/initDatabase');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));

describe('Database schema bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ensureDatabaseTables creates customers, vehicles, bookings, sessions, and a default admin user if missing', async () => {
    await ensureDatabaseTables();

    expect(pool.query).toHaveBeenCalledTimes(5);
    expect(pool.query.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS customers');
    expect(pool.query.mock.calls[1][0]).toContain('CREATE TABLE IF NOT EXISTS vehicles');
    expect(pool.query.mock.calls[2][0]).toContain('CREATE TABLE IF NOT EXISTS bookings');
    expect(pool.query.mock.calls[3][0]).toContain('CREATE TABLE IF NOT EXISTS sessions');
    expect(pool.query.mock.calls[4][0]).toContain('INSERT INTO customers');
  });
});
