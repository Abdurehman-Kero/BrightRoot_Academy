// ============================================
// Study Planner Controller - AI-Powered Scheduling
// ============================================
const { pool } = require('../config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Helpers ──
const daysBetween = (a, b) => Math.ceil((new Date(b) - new Date(a)) / 86400000);
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };
const today = () => new Date().toISOString().split('T')[0];

// ── Get student's weak topics from exam analytics ──
const getWeakTopics = async (userId) => {
  try {
    const [rows] = await pool.query(
      `SELECT subject, topic, accuracy FROM exam_performance
       WHERE user_id = ? AND total_attempted >= 2 ORDER BY accuracy ASC LIMIT 10`,
      [userId]
    );
    return rows;
  } catch { return []; }
};

// ── AI: Generate a study plan ──
const generatePlan = async (req, res) => {
  const { exam_ids, hours_per_day = 4, preferred_start = '09:00', preferred_end = '21:00' } = req.body;
  try {
    const userId = req.user.id;

    // Load selected exams
    let examSql = 'SELECT * FROM student_exams WHERE user_id = ? AND is_active = 1 AND exam_date >= ?';
    const params = [userId, today()];
    if (exam_ids?.length) { examSql += ` AND id IN (${exam_ids.map(() => '?').join(',')})` ; params.push(...exam_ids); }
    const [exams] = await pool.query(examSql, params);
    if (exams.length === 0) return res.status(400).json({ error: 'No upcoming exams found. Add exams first.' });

    const weakTopics = await getWeakTopics(userId);

    // Determine plan range
    const sortedExams = [...exams].sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
    const planStart = today();
    const planEnd = sortedExams[sortedExams.length - 1].exam_date;
    const totalDays = daysBetween(planStart, planEnd);

    if (totalDays < 1) return res.status(400).json({ error: 'Exam dates must be in the future.' });

    // Build AI prompt
    const examList = sortedExams.map(e =>
      `- ${e.subject}: ${e.exam_name || 'National Exam'} on ${e.exam_date} (Priority: ${e.priority})`
    ).join('\n');

    const weakList = weakTopics.length > 0
      ? weakTopics.map(t => `- ${t.subject} / ${t.topic}: ${Number(t.accuracy).toFixed(0)}% accuracy`).join('\n')
      : 'No weak topics data yet';

    const prompt = `You are an expert Ethiopian National Exam study planner AI.

Create a detailed, day-by-day study schedule for a Grade 12 student.

UPCOMING EXAMS:
${examList}

WEAK TOPICS (needs extra focus):
${weakList}

CONSTRAINTS:
- Plan from ${planStart} to ${planEnd} (${totalDays} days)
- Study ${hours_per_day} hours per day
- Available hours: ${preferred_start} to ${preferred_end}
- Include variety: study new topics, review weak areas, practice exams
- Last 2 days before each exam: review only

RESPOND WITH VALID JSON ONLY — no markdown, no explanation:
{
  "plan_title": "string",
  "ai_notes": "2-3 sentence motivational study tip",
  "sessions": [
    {
      "date": "YYYY-MM-DD",
      "subject": "string",
      "topic": "string",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "duration_minutes": number,
      "session_type": "study|review|practice",
      "priority": "low|medium|high",
      "ai_tip": "short tip for this session"
    }
  ]
}

Generate sessions for ALL ${totalDays} days. Include at least 2-3 sessions per day. Maximum 20 sessions total for now (summarize if needed).`;

    let planData;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim().replace(/```json|```/g, '').trim();
      planData = JSON.parse(raw);
    } catch (aiErr) {
      console.warn('AI generation failed, using fallback:', aiErr.message);
      planData = generateFallbackPlan(sortedExams, planStart, planEnd, hours_per_day, preferred_start, weakTopics);
    }

    // Save plan to DB
    const [planResult] = await pool.query(
      `INSERT INTO study_plans (user_id, title, plan_start, plan_end, ai_generated, total_hours, ai_notes)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [userId, planData.plan_title, planStart, planEnd, totalDays * hours_per_day, planData.ai_notes]
    );
    const planId = planResult.insertId;

    // Save sessions
    const savedSessions = [];
    for (const s of planData.sessions) {
      if (!s.date || !s.start_time || !s.subject) continue;
      const [sRes] = await pool.query(
        `INSERT INTO study_sessions (plan_id, user_id, subject, topic, session_date, start_time, end_time, duration_minutes, session_type, priority, ai_tip)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [planId, userId, s.subject, s.topic || '', s.date, s.start_time, s.end_time || s.start_time, s.duration_minutes || 60, s.session_type || 'study', s.priority || 'medium', s.ai_tip || '']
      );
      savedSessions.push({ id: sRes.insertId, ...s });
    }

    // Auto-create reminders for tomorrow's sessions
    const tomorrow = addDays(today(), 1);
    const tomorrowSessions = savedSessions.filter(s => s.date === tomorrow);
    for (const s of tomorrowSessions) {
      const remindAt = new Date(`${s.date}T${s.start_time}`);
      remindAt.setMinutes(remindAt.getMinutes() - 15);
      await pool.query(
        'INSERT INTO study_reminders (user_id, session_id, message, remind_at) VALUES (?,?,?,?)',
        [userId, s.id, `📚 Study session in 15 min: ${s.subject} - ${s.topic}`, remindAt.toISOString().replace('T', ' ').slice(0, 19)]
      );
    }

    return res.status(201).json({
      plan: { id: planId, title: planData.plan_title, ai_notes: planData.ai_notes, plan_start: planStart, plan_end: planEnd },
      sessions: savedSessions,
      session_count: savedSessions.length,
    });
  } catch (error) {
    console.error('Generate plan error:', error);
    return res.status(500).json({ error: 'Failed to generate study plan.' });
  }
};

