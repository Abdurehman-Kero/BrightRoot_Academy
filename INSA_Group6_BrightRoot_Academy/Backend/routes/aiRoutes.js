// ============================================
// AI Services Routes
// ============================================
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  generateSummary,
  generateQuiz,
  getUserSummaries,
  getUserQuizzes,
} = require('../controllers/aiController');

// POST /api/ai/summary/generate/ — Authenticated
router.post('/summary/generate/', authenticateToken, generateSummary);

// POST /api/ai/quiz/generate/ — Authenticated
router.post('/quiz/generate/', authenticateToken, generateQuiz);

// GET /api/ai/summaries/ — Authenticated
router.get('/summaries/', authenticateToken, getUserSummaries);

// GET /api/ai/quizzes/ — Authenticated
router.get('/quizzes/', authenticateToken, getUserQuizzes);

module.exports = router;
