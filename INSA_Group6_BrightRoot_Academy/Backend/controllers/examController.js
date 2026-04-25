// ============================================
// Exam Prep Controller - Ethiopian National Exam
// ============================================
const { pool } = require('../config/database');
const { awardXP } = require('./gamificationController');

// ── Get available exams ──
const getExams = async (req, res) => {
  try {
    const { subject, type } = req.query;
    let sql = `SELECT et.*, 
      (SELECT COUNT(*) FROM exam_template_questions WHERE template_id = et.id) as question_count
      FROM exam_templates et WHERE et.is_active = 1`;
    const params = [];

    if (subject) { sql += ' AND et.subject = ?'; params.push(subject); }
    if (type) { sql += ' AND et.exam_type = ?'; params.push(type); }
    sql += ' ORDER BY et.created_at DESC';

    const [exams] = await pool.query(sql, params);
    return res.json(exams);
  } catch (error) {
    console.error('Get exams error:', error);
    return res.status(500).json({ error: 'Failed to fetch exams.' });
  }
};

// ── Get exam stats for dashboard ──
const getExamStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const [totalAttempts] = await pool.query(
      'SELECT COUNT(*) as total, AVG(percentage) as avg_score FROM exam_attempts WHERE user_id = ? AND status = ?',
      [userId, 'completed']
    );
    const [bySubject] = await pool.query(
      `SELECT subject, COUNT(*) as attempts, AVG(percentage) as avg_score, MAX(percentage) as best_score
       FROM exam_attempts WHERE user_id = ? AND status = 'completed' GROUP BY subject`,
      [userId]
    );
    const [recentAttempts] = await pool.query(
      `SELECT id, title, subject, percentage, score, total_questions, correct_answers, time_taken_seconds, completed_at
       FROM exam_attempts WHERE user_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 10`,
      [userId]
    );
    const [weakTopics] = await pool.query(
      `SELECT subject, topic, total_attempted, total_correct, accuracy
       FROM exam_performance WHERE user_id = ? AND accuracy < 60 ORDER BY accuracy ASC LIMIT 10`,
      [userId]
    );
    const [strongTopics] = await pool.query(
      `SELECT subject, topic, total_attempted, total_correct, accuracy
       FROM exam_performance WHERE user_id = ? AND accuracy >= 60 ORDER BY accuracy DESC LIMIT 10`,
      [userId]
    );

    // Exam countdown (Ethiopian national exam typically in July)
    const now = new Date();
    const examDate = new Date(now.getFullYear(), 6, 15); // July 15
    if (examDate < now) examDate.setFullYear(examDate.getFullYear() + 1);
    const daysUntilExam = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));

    return res.json({
      overview: totalAttempts[0],
      bySubject,
      recentAttempts,
      weakTopics,
      strongTopics,
      daysUntilExam,
      examDate: examDate.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

// ── Start an exam attempt ──
const startExam = async (req, res) => {
  const { template_id, subject, type, questionCount } = req.body;
  try {
    let questions = [];
    let title = '';
    let timeLimit = 120;

    if (template_id) {
      // Use existing template
      const [template] = await pool.query('SELECT * FROM exam_templates WHERE id = ?', [template_id]);
      if (template.length === 0) return res.status(404).json({ error: 'Exam not found.' });

      title = template[0].title;
      timeLimit = template[0].time_limit_minutes;

      const [tqs] = await pool.query(
        `SELECT eq.* FROM exam_template_questions etq
         JOIN exam_questions eq ON etq.question_id = eq.id
         WHERE etq.template_id = ? ORDER BY etq.question_order`,
        [template_id]
      );
      questions = tqs;
    } else {
      // Generate random exam
      const count = questionCount || 20;
      timeLimit = Math.ceil(count * 2.5);
      let sql = 'SELECT * FROM exam_questions WHERE 1=1';
      const params = [];

      if (subject) { sql += ' AND subject = ?'; params.push(subject); title = `${subject} Practice`; }
      if (type === 'past_exam') { sql += ' AND is_past_exam = 1'; title += ' (Past Exams)'; }
      if (type === 'predicted') { sql += ' AND is_predicted = 1'; title += ' (Predicted)'; }
      if (!title) title = 'Quick Practice';

      sql += ' ORDER BY RAND() LIMIT ?';
      params.push(count);

      const [qs] = await pool.query(sql, params);
      questions = qs;
    }

    if (questions.length === 0) {
      return res.status(400).json({ error: 'No questions available for this configuration.' });
    }

    // Create attempt
    const [attempt] = await pool.query(
      `INSERT INTO exam_attempts (user_id, template_id, exam_type, subject, title, total_questions, time_limit_seconds, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress')`,
      [req.user.id, template_id || null, type || 'practice', subject || 'Mixed', title, questions.length, timeLimit * 60]
    );

    // Create answer slots
    for (let i = 0; i < questions.length; i++) {
      await pool.query(
        'INSERT INTO exam_answers (attempt_id, question_id, question_order, correct_answer) VALUES (?,?,?,?)',
        [attempt.insertId, questions[i].id, i + 1, questions[i].correct_answer]
      );
    }

    // Return questions WITHOUT correct answers
    const safeQuestions = questions.map((q, i) => ({
      id: q.id,
      order: i + 1,
      question_text: q.question_text,
      question_image: q.question_image,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
    }));

    return res.status(201).json({
      attempt_id: attempt.insertId,
      title,
      total_questions: questions.length,
      time_limit_seconds: timeLimit * 60,
      questions: safeQuestions,
    });
  } catch (error) {
    console.error('Start exam error:', error);
    return res.status(500).json({ error: 'Failed to start exam.' });
  }
};

// ── Save answer ──
const saveAnswer = async (req, res) => {
  const { attempt_id } = req.params;
  const { question_id, selected_answer, time_spent } = req.body;
  try {
    // Verify ownership
    const [att] = await pool.query(
      'SELECT * FROM exam_attempts WHERE id = ? AND user_id = ? AND status = ?',
      [attempt_id, req.user.id, 'in_progress']
    );
    if (att.length === 0) return res.status(404).json({ error: 'Attempt not found.' });

    // Get correct answer
    const [ans] = await pool.query(
      'SELECT * FROM exam_answers WHERE attempt_id = ? AND question_id = ?',
      [attempt_id, question_id]
    );
    if (ans.length === 0) return res.status(404).json({ error: 'Question not in this exam.' });

    const isCorrect = selected_answer === ans[0].correct_answer ? 1 : 0;

    await pool.query(
      `UPDATE exam_answers SET selected_answer = ?, is_correct = ?, time_spent_seconds = ?, answered_at = NOW()
       WHERE attempt_id = ? AND question_id = ?`,
      [selected_answer, isCorrect, time_spent || 0, attempt_id, question_id]
    );

    return res.json({ saved: true });
  } catch (error) {
    console.error('Save answer error:', error);
    return res.status(500).json({ error: 'Failed to save answer.' });
  }
};

// ── Flag/unflag question ──
const toggleFlag = async (req, res) => {
  const { attempt_id } = req.params;
  const { question_id } = req.body;
  try {
    await pool.query(
      'UPDATE exam_answers SET is_flagged = NOT is_flagged WHERE attempt_id = ? AND question_id = ?',
      [attempt_id, question_id]
    );
    return res.json({ toggled: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to toggle flag.' });
  }
};

// ── Submit exam (auto-grade) ──
const submitExam = async (req, res) => {
  const { attempt_id } = req.params;
  const { time_taken } = req.body;
  try {
    const [att] = await pool.query(
      'SELECT * FROM exam_attempts WHERE id = ? AND user_id = ?',
      [attempt_id, req.user.id]
    );
    if (att.length === 0) return res.status(404).json({ error: 'Attempt not found.' });

    // Calculate score
    const [answers] = await pool.query('SELECT * FROM exam_answers WHERE attempt_id = ?', [attempt_id]);
    let correct = 0, wrong = 0, skipped = 0;

    for (const a of answers) {
      if (!a.selected_answer) { skipped++; }
      else if (a.is_correct) { correct++; }
      else { wrong++; }

      // Update question global stats
      await pool.query(
        'UPDATE exam_questions SET times_answered = times_answered + 1, times_correct = times_correct + ? WHERE id = ?',
        [a.is_correct ? 1 : 0, a.question_id]
      );
    }

    const total = att[0].total_questions;
    const percentage = total > 0 ? ((correct / total) * 100).toFixed(2) : 0;

    await pool.query(
      `UPDATE exam_attempts SET correct_answers = ?, wrong_answers = ?, skipped = ?,
       score = ?, percentage = ?, time_taken_seconds = ?, status = 'completed', completed_at = NOW()
       WHERE id = ?`,
      [correct, wrong, skipped, correct, percentage, time_taken || 0, attempt_id]
    );

    // Update per-topic performance
    await updatePerformance(req.user.id, answers);

    // Get detailed results
    const [results] = await pool.query(
      `SELECT ea.*, eq.question_text, eq.option_a, eq.option_b, eq.option_c, eq.option_d,
              eq.explanation, eq.subject, eq.topic, eq.difficulty
       FROM exam_answers ea JOIN exam_questions eq ON ea.question_id = eq.id
       WHERE ea.attempt_id = ? ORDER BY ea.question_order`,
      [attempt_id]
    );

    // Award XP based on performance
    const xpBase = correct * 10; // 10 XP per correct answer
    const pct = parseFloat(percentage);
    const bonusXP = pct === 100 ? 50 : pct >= 80 ? 25 : pct >= 60 ? 10 : 0;
    const totalXP = xpBase + bonusXP;
    if (totalXP > 0) {
      awardXP(req.user.id, totalXP, `Exam: ${att[0].title} (${pct.toFixed(0)}%)`, 'exam', parseInt(attempt_id)).catch(() => {});
    }

    return res.json({
      score: { correct, wrong, skipped, total, percentage: parseFloat(percentage) },
      time_taken: time_taken || 0,
      passed: parseFloat(percentage) >= (att[0].passing_score || 50),
      xp_awarded: totalXP,
      results,
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    return res.status(500).json({ error: 'Failed to submit exam.' });
  }
};

// ── Update per-topic performance analytics ──
const updatePerformance = async (userId, answers) => {
  try {
    for (const ans of answers) {
      if (!ans.selected_answer) continue;
      const [q] = await pool.query('SELECT subject, topic FROM exam_questions WHERE id = ?', [ans.question_id]);
      if (q.length === 0) continue;

      const { subject, topic } = q[0];
      const safeTopic = topic || 'General';

      await pool.query(`
        INSERT INTO exam_performance (user_id, subject, topic, total_attempted, total_correct, accuracy, last_attempted)
        VALUES (?, ?, ?, 1, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          total_attempted = total_attempted + 1,
          total_correct = total_correct + ?,
          accuracy = ((total_correct + ?) / (total_attempted + 1)) * 100,
          last_attempted = NOW()
      `, [userId, subject, safeTopic, ans.is_correct ? 1 : 0, ans.is_correct ? 100 : 0,
          ans.is_correct ? 1 : 0, ans.is_correct ? 1 : 0]);
    }
  } catch (e) {
    console.error('Performance update error:', e.message);
  }
};

// ── Get attempt history ──
const getHistory = async (req, res) => {
  try {
    const [attempts] = await pool.query(
      `SELECT * FROM exam_attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json(attempts);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch history.' });
  }
};

// ── Get attempt detail (review mode) ──
const getAttemptDetail = async (req, res) => {
  const { attempt_id } = req.params;
  try {
    const [att] = await pool.query(
      'SELECT * FROM exam_attempts WHERE id = ? AND user_id = ?',
      [attempt_id, req.user.id]
    );
    if (att.length === 0) return res.status(404).json({ error: 'Attempt not found.' });

    const [results] = await pool.query(
      `SELECT ea.*, eq.question_text, eq.option_a, eq.option_b, eq.option_c, eq.option_d,
              eq.explanation, eq.subject, eq.topic, eq.difficulty, eq.question_image
       FROM exam_answers ea JOIN exam_questions eq ON ea.question_id = eq.id
       WHERE ea.attempt_id = ? ORDER BY ea.question_order`,
      [attempt_id]
    );

    return res.json({ attempt: att[0], results });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch attempt.' });
  }
};

// ── Get question bank (browse) ──
const getQuestionBank = async (req, res) => {
  try {
    const { subject, topic, difficulty, year } = req.query;
    let sql = 'SELECT id, subject, topic, difficulty, question_text, year, is_past_exam, times_answered, times_correct FROM exam_questions WHERE 1=1';
    const params = [];
    if (subject) { sql += ' AND subject = ?'; params.push(subject); }
    if (topic) { sql += ' AND topic = ?'; params.push(topic); }
    if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
    if (year) { sql += ' AND year = ?'; params.push(year); }
    sql += ' ORDER BY subject, topic LIMIT 100';
    const [questions] = await pool.query(sql, params);
    return res.json(questions);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch questions.' });
  }
};

// ── Get available subjects and topics ──
const getSubjectsAndTopics = async (req, res) => {
  try {
    const [subjects] = await pool.query(
      'SELECT DISTINCT subject, COUNT(*) as question_count FROM exam_questions GROUP BY subject ORDER BY subject'
    );
    const [topics] = await pool.query(
      'SELECT DISTINCT subject, topic, COUNT(*) as count FROM exam_questions GROUP BY subject, topic ORDER BY subject, topic'
    );
    const [years] = await pool.query(
      'SELECT DISTINCT year FROM exam_questions WHERE year IS NOT NULL ORDER BY year DESC'
    );
    return res.json({ subjects, topics, years: years.map(y => y.year) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch subjects.' });
  }
};

module.exports = {
  getExams, getExamStats, startExam, saveAnswer, toggleFlag,
  submitExam, getHistory, getAttemptDetail, getQuestionBank, getSubjectsAndTopics,
};
