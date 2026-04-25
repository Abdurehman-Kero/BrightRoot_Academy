const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  generatePlan, getPlans, getSessions, updateSession,
  addExam, getExams, deleteExam,
  getReminders, dismissReminder, getTodaySummary,
} = require('../controllers/studyPlannerController');

router.use(authenticateToken);

// Exams
router.get('/exams/', getExams);
router.post('/exams/', addExam);
router.delete('/exams/:exam_id/', deleteExam);

// Plans
router.get('/plans/', getPlans);
router.post('/plans/generate/', generatePlan);

// Sessions
router.get('/sessions/', getSessions);
router.patch('/sessions/:session_id/', updateSession);

// Today
router.get('/today/', getTodaySummary);

// Reminders
router.get('/reminders/', getReminders);
router.post('/reminders/:id/dismiss/', dismissReminder);

module.exports = router;
