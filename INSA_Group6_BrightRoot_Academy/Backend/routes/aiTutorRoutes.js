// ============================================
// AI Tutor Routes
// ============================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const {
  createConversation, getConversations, getMessages,
  sendMessage, deleteConversation, renameConversation, getStudentMemory,
} = require('../controllers/aiTutorController');

// Ensure uploads/tutor directory exists
const tutorUploadDir = path.join(__dirname, '..', 'uploads', 'tutor');
if (!fs.existsSync(tutorUploadDir)) {
  fs.mkdirSync(tutorUploadDir, { recursive: true });
}

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tutorUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `tutor_${Date.now()}_${Math.random().toString(36).substr(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|bmp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split('/')[1]);
    if (ext || mime) return cb(null, true);
    cb(new Error('Only image files are allowed.'));
  },
});

// All routes require authentication
router.use(authenticateToken);

// Conversations
router.post('/conversations/', createConversation);
router.get('/conversations/', getConversations);
router.get('/conversations/:id/messages/', getMessages);
router.delete('/conversations/:id/', deleteConversation);
router.put('/conversations/:id/', renameConversation);

// Chat (with optional image upload)
router.post('/conversations/:id/send/', upload.single('image'), sendMessage);

// Student memory
router.get('/memory/', getStudentMemory);

module.exports = router;
