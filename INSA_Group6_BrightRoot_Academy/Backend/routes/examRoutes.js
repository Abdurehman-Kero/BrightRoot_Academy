// ============================================
// Exam Prep Routes
// ============================================
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getExams, getExamStats, startExam, saveAnswer, toggleFlag,
  submitExam, getHistory, getAttemptDetail, getQuestionBank, getSubjectsAndTopics,
} = require('../controllers/examController');

// All routes require authentication
router.use(authenticateToken);

// Browse & discovery
router.get('/exams/', getExams);
router.get('/subjects/', getSubjectsAndTopics);
router.get('/questions/', getQuestionBank);
router.get('/stats/', getExamStats);

// Exam flow
router.post('/start/', startExam);
router.post('/attempts/:attempt_id/answer/', saveAnswer);
router.post('/attempts/:attempt_id/flag/', toggleFlag);
router.post('/attempts/:attempt_id/submit/', submitExam);

// History & review
router.get('/history/', getHistory);
router.get('/attempts/:attempt_id/', getAttemptDetail);

module.exports = router;
