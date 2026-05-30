const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const db = require('./db');

const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const profileRoutes = require('./routes/profile');

const app = express();
app.use(bodyParser.json());

// Base path for this microservice
const BASE_PATH = process.env.BASE_PATH || '/user-service';

app.use(`${BASE_PATH}/api`, authRoutes);
app.use(`${BASE_PATH}/api`, profileRoutes);
app.use(`${BASE_PATH}/api`, healthRoutes);

app.listen(config.PORT, config.HOST, () => {
    console.log(`🚀 Running on http://${config.HOST}:${config.PORT}`);
    if (!db.isConnected()) {
        console.log('⚠️  Database is not connected. /api/register and /api/login will return a 503 error.');
    }
});

module.exports = app;
