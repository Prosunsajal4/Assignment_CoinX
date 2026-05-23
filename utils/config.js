require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI,
  timestampToleranceSeconds: parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS) || 300,
  quantityTolerancePct: parseFloat(process.env.QUANTITY_TOLERANCE_PCT) || 0.01,
  nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = config;
