const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

exports.register = async (req, res) => {
    if (!db.isConnected()) return res.status(503).json({ message: 'Database not connected', error: 'DB unavailable' });
    const { first_name, last_name, email, password } = req.body;
    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.pool.query(
            `INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)`,
            [first_name, last_name, email, hashedPassword]
        );
        res.status(201).json({ message: 'User registered successfully', user_id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already registered' });
        res.status(500).json({ message: 'Database error', error: err.message });
    }
};

exports.login = async (req, res) => {
    if (!db.isConnected()) return res.status(503).json({ message: 'Database not connected', error: 'DB unavailable' });
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    try {
        const [rows] = await db.pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
        if (rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, email: user.email }, config.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
};
