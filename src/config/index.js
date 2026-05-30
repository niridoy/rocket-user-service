const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    PORT: process.env.PORT || 8181,
    HOST: process.env.HOST || '0.0.0.0',
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
    DB: {
        HOST: process.env.DB_HOST || 'mysql',
        USER: process.env.DB_USER || 'user',
        PASSWORD: process.env.DB_PASSWORD || 'password',
        NAME: process.env.DB_NAME || 'appdb',
        CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
        QUEUE_LIMIT: parseInt(process.env.DB_QUEUE_LIMIT, 10) || 0
    }
};