// ── Fallback plan (when AI is rate-limited) ──
const generateFallbackPlan = (exams, planStart, planEnd, hoursPerDay, preferredStart, weakTopics) => {
  const sessions = [];
  const subjects = [...new Set(exams.map(e => e.subject))];
  const weakSubjects = weakTopics.map(t => t.subject);

  let currentDate = planStart;
  const startHour = parseInt(preferredStart.split(':')[0]);
  let sessionOrder = 0;

  while (currentDate <= planEnd && sessions.length < 20) {
    const daySubjects = sessionOrder % 2 === 0
      ? subjects.slice(0, Math.ceil(subjects.length / 2))
      : subjects.slice(Math.ceil(subjects.length / 2));

    for (const subj of daySubjects) {
      if (sessions.length >= 20) break;
      const daysToExam = exams.filter(e => e.subject === subj).reduce((min, e) => Math.min(min, daysBetween(currentDate, e.exam_date)), 999);
      const sType = daysToExam <= 2 ? 'review' : weakSubjects.includes(subj) ? 'practice' : 'study';
      const sh = startHour + (sessions.length % daySubjects.length) * 2;
      sessions.push({
        date: currentDate,
        subject: subj,
        topic: `${subj} - Core Topics`,
        start_time: `${String(sh).padStart(2, '0')}:00`,
        end_time: `${String(sh + 2).padStart(2, '0')}:00`,
        duration_minutes: 120,
        session_type: sType,
        priority: daysToExam <= 3 ? 'high' : 'medium',
        ai_tip: `Focus on understanding core concepts in ${subj}.`,
      });
    }
    currentDate = addDays(currentDate, 1);
    sessionOrder++;
  }

  return {
    plan_title: `Study Plan: ${exams.map(e => e.subject).join(', ')}`,
    ai_notes: 'Study consistently every day. Focus on your weak areas first. Take short breaks every 45 minutes.',
    sessions,
  };
};

