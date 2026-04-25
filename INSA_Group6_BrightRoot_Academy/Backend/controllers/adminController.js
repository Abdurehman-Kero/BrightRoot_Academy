// ============================================
// Admin Controller - CRUD Content Management
// ============================================
const { pool } = require('../config/database');

// ── Generic CRUD helper ──
const crudFor = (table, idField = 'id') => ({
  create: async (req, res) => {
    try {
      const fields = Object.keys(req.body);
      const values = Object.values(req.body);
      const placeholders = fields.map(() => '?').join(', ');
      const [result] = await pool.query(
        `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`, values
      );
      const [created] = await pool.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [result.insertId]);
      return res.status(201).json(created[0]);
    } catch (error) {
      console.error(`Create ${table} error:`, error);
      if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Duplicate entry.' });
      return res.status(500).json({ error: `Failed to create ${table}.` });
    }
  },
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const fields = Object.keys(req.body);
      const values = Object.values(req.body);
      if (fields.length === 0) return res.status(400).json({ error: 'No fields to update.' });
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      values.push(id);
      await pool.query(`UPDATE ${table} SET ${setClause} WHERE ${idField} = ?`, values);
      const [updated] = await pool.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id]);
      if (updated.length === 0) return res.status(404).json({ error: 'Not found.' });
      return res.json(updated[0]);
    } catch (error) {
      console.error(`Update ${table} error:`, error);
      return res.status(500).json({ error: `Failed to update ${table}.` });
    }
  },
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await pool.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id]);
      if (existing.length === 0) return res.status(404).json({ error: 'Not found.' });
      await pool.query(`DELETE FROM ${table} WHERE ${idField} = ?`, [id]);
      return res.json({ message: 'Deleted successfully.' });
    } catch (error) {
      console.error(`Delete ${table} error:`, error);
      return res.status(500).json({ error: `Failed to delete ${table}.` });
    }
  },
  getAll: async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY ${idField} DESC`);
      return res.json(rows);
    } catch (error) {
      console.error(`Get all ${table} error:`, error);
      return res.status(500).json({ error: `Failed to fetch ${table}.` });
    }
  },
  getOne: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found.' });
      return res.json(rows[0]);
    } catch (error) {
      console.error(`Get ${table} error:`, error);
      return res.status(500).json({ error: `Failed to fetch ${table}.` });
    }
  },
});

// Export CRUD handlers for each content type
module.exports = {
  units: crudFor('curriculum_units'),
  chapters: crudFor('curriculum_chapters'),
  lessons: crudFor('curriculum_lessons'),
  formulas: crudFor('lesson_formulas'),
  diagrams: crudFor('lesson_diagrams'),
  flashcards: crudFor('lesson_flashcards'),
  exercises: crudFor('lesson_exercises'),
  lessonFiles: crudFor('lesson_files'),
  examQuestions: crudFor('past_exam_questions'),

  // Dashboard stats
  getDashboardStats: async (req, res) => {
    try {
      const [subjects] = await pool.query('SELECT COUNT(*) as count FROM curriculum_subjects');
      const [units] = await pool.query('SELECT COUNT(*) as count FROM curriculum_units');
      const [chapters] = await pool.query('SELECT COUNT(*) as count FROM curriculum_chapters');
      const [lessons] = await pool.query('SELECT COUNT(*) as count FROM curriculum_lessons');
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
      const [exercises] = await pool.query('SELECT COUNT(*) as count FROM lesson_exercises');
      const [flashcards] = await pool.query('SELECT COUNT(*) as count FROM lesson_flashcards');

      return res.json({
        subjects: subjects[0].count,
        units: units[0].count,
        chapters: chapters[0].count,
        lessons: lessons[0].count,
        users: users[0].count,
        exercises: exercises[0].count,
        flashcards: flashcards[0].count,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return res.status(500).json({ error: 'Failed to fetch stats.' });
    }
  },
};
