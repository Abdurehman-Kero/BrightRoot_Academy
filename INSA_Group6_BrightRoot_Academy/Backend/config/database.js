// ============================================
// Database Configuration - MySQL (MAMP)
// ============================================
const mysql = require('mysql2/promise');
require('dotenv').config();

// Handle password: use value from .env, fallback to 'root' (MAMP default)
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: dbPassword,
  database: process.env.DB_NAME || 'brightroot_academy',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test connection on startup
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    console.error('   Make sure MAMP is running and MySQL is started.');
    console.error('   Check your .env file for correct DB_HOST, DB_PORT, DB_USER, DB_PASSWORD');
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
