const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/health-check', (req, res) => {
    res.json({
        status: 'Application running',
        database: db.isConnected() ? 'connected' : 'not connected'
    });
});

router.get('/db-status', (req, res) => {
    res.json({
        database: db.isConnected() ? 'connected' : 'not connected',
        message: db.isConnected() ? 'Database is available' : 'Database is unavailable'
    });
});

module.exports = router;
