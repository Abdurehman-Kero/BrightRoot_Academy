// ============================================
// JWT Authentication Middleware
// ============================================
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware: Require valid JWT access token
 * Attaches req.user with { id, username, email }
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
  }

  try {
    // Check if token is blacklisted
    const [blacklisted] = await pool.query(
      'SELECT id FROM blacklisted_tokens WHERE token = ? LIMIT 1',
      [token]
    );
    if (blacklisted.length > 0) {
      return res.status(401).json({ detail: 'Token has been blacklisted.' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from database
    const [users] = await pool.query(
      'SELECT id, username, email, first_name, last_name, is_active, is_staff, is_superuser FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ detail: 'User not found.' });
    }

    if (!users[0].is_active) {
      return res.status(401).json({ detail: 'User account is disabled.' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Token has expired.', code: 'token_expired' });
    }
    return res.status(401).json({ detail: 'Invalid token.' });
  }
};

/**
 * Middleware: Optional authentication (doesn't block if no token)
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await pool.query(
      'SELECT id, username, email, first_name, last_name, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );
    req.user = users.length > 0 ? users[0] : null;
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { authenticateToken, optionalAuth };
