// ============================================
// User Routes
// ============================================
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  register,
  logout,
  getProfile,
  updateProfile,
} = require('../controllers/userController');

// POST /api/users/register/ — Public
router.post('/register/', register);

// POST /api/users/logout/ — Authenticated
router.post('/logout/', authenticateToken, logout);

// GET /api/users/profile/ — Authenticated
router.get('/profile/', authenticateToken, getProfile);

// PUT /api/users/profile/ — Authenticated
router.put('/profile/', authenticateToken, updateProfile);

// PATCH /api/users/profile/ — Authenticated
router.patch('/profile/', authenticateToken, updateProfile);

module.exports = router;
