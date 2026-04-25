// ============================================
// User Controller - Auth & Profile
// ============================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Generate JWT access and refresh tokens
 */
const generateTokens = (user) => {
  const access = jwt.sign(
    { userId: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY }
  );
  const refresh = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );
  return { access, refresh };
};

/**
 * POST /api/users/register/
 * Register a new user
 */
const register = async (req, res) => {
  const { username, email, password } = req.body;

  // Validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ password: ['Password must be at least 8 characters long.'] });
  }

  try {
    // Check for existing username
    const [existingUsername] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsername.length > 0) {
      return res.status(400).json({ username: ['A user with that username already exists.'] });
    }

    // Check for existing email
    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ email: ['A user with that email already exists.'] });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const newUser = {
      id: result.insertId,
      username,
      email,
    };

    // Generate tokens
    const tokens = generateTokens(newUser);

    return res.status(201).json({
      user: newUser,
      access: tokens.access,
      refresh: tokens.refresh,
      message: 'User registered successfully.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
};

/**
 * POST /api/token/
 * Login - obtain JWT tokens (compatible with SimpleJWT endpoint)
 */
const login = async (req, res) => {
  const { username, email, password } = req.body;
  const identifier = username || email;

  if (!identifier || !password) {
    return res.status(400).json({ detail: 'Username/email and password are required.' });
  }

  try {
    // Find user by username or email
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [identifier, identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({ detail: 'No active account found with the given credentials' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({ detail: 'User account is disabled.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ detail: 'No active account found with the given credentials' });
    }

    // Update last_login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Generate tokens
    const tokens = generateTokens(user);

    return res.status(200).json({
      access: tokens.access,
      refresh: tokens.refresh,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ detail: 'Server error during login.' });
  }
};

/**
 * POST /api/token/refresh/
 * Refresh access token
 */
const refreshToken = async (req, res) => {
  const { refresh } = req.body;

  if (!refresh) {
    return res.status(400).json({ detail: 'Refresh token is required.' });
  }

  try {
    // Check if token is blacklisted
    const [blacklisted] = await pool.query(
      'SELECT id FROM blacklisted_tokens WHERE token = ? LIMIT 1',
      [refresh]
    );
    if (blacklisted.length > 0) {
      return res.status(401).json({ detail: 'Token is blacklisted.', code: 'token_not_valid' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refresh, JWT_REFRESH_SECRET);

    // Get user
    const [users] = await pool.query('SELECT id, username, email FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) {
      return res.status(401).json({ detail: 'User not found.' });
    }

    const user = users[0];

    // Blacklist old refresh token (rotate)
    await pool.query('INSERT INTO blacklisted_tokens (token) VALUES (?)', [refresh]);

    // Generate new tokens
    const tokens = generateTokens(user);

    return res.status(200).json({
      access: tokens.access,
      refresh: tokens.refresh,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Token is invalid or expired', code: 'token_not_valid' });
    }
    return res.status(401).json({ detail: 'Token is invalid or expired', code: 'token_not_valid' });
  }
};

/**
 * POST /api/users/logout/
 * Blacklist refresh token
 */
const logout = async (req, res) => {
  const { refresh } = req.body;

  if (!refresh) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    await pool.query('INSERT INTO blacklisted_tokens (token) VALUES (?)', [refresh]);
    return res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(400).json({ error: 'Logout failed.' });
  }
};

/**
 * GET /api/users/profile/
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    return res.status(200).json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      first_name: req.user.first_name || '',
      last_name: req.user.last_name || '',
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

/**
 * PUT/PATCH /api/users/profile/
 * Update current user profile
 */
const updateProfile = async (req, res) => {
  const { username, email, password, first_name, last_name } = req.body;
  const userId = req.user.id;

  try {
    const updates = [];
    const values = [];

    if (username) {
      // Check uniqueness
      const [existing] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
      if (existing.length > 0) {
        return res.status(400).json({ username: ['A user with that username already exists.'] });
      }
      updates.push('username = ?');
      values.push(username);
    }

    if (email) {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existing.length > 0) {
        return res.status(400).json({ email: ['A user with that email already exists.'] });
      }
      updates.push('email = ?');
      values.push(email);
    }

    if (password) {
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(first_name);
    }

    if (last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(last_name);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Fetch updated user
    const [users] = await pool.query(
      'SELECT id, username, email, first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    return res.status(200).json(users[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
};
