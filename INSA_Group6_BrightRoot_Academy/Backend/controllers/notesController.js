// ============================================
// Notes Controller - File Upload & Management
// ============================================
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
require('dotenv').config();

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
  const { subject, grade } = req.query;
  try {
    let query = 'SELECT * FROM uploaded_files WHERE user_id = ?';
    const params = [req.user.id];

    if (subject) {
      query += ' AND subject = ?';
      params.push(subject);
    }
    if (grade) {
      query += ' AND grade = ?';
      params.push(grade);
    }
    
    query += ' ORDER BY uploaded_at DESC';

    const [files] = await pool.query(query, params);
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

    query += ' ORDER BY created_at DESC';

    const [books] = await pool.query(query, params);
    return res.status(200).json(books);
  } catch (error) {
    console.error('Get common books error:', error);
    return res.status(500).json({ error: 'Failed to fetch common books.' });
  }
};

/**
 * DELETE /api/notes/files/:id/
 * Delete a user's uploaded file
 */
const deleteFile = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the file belongs to the user
    const [files] = await pool.query('SELECT * FROM uploaded_files WHERE id = ? AND user_id = ?', [id, req.user.id]);
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found or unauthorized.' });
    }

    const file = files[0];

    // Delete from local file system if it exists
    if (file.file_path && fs.existsSync(file.file_path)) {
      try {
        fs.unlinkSync(file.file_path);
      } catch (err) {
        console.error('Failed to delete file from disk:', err);
      }
    }

    // Delete from database
    await pool.query('DELETE FROM uploaded_files WHERE id = ?', [id]);

    return res.status(200).json({ message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Delete file error:', error);
    return res.status(500).json({ error: 'Failed to delete file.' });
  }
};

/**
 * GET /api/notes/download/:id/
 * Download a file by ID
 */
const downloadFile = async (req, res) => {
  const { id } = req.params;

  try {
    // Check uploaded files first
    let [files] = await pool.query('SELECT * FROM uploaded_files WHERE id = ?', [id]);
    let file = files[0];

    // If not found, check common books
    if (!file) {
      [files] = await pool.query('SELECT * FROM common_books WHERE id = ?', [id]);
      file = files[0];
    }

    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    if (!file.file_path || !fs.existsSync(file.file_path)) {
      return res.status(404).json({ error: 'Physical file not found on server.' });
    }

    res.download(file.file_path, file.file_name || 'download');
  } catch (error) {
    console.error('Download file error:', error);
    return res.status(500).json({ error: 'Failed to download file.' });
  }
};

module.exports = {
  uploadFile,
  getUserFiles,
  getCommonBooks,
  deleteFile,
  downloadFile
};
