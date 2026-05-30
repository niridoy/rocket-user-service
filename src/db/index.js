const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
    host: config.DB.HOST,
    user: config.DB.USER,
    password: config.DB.PASSWORD,
    database: config.DB.NAME,
    waitForConnections: true,
    connectionLimit: config.DB.CONNECTION_LIMIT,
    queueLimit: config.DB.QUEUE_LIMIT
});

let connected = false;

(async () => {
    try {
        const conn = await pool.getConnection();
        await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        conn.release();
        connected = true;
        console.log('✅ MySQL users table ready');
    } catch (err) {
        connected = false;
        console.error('❌ Database not connected. The app will still run, but DB APIs will return an error.');
        console.error('Error initializing database:', err.message);
    }
})();

module.exports = {
    pool,
    isConnected: () => connected
};
