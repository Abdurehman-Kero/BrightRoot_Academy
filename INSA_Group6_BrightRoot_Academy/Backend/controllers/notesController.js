// ============================================
// Notes Controller - File Upload & Management
// ============================================
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
require('dotenv').config();

const VALID_SUBJECTS = ['Maths', 'Physics', 'Chemistry', 'Biology', 'English'];
const VALID_GRADES = ['Grade9', 'Grade10', 'Grade11', 'Grade12'];

/**
 * POST /api/notes/upload/
 * Upload a file with metadata
 */
const uploadFile = async (req, res) => {
  const file = req.file;
  const { title, description, subject, grade } = req.body;

  // Validation
  if (!file || !title || !subject || !grade) {
    return res.status(400).json({ error: 'File, title, subject, and grade are required.' });
  }

  if (!VALID_SUBJECTS.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject.' });
  }

  if (!VALID_GRADES.includes(grade)) {
    return res.status(400).json({ error: 'Invalid grade.' });
  }

  try {
    // Build the file URL (local storage instead of Supabase)
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

    // Save metadata in DB
    const [result] = await pool.query(
      `INSERT INTO uploaded_files (user_id, title, description, subject, grade, file_name, file_url, file_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title,
        description || '',
        subject,
        grade,
        file.originalname,
        fileUrl,
        file.path,
      ]
    );

    // Fetch the created record
    const [files] = await pool.query('SELECT * FROM uploaded_files WHERE id = ?', [result.insertId]);

    return res.status(201).json(files[0]);
  } catch (error) {
    console.error('File upload error:', error);

    // Clean up uploaded file on error
    if (file && file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A file with this title, grade, and subject already exists.' });
    }

    return res.status(500).json({ error: `Server error when saving file: ${error.message}` });
  }
};

/**
 * GET /api/notes/files/
 * Get all files uploaded by the current user
 */
const getUserFiles = async (req, res) => {
  try {
    const [files] = await pool.query(
      'SELECT * FROM uploaded_files WHERE user_id = ? ORDER BY uploaded_at DESC',
      [req.user.id]
    );
    return res.status(200).json(files);
  } catch (error) {
    console.error('Get user files error:', error);
    return res.status(500).json({ error: 'Failed to fetch files.' });
  }
};

/**
 * GET /api/notes/common-books/
 * Get common books, optionally filtered by subject and grade
 */
const getCommonBooks = async (req, res) => {
  const { subject, grade } = req.query;

  try {
    let query = 'SELECT * FROM common_books WHERE is_active = 1';
    const params = [];

    if (subject) {
      query += ' AND subject = ?';
      params.push(subject);
    }

    if (grade) {
      query += ' AND grade = ?';
      params.push(grade);
    }

    query += ' ORDER BY uploaded_at DESC';

    const [books] = await pool.query(query, params);
    return res.status(200).json(books);
  } catch (error) {
    console.error('Get common books error:', error);
    return res.status(500).json({ error: 'Failed to fetch common books.' });
  }
};

/**
 * GET /api/notes/download/:fileId/
 * Download a file by ID
 */
const downloadFile = async (req, res) => {
  const { fileId } = req.params;

  try {
    const [files] = await pool.query('SELECT * FROM uploaded_files WHERE id = ?', [fileId]);

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const fileObj = files[0];

    // If we have a local file path, serve it directly
    if (fileObj.file_path && fs.existsSync(fileObj.file_path)) {
      return res.download(fileObj.file_path, fileObj.file_name);
    }

    // If we have a URL but no local path, redirect
    if (fileObj.file_url) {
      return res.redirect(fileObj.file_url);
    }

    return res.status(404).json({ error: 'File not found on storage.' });
  } catch (error) {
    console.error('Download file error:', error);
    return res.status(500).json({ error: 'Failed to download file.' });
  }
};

module.exports = {
  uploadFile,
  getUserFiles,
  getCommonBooks,
  downloadFile,
};
