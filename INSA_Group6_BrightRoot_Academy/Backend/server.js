// BrightRoot Academy - Express Server
// BrightRoot Academy - Express Server
// ============================================
// MAMP Stack: MySQL + Apache + Node.js + PHP
// This replaces the Django backend entirely
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');
const { login, refreshToken } = require('./controllers/userController');

// Import routes
const userRoutes = require('./routes/userRoutes');
const notesRoutes = require('./routes/notesRoutes');
const aiRoutes = require('./routes/aiRoutes');
const curriculumRoutes = require('./routes/curriculumRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiTutorRoutes = require('./routes/aiTutorRoutes');
const examRoutes = require('./routes/examRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const studyPlannerRoutes = require('./routes/studyPlannerRoutes');

const app = express();
const PORT = process.env.PORT || 8000;

// ── Middleware ──────────────────────────────

// CORS - allow frontend origin
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve media files (compatibility with Django's /media/ path)
app.use('/media', express.static(path.join(__dirname, 'media')));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: { detail: 'Too many requests, please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { detail: 'Too many AI requests, please try again later.' },
});

app.use('/api/', generalLimiter);
app.use('/api/ai/', aiLimiter);

// ── Routes ─────────────────────────────────

// JWT Token endpoints (matching Django SimpleJWT paths)
app.post('/api/token/', login);
app.post('/api/token/refresh/', refreshToken);

// User endpoints
app.use('/api/users', userRoutes);

// Notes endpoints
app.use('/api/notes', notesRoutes);

// AI service endpoints
app.use('/api/ai', aiRoutes);

// Curriculum endpoints
app.use('/api/curriculum', curriculumRoutes);

// Admin endpoints
app.use('/api/admin', adminRoutes);

// AI Tutor endpoints
app.use('/api/tutor', aiTutorRoutes);

// Exam Prep endpoints
app.use('/api/exam', examRoutes);

// Gamification endpoints
app.use('/api/gamification', gamificationRoutes);

// Study Planner endpoints
app.use('/api/planner', studyPlannerRoutes);

// ── Health Check ───────────────────────────
app.get('/api/health/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'BrightRoot Academy API is running',
    stack: 'Node.js + Express + MySQL (MAMP)',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 Handler ────────────────────────────
app.use((req, res) => {
  res.status(404).json({ detail: 'Not found.' });
});

// ── Error Handler ──────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large.' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
  }

  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start Server ───────────────────────────
const startServer = async () => {
  // Test database connection
  await testConnection();

  const server = app.listen(PORT, () => {
    console.log('');
    console.log('🌱 ══════════════════════════════════════════');
    console.log('   BrightRoot Academy API Server');
    console.log('   ──────────────────────────────────────');
    console.log(`   🚀 Server:    http://localhost:${PORT}`);
    console.log(`   📦 Stack:     Node.js + Express + MySQL`);
    console.log(`   🗄️  Database:  ${process.env.DB_NAME || 'brightroot_academy'}`);
    console.log(`   🌍 CORS:      ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
    console.log(`   📁 Uploads:   ./uploads`);
    console.log('   ──────────────────────────────────────');
    console.log('   API Endpoints:');
    console.log(`     POST /api/token/              → Login (JWT)`);
    console.log(`     POST /api/token/refresh/       → Refresh Token`);
    console.log(`     POST /api/users/register/      → Register`);
    console.log(`     POST /api/users/logout/         → Logout`);
    console.log(`     GET  /api/users/profile/        → Profile`);
    console.log(`     POST /api/notes/upload/         → Upload File`);
    console.log(`     GET  /api/notes/files/           → User Files`);
    console.log(`     GET  /api/notes/common-books/    → Common Books`);
    console.log(`     GET  /api/notes/download/:id/    → Download`);
    console.log(`     POST /api/ai/summary/generate/   → AI Summary`);
    console.log(`     POST /api/ai/quiz/generate/      → AI Quiz`);
    console.log(`     GET  /api/ai/summaries/           → User Summaries`);
    console.log(`     GET  /api/ai/quizzes/             → User Quizzes`);
    console.log(`     GET  /api/curriculum/subjects/     → Subjects`);
    console.log(`     GET  /api/curriculum/sidebar/      → Sidebar Tree`);
    console.log(`     GET  /api/curriculum/lessons/:id/  → Lesson Detail`);
    console.log(`     POST /api/curriculum/progress/     → Update Progress`);
    console.log(`     GET  /api/admin/stats/             → Admin Dashboard`);
    console.log(`     GET  /api/health/                  → Health Check`);
    console.log('   ══════════════════════════════════════════');
    console.log('');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use.`);
      console.error(`   Run: powershell -Command "Stop-Process -Id (netstat -ano | Select-String ':${PORT}.*LISTEN' | ForEach-Object { ($_ -split '\\s+')[-1] }) -Force"`);
      console.error('   Then restart the server.\n');
      process.exit(1);
    } else {
      throw err;
    }
  });
};

startServer();
