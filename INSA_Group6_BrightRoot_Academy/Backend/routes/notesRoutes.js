// ============================================
// Notes Routes
// ============================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const {
  uploadFile,
  getUserFiles,
  getCommonBooks,
  downloadFile,
} = require('../controllers/notesController');

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^A-Za-z0-9._-]/g, '-');
    cb(null, `${uniqueSuffix}-${baseName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 }, // 50MB default
});

// POST /api/notes/upload/ — Authenticated, multipart file upload
router.post('/upload/', authenticateToken, upload.single('file'), uploadFile);

// GET /api/notes/files/ — Authenticated
router.get('/files/', authenticateToken, getUserFiles);

// GET /api/notes/common-books/ — Authenticated
router.get('/common-books/', authenticateToken, getCommonBooks);

// GET /api/notes/download/:fileId/ — Public (matches Django's function view)
router.get('/download/:fileId/', downloadFile);

module.exports = router;
