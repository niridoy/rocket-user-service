// server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise'); // use promise-based mysql
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8181;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Change this to a strong secret

app.use(bodyParser.json());

let dbConnected = false;

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql',           // service name in docker-compose / k8s
    user: process.env.DB_USER || 'user',            // from secret (base64 decoded)
    password: process.env.DB_PASSWORD || 'password',// from secret (base64 decoded)
    database: process.env.DB_NAME || 'appdb',       // you should create this database in MySQL
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT, 10) || 0
});

// Ensure users table exists
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
        dbConnected = true;
        console.log('✅ MySQL users table ready');
    } catch (err) {
        dbConnected = false;
        console.error('❌ Database not connected. The app will still run, but DB APIs will return an error.');
        console.error('Error initializing database:', err.message);
    }
})();

const sendDbUnavailable = (res) => {
    return res.status(503).json({
        message: 'Database not connected',
        error: 'The application is running, but the database is unavailable.'
    });
};

// Registration Endpoint
app.post('/api/register', async (req, res) => {
    if (!dbConnected) return sendDbUnavailable(res);

    const { first_name, last_name, email, password } = req.body;
    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            `INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)`,
            [first_name, last_name, email, hashedPassword]
        );
        res.status(201).json({ message: 'User registered successfully', user_id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already registered' });
        }
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
    if (!dbConnected) return sendDbUnavailable(res);

    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const [rows] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
        if (rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// Protected route example
app.get('/api/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ message: 'Profile data', user: decoded });
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Health check
app.get('/api/health-check', (req, res) => {
    res.json({
        status: 'Application running',
        database: dbConnected ? 'connected' : 'not connected'
    });
});

// Database status endpoint
app.get('/api/db-status', (req, res) => {
    res.json({
        database: dbConnected ? 'connected' : 'not connected',
        message: dbConnected ? 'Database is available' : 'Database is unavailable'
    });
});

app.listen(PORT, HOST, () => {
    console.log(`🚀 Running on http://${HOST}:${PORT}`);
    if (!dbConnected) {
        console.log('⚠️  Database is not connected. /api/register and /api/login will return a 503 error.');
    }
});