// ── Get all plans for user ──
const getPlans = async (req, res) => {
  try {
    const [plans] = await pool.query(
      'SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.json(plans);
  } catch { return res.status(500).json({ error: 'Failed to fetch plans.' }); }
};

// ── Get sessions for a plan or date range ──
const getSessions = async (req, res) => {
  try {
    const { plan_id, start_date, end_date } = req.query;
    let sql = 'SELECT * FROM study_sessions WHERE user_id = ?';
    const params = [req.user.id];
    if (plan_id) { sql += ' AND plan_id = ?'; params.push(plan_id); }
    if (start_date) { sql += ' AND session_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND session_date <= ?'; params.push(end_date); }
    sql += ' ORDER BY session_date, start_time';
    const [sessions] = await pool.query(sql, params);
    return res.json(sessions);
  } catch { return res.status(500).json({ error: 'Failed to fetch sessions.' }); }
};

// ── Mark session as done / update ──
const updateSession = async (req, res) => {
  const { session_id } = req.params;
  const { is_completed, actual_duration, notes } = req.body;
  try {
    await pool.query(
      'UPDATE study_sessions SET is_completed=?, actual_duration=?, notes=? WHERE id=? AND user_id=?',
      [is_completed ? 1 : 0, actual_duration || 0, notes || '', session_id, req.user.id]
    );
    // Award XP for completing a session
    if (is_completed) {
      try {
        const { awardXP } = require('./gamificationController');
        await awardXP(req.user.id, 20, 'Study session completed', 'other');
      } catch {}
    }
    return res.json({ updated: true });
  } catch { return res.status(500).json({ error: 'Failed to update session.' }); }
};

// ── Manage student exams ──
const addExam = async (req, res) => {
  const { subject, exam_date, exam_name, priority, notes } = req.body;
  try {
    if (!subject || !exam_date) return res.status(400).json({ error: 'Subject and exam_date required.' });
    const [result] = await pool.query(
      'INSERT INTO student_exams (user_id, subject, exam_date, exam_name, priority, notes) VALUES (?,?,?,?,?,?)',
      [req.user.id, subject, exam_date, exam_name || `${subject} Exam`, priority || 'high', notes || '']
    );
    return res.status(201).json({ id: result.insertId, subject, exam_date });
  } catch { return res.status(500).json({ error: 'Failed to add exam.' }); }
};

const getExams = async (req, res) => {
  try {
    const [exams] = await pool.query(
      'SELECT * FROM student_exams WHERE user_id = ? AND is_active = 1 ORDER BY exam_date ASC',
      [req.user.id]
    );
    return res.json(exams);
  } catch { return res.status(500).json({ error: 'Failed to fetch exams.' }); }
};

const deleteExam = async (req, res) => {
  try {
    await pool.query('UPDATE student_exams SET is_active=0 WHERE id=? AND user_id=?', [req.params.exam_id, req.user.id]);
    return res.json({ deleted: true });
  } catch { return res.status(500).json({ error: 'Failed to delete exam.' }); }
};

// ── Get pending reminders ──
const getReminders = async (req, res) => {
  try {
    const [reminders] = await pool.query(
      `SELECT r.*, s.subject, s.topic, s.session_date, s.start_time
       FROM study_reminders r
       LEFT JOIN study_sessions s ON r.session_id = s.id
       WHERE r.user_id = ? AND r.is_dismissed = 0
       ORDER BY r.remind_at ASC LIMIT 10`,
      [req.user.id]
    );
    return res.json(reminders);
  } catch { return res.status(500).json({ error: 'Failed to fetch reminders.' }); }
};

const dismissReminder = async (req, res) => {
  try {
    await pool.query('UPDATE study_reminders SET is_dismissed=1 WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    return res.json({ dismissed: true });
  } catch { return res.status(500).json({ error: 'Failed to dismiss reminder.' }); }
};

// ── Get today's summary ──
const getTodaySummary = async (req, res) => {
  try {
    const todayStr = today();
    const [todaySessions] = await pool.query(
      'SELECT * FROM study_sessions WHERE user_id=? AND session_date=? ORDER BY start_time',
      [req.user.id, todayStr]
    );
    const [upcomingExams] = await pool.query(
      `SELECT * FROM student_exams WHERE user_id=? AND is_active=1 AND exam_date >= ? ORDER BY exam_date ASC LIMIT 5`,
      [req.user.id, todayStr]
    );
    const completed = todaySessions.filter(s => s.is_completed).length;
    const totalMinutes = todaySessions.reduce((acc, s) => acc + s.duration_minutes, 0);

    return res.json({
      date: todayStr,
      sessions: todaySessions,
      completed,
      total: todaySessions.length,
      total_minutes: totalMinutes,
      upcoming_exams: upcomingExams,
    });
  } catch { return res.status(500).json({ error: 'Failed to fetch today summary.' }); }
};

module.exports = {
  generatePlan, getPlans, getSessions, updateSession,
  addExam, getExams, deleteExam,
  getReminders, dismissReminder, getTodaySummary,
};
