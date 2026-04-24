// ============================================
// Admin Routes - Content Management
// ============================================
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const admin = require('../controllers/adminController');

// All admin routes require authentication
router.use(authenticateToken);

// Dashboard
router.get('/stats/', admin.getDashboardStats);

// Units CRUD
router.get('/units/', admin.units.getAll);
router.get('/units/:id/', admin.units.getOne);
router.post('/units/', admin.units.create);
router.put('/units/:id/', admin.units.update);
router.delete('/units/:id/', admin.units.delete);

// Chapters CRUD
router.get('/chapters/', admin.chapters.getAll);
router.get('/chapters/:id/', admin.chapters.getOne);
router.post('/chapters/', admin.chapters.create);
router.put('/chapters/:id/', admin.chapters.update);
router.delete('/chapters/:id/', admin.chapters.delete);

// Lessons CRUD
router.get('/lessons/', admin.lessons.getAll);
router.get('/lessons/:id/', admin.lessons.getOne);
router.post('/lessons/', admin.lessons.create);
router.put('/lessons/:id/', admin.lessons.update);
router.delete('/lessons/:id/', admin.lessons.delete);

// Formulas CRUD
router.get('/formulas/', admin.formulas.getAll);
router.post('/formulas/', admin.formulas.create);
router.put('/formulas/:id/', admin.formulas.update);
router.delete('/formulas/:id/', admin.formulas.delete);

// Diagrams CRUD
router.get('/diagrams/', admin.diagrams.getAll);
router.post('/diagrams/', admin.diagrams.create);
router.put('/diagrams/:id/', admin.diagrams.update);
router.delete('/diagrams/:id/', admin.diagrams.delete);

// Flashcards CRUD
router.get('/flashcards/', admin.flashcards.getAll);
router.post('/flashcards/', admin.flashcards.create);
router.put('/flashcards/:id/', admin.flashcards.update);
router.delete('/flashcards/:id/', admin.flashcards.delete);

// Exercises CRUD
router.get('/exercises/', admin.exercises.getAll);
router.post('/exercises/', admin.exercises.create);
router.put('/exercises/:id/', admin.exercises.update);
router.delete('/exercises/:id/', admin.exercises.delete);

// Past Exam Questions CRUD
router.get('/exam-questions/', admin.examQuestions.getAll);
router.post('/exam-questions/', admin.examQuestions.create);
router.put('/exam-questions/:id/', admin.examQuestions.update);
router.delete('/exam-questions/:id/', admin.examQuestions.delete);

module.exports = router;
