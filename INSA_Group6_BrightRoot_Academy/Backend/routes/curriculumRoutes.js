// ============================================
// Curriculum Routes
// ============================================
const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const {
  getSubjects, getGrades, getUnits, getChapters, getLessons,
  getLessonDetail, getSidebar, updateProgress, getUserProgress,
  generateLessonSummary, generateLessonQuiz,
} = require('../controllers/curriculumController');

// Public browsing
router.get('/subjects/', getSubjects);
router.get('/grades/', getGrades);
router.get('/units/', getUnits);
router.get('/chapters/', getChapters);
router.get('/lessons/', getLessons);

// Lesson detail (optional auth for progress tracking)
router.get('/lessons/:id/', optionalAuth, getLessonDetail);

// Sidebar navigation (optional auth for progress)
router.get('/sidebar/', optionalAuth, getSidebar);

// Progress tracking (authenticated)
router.post('/progress/', authenticateToken, updateProgress);
router.get('/progress/', authenticateToken, getUserProgress);

// AI generation (authenticated)
router.post('/lessons/:id/generate-summary/', authenticateToken, generateLessonSummary);
router.post('/lessons/:id/generate-quiz/', authenticateToken, generateLessonQuiz);

module.exports = router;
