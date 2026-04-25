// ============================================
// Curriculum Controller - Browse & Read
// ============================================
const { pool } = require('../config/database');

/**
 * GET /api/curriculum/subjects/
 */
const getSubjects = async (req, res) => {
  try {
    const [subjects] = await pool.query(
      'SELECT * FROM curriculum_subjects WHERE is_active = 1 ORDER BY order_index'
    );
    return res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    return res.status(500).json({ error: 'Failed to fetch subjects.' });
  }
};

/**
 * GET /api/curriculum/grades/
 */
const getGrades = async (req, res) => {
  try {
    const [grades] = await pool.query(
      'SELECT * FROM curriculum_grades WHERE is_active = 1 ORDER BY grade_level'
    );
    return res.json(grades);
  } catch (error) {
    console.error('Get grades error:', error);
    return res.status(500).json({ error: 'Failed to fetch grades.' });
  }
};

/**
 * GET /api/curriculum/units/?subject_id=&grade_id=
 */
const getUnits = async (req, res) => {
  const { subject_id, grade_id } = req.query;
  try {
    let query = 'SELECT u.*, s.name as subject_name, g.label as grade_label FROM curriculum_units u JOIN curriculum_subjects s ON u.subject_id = s.id JOIN curriculum_grades g ON u.grade_id = g.id WHERE u.is_published = 1';
    const params = [];

    if (subject_id) { query += ' AND u.subject_id = ?'; params.push(subject_id); }
    if (grade_id) { query += ' AND u.grade_id = ?'; params.push(grade_id); }

    query += ' ORDER BY u.order_index';
    const [units] = await pool.query(query, params);

    // Get chapter count for each unit
    for (const unit of units) {
      const [count] = await pool.query('SELECT COUNT(*) as count FROM curriculum_chapters WHERE unit_id = ?', [unit.id]);
      unit.chapter_count = count[0].count;
    }

    return res.json(units);
  } catch (error) {
    console.error('Get units error:', error);
    return res.status(500).json({ error: 'Failed to fetch units.' });
  }
};

/**
 * GET /api/curriculum/chapters/?unit_id=
 */
const getChapters = async (req, res) => {
  const { unit_id } = req.query;
  try {
    let query = 'SELECT c.*, u.title as unit_title FROM curriculum_chapters c JOIN curriculum_units u ON c.unit_id = u.id WHERE c.is_published = 1';
    const params = [];

    if (unit_id) { query += ' AND c.unit_id = ?'; params.push(unit_id); }

    query += ' ORDER BY c.order_index';
    const [chapters] = await pool.query(query, params);

    // Get lesson count for each chapter
    for (const ch of chapters) {
      const [count] = await pool.query('SELECT COUNT(*) as count FROM curriculum_lessons WHERE chapter_id = ?', [ch.id]);
      ch.lesson_count = count[0].count;
    }

    return res.json(chapters);
  } catch (error) {
    console.error('Get chapters error:', error);
    return res.status(500).json({ error: 'Failed to fetch chapters.' });
  }
};

/**
 * GET /api/curriculum/lessons/?chapter_id=
 */
const getLessons = async (req, res) => {
  const { chapter_id } = req.query;
  try {
    let query = 'SELECT l.id, l.chapter_id, l.title, l.duration_minutes, l.order_index, l.is_published, l.created_at FROM curriculum_lessons l WHERE l.is_published = 1';
    const params = [];

    if (chapter_id) { query += ' AND l.chapter_id = ?'; params.push(chapter_id); }

    query += ' ORDER BY l.order_index';
    const [lessons] = await pool.query(query, params);

    return res.json(lessons);
  } catch (error) {
    console.error('Get lessons error:', error);
    return res.status(500).json({ error: 'Failed to fetch lessons.' });
  }
};

/**
 * GET /api/curriculum/lessons/:id/
 * Full lesson with all content
 */
const getLessonDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const [lessons] = await pool.query(`
      SELECT l.*, c.title as chapter_title, c.unit_id,
             u.title as unit_title, u.subject_id, u.grade_id,
             s.name as subject_name, g.label as grade_label
      FROM curriculum_lessons l
      JOIN curriculum_chapters c ON l.chapter_id = c.id
      JOIN curriculum_units u ON c.unit_id = u.id
      JOIN curriculum_subjects s ON u.subject_id = s.id
      JOIN curriculum_grades g ON u.grade_id = g.id
      WHERE l.id = ?
    `, [id]);

    if (lessons.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const lesson = lessons[0];

    // Fetch all related content in parallel
    const [formulas] = await pool.query('SELECT * FROM lesson_formulas WHERE lesson_id = ? ORDER BY order_index', [id]);
    const [diagrams] = await pool.query('SELECT * FROM lesson_diagrams WHERE lesson_id = ? ORDER BY order_index', [id]);
    const [flashcards] = await pool.query('SELECT * FROM lesson_flashcards WHERE lesson_id = ? ORDER BY order_index', [id]);
    const [exercises] = await pool.query('SELECT * FROM lesson_exercises WHERE lesson_id = ? ORDER BY order_index', [id]);
    const [files] = await pool.query('SELECT * FROM lesson_files WHERE lesson_id = ? ORDER BY created_at', [id]);
    const [summaries] = await pool.query('SELECT * FROM lesson_summaries WHERE lesson_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
    const [quizzes] = await pool.query('SELECT * FROM lesson_quizzes WHERE lesson_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
    const [examQuestions] = await pool.query('SELECT * FROM past_exam_questions WHERE lesson_id = ? ORDER BY exam_year DESC', [id]);

    // Parse JSON fields
    exercises.forEach(ex => {
      if (typeof ex.options === 'string') ex.options = JSON.parse(ex.options);
    });
    examQuestions.forEach(eq => {
      if (typeof eq.options === 'string') eq.options = JSON.parse(eq.options);
    });
    quizzes.forEach(q => {
      if (typeof q.questions === 'string') q.questions = JSON.parse(q.questions);
    });

    // Get user progress if authenticated
    let progress = null;
    if (req.user) {
      const [prog] = await pool.query(
        'SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?',
        [req.user.id, id]
      );
      progress = prog.length > 0 ? prog[0] : null;

      // Update last_accessed
      if (progress) {
        await pool.query('UPDATE user_lesson_progress SET last_accessed = NOW() WHERE id = ?', [progress.id]);
      } else {
        await pool.query(
          'INSERT INTO user_lesson_progress (user_id, lesson_id, progress_percent) VALUES (?, ?, 0)',
          [req.user.id, id]
        );
      }
    }

    // Get prev/next lesson
    const [prevLesson] = await pool.query(
      'SELECT id, title FROM curriculum_lessons WHERE chapter_id = ? AND order_index < ? ORDER BY order_index DESC LIMIT 1',
      [lesson.chapter_id, lesson.order_index]
    );
    const [nextLesson] = await pool.query(
      'SELECT id, title FROM curriculum_lessons WHERE chapter_id = ? AND order_index > ? ORDER BY order_index ASC LIMIT 1',
      [lesson.chapter_id, lesson.order_index]
    );

    return res.json({
      ...lesson,
      formulas,
      diagrams,
      flashcards,
      exercises,
      files,
      summary: summaries.length > 0 ? summaries[0] : null,
      quiz: quizzes.length > 0 ? quizzes[0] : null,
      past_exam_questions: examQuestions,
      progress,
      prev_lesson: prevLesson.length > 0 ? prevLesson[0] : null,
      next_lesson: nextLesson.length > 0 ? nextLesson[0] : null,
    });
  } catch (error) {
    console.error('Get lesson detail error:', error);
    return res.status(500).json({ error: 'Failed to fetch lesson.' });
  }
};

/**
 * GET /api/curriculum/sidebar/?subject_id=&grade_id=
 * Full sidebar navigation tree
 */
const getSidebar = async (req, res) => {
  const { subject_id, grade_id } = req.query;

  if (!subject_id || !grade_id) {
    return res.status(400).json({ error: 'subject_id and grade_id are required.' });
  }

  try {
    const [units] = await pool.query(
      'SELECT * FROM curriculum_units WHERE subject_id = ? AND grade_id = ? AND is_published = 1 ORDER BY order_index',
      [subject_id, grade_id]
    );

    const tree = [];
    for (const unit of units) {
      const [chapters] = await pool.query(
        'SELECT * FROM curriculum_chapters WHERE unit_id = ? AND is_published = 1 ORDER BY order_index',
        [unit.id]
      );

      const chapterTree = [];
      for (const chapter of chapters) {
        const [lessons] = await pool.query(
          'SELECT id, title, duration_minutes, order_index FROM curriculum_lessons WHERE chapter_id = ? AND is_published = 1 ORDER BY order_index',
          [chapter.id]
        );

        // Get progress for each lesson if user is authenticated
        if (req.user) {
          for (const lesson of lessons) {
            const [prog] = await pool.query(
              'SELECT is_completed, progress_percent FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?',
              [req.user.id, lesson.id]
            );
            lesson.is_completed = prog.length > 0 ? prog[0].is_completed : 0;
            lesson.progress_percent = prog.length > 0 ? prog[0].progress_percent : 0;
          }
        }

        chapterTree.push({ ...chapter, lessons });
      }

      tree.push({ ...unit, chapters: chapterTree });
    }

    return res.json(tree);
  } catch (error) {
    console.error('Get sidebar error:', error);
    return res.status(500).json({ error: 'Failed to fetch sidebar.' });
  }
};

/**
 * POST /api/curriculum/progress/
 * Mark a lesson as completed or update progress
 */
const updateProgress = async (req, res) => {
  const { lesson_id, is_completed, progress_percent } = req.body;

  if (!lesson_id) {
    return res.status(400).json({ error: 'lesson_id is required.' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?',
      [req.user.id, lesson_id]
    );

    if (existing.length > 0) {
      const updates = [];
      const values = [];

      if (is_completed !== undefined) {
        updates.push('is_completed = ?');
        values.push(is_completed ? 1 : 0);
        if (is_completed) {
          updates.push('completed_at = NOW()');
          updates.push('progress_percent = 100');
        }
      }

      if (progress_percent !== undefined && !is_completed) {
        updates.push('progress_percent = ?');
        values.push(progress_percent);
      }

      updates.push('last_accessed = NOW()');
      values.push(req.user.id, lesson_id);

      await pool.query(
        `UPDATE user_lesson_progress SET ${updates.join(', ')} WHERE user_id = ? AND lesson_id = ?`,
        values
      );
    } else {
      await pool.query(
        'INSERT INTO user_lesson_progress (user_id, lesson_id, is_completed, progress_percent, completed_at) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, lesson_id, is_completed ? 1 : 0, is_completed ? 100 : (progress_percent || 0), is_completed ? new Date() : null]
      );
    }

    const [updated] = await pool.query(
      'SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?',
      [req.user.id, lesson_id]
    );

    return res.json({ message: 'Progress updated.', progress: updated[0] });
  } catch (error) {
    console.error('Update progress error:', error);
    return res.status(500).json({ error: 'Failed to update progress.' });
  }
};

/**
 * GET /api/curriculum/progress/
 * Get all progress for current user
 */
const getUserProgress = async (req, res) => {
  const { subject_id, grade_id } = req.query;

  try {
    let query = `
      SELECT ulp.*, l.title as lesson_title, l.chapter_id,
             c.title as chapter_title, c.unit_id,
             u.title as unit_title, u.subject_id, u.grade_id
      FROM user_lesson_progress ulp
      JOIN curriculum_lessons l ON ulp.lesson_id = l.id
      JOIN curriculum_chapters c ON l.chapter_id = c.id
      JOIN curriculum_units u ON c.unit_id = u.id
      WHERE ulp.user_id = ?
    `;
    const params = [req.user.id];

    if (subject_id) { query += ' AND u.subject_id = ?'; params.push(subject_id); }
    if (grade_id) { query += ' AND u.grade_id = ?'; params.push(grade_id); }

    query += ' ORDER BY ulp.last_accessed DESC';

    const [progress] = await pool.query(query, params);

    // Calculate summary stats
    let totalLessons = 0;
    let completedLessons = 0;

    if (subject_id && grade_id) {
      const [total] = await pool.query(`
        SELECT COUNT(*) as count FROM curriculum_lessons l
        JOIN curriculum_chapters c ON l.chapter_id = c.id
        JOIN curriculum_units u ON c.unit_id = u.id
        WHERE u.subject_id = ? AND u.grade_id = ? AND l.is_published = 1
      `, [subject_id, grade_id]);
      totalLessons = total[0].count;

      const [completed] = await pool.query(`
        SELECT COUNT(*) as count FROM user_lesson_progress ulp
        JOIN curriculum_lessons l ON ulp.lesson_id = l.id
        JOIN curriculum_chapters c ON l.chapter_id = c.id
        JOIN curriculum_units u ON c.unit_id = u.id
        WHERE ulp.user_id = ? AND u.subject_id = ? AND u.grade_id = ? AND ulp.is_completed = 1
      `, [req.user.id, subject_id, grade_id]);
      completedLessons = completed[0].count;
    }

    return res.json({
      progress,
      stats: {
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        completion_percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Get progress error:', error);
    return res.status(500).json({ error: 'Failed to fetch progress.' });
  }
};

/**
 * POST /api/curriculum/lessons/:id/generate-summary/
 * Generate AI summary for a lesson
 */
const generateLessonSummary = async (req, res) => {
  const { id } = req.params;

  try {
    const [lessons] = await pool.query('SELECT * FROM curriculum_lessons WHERE id = ?', [id]);
    if (lessons.length === 0) return res.status(404).json({ error: 'Lesson not found.' });

    const lesson = lessons[0];
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Gather all lesson content
    const [formulas] = await pool.query('SELECT * FROM lesson_formulas WHERE lesson_id = ?', [id]);
    const formulaText = formulas.map(f => `${f.title}: ${f.formula_content}`).join('\n');

    const prompt = `Summarize this lesson for Ethiopian high school students:\n\nTitle: ${lesson.title}\n\nContent:\n${lesson.explanation}\n\nFormulas:\n${formulaText}\n\nProvide:\n1. A concise summary (2-3 paragraphs)\n2. Key concepts\n3. Important formulas\n4. Study tips`;

    const result = await model.generateContent(prompt);
    const summaryContent = result.response.text();

    // Save or update summary
    const [existing] = await pool.query('SELECT id FROM lesson_summaries WHERE lesson_id = ?', [id]);
    if (existing.length > 0) {
      await pool.query('UPDATE lesson_summaries SET content = ?, updated_at = NOW() WHERE lesson_id = ?', [summaryContent, id]);
    } else {
      await pool.query('INSERT INTO lesson_summaries (lesson_id, content) VALUES (?, ?)', [id, summaryContent]);
    }

    return res.json({ summary: summaryContent, message: 'Summary generated.' });
  } catch (error) {
    console.error('Generate lesson summary error:', error);
    return res.status(500).json({ error: `Failed to generate summary: ${error.message}` });
  }
};

/**
 * POST /api/curriculum/lessons/:id/generate-quiz/
 */
const generateLessonQuiz = async (req, res) => {
  const { id } = req.params;
  const { num_questions = 5 } = req.body;

  try {
    const [lessons] = await pool.query('SELECT * FROM curriculum_lessons WHERE id = ?', [id]);
    if (lessons.length === 0) return res.status(404).json({ error: 'Lesson not found.' });

    const lesson = lessons[0];
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Create a ${num_questions}-question quiz for this lesson:\n\nTitle: ${lesson.title}\nContent: ${lesson.explanation}\n\nReturn ONLY a JSON object:\n{"questions":[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct_answer":"A","explanation":"..."}]}`;

    const result = await model.generateContent(prompt);
    let quizData;
    try {
      const cleaned = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      quizData = JSON.parse(cleaned);
    } catch {
      quizData = { questions: [] };
    }

    await pool.query(
      'INSERT INTO lesson_quizzes (lesson_id, questions, num_questions) VALUES (?, ?, ?)',
      [id, JSON.stringify(quizData), num_questions]
    );

    return res.json({ quiz: quizData, message: 'Quiz generated.' });
  } catch (error) {
    console.error('Generate lesson quiz error:', error);
    return res.status(500).json({ error: `Failed to generate quiz: ${error.message}` });
  }
};

module.exports = {
  getSubjects, getGrades, getUnits, getChapters, getLessons,
  getLessonDetail, getSidebar, updateProgress, getUserProgress,
  generateLessonSummary, generateLessonQuiz,
};
