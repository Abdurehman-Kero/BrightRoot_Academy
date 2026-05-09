// ============================================
// AI Services Controller - Gemini Integration
// ============================================
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/ai/summary/generate/
 * Generate a summary for an uploaded file using Gemini
 */
const generateSummary = async (req, res) => {
  const { file_id } = req.body;

  if (!file_id) {
    return res.status(400).json({ error: 'File ID is required' });
  }

  try {
    // Fetch the uploaded file (must belong to current user)
    const [files] = await pool.query(
      'SELECT * FROM uploaded_files WHERE id = ? AND user_id = ?',
      [file_id, req.user.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileObj = files[0];

    // Generate summary using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Check if real file exists
    let filePart = null;
    let fileContent = `Content from ${fileObj.title} - ${fileObj.subject} for ${fileObj.grade}`;
    
    if (fileObj.file_path && fs.existsSync(fileObj.file_path)) {
      try {
        const ext = path.extname(fileObj.file_name).toLowerCase();
        let mimeType = 'application/pdf';
        if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.txt') mimeType = 'text/plain';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else mimeType = 'application/pdf'; // Default fallback
        
        const fileData = fs.readFileSync(fileObj.file_path).toString('base64');
        filePart = {
          inlineData: {
            data: fileData,
            mimeType: mimeType
          }
        };
        fileContent = '[File Content Attached]';
      } catch (err) {
        console.error('Error reading file for Gemini:', err);
      }
    }

    const prompt = `
      Please provide a comprehensive, highly engaging summary of the attached educational document:
      
      Subject: ${fileObj.subject}
      Grade: ${fileObj.grade}
      Title: ${fileObj.title}
      
      Your goal is to create the ultimate last-minute Exam Preparation guide that is incredibly easy to memorize.
      DO NOT generate a boring wall of text. Use extremely visual Markdown formatting!
      
      Include the following sections with exact Markdown headings:
      
      ### 📝 The Core Idea
      Provide a concise, 1-2 paragraph intuitive summary of the main topic.
      
      ### 🎯 Key Bullet Points
      List the absolute most important facts using bullet points `-`. Use **bold text** to highlight keywords.
      
      ### 🧠 Memorization Hacks (Mnemonics)
      Provide clever memory hooks, acronyms, or analogies to help the student easily remember the core concepts for their exam.
      
      ### 📐 Formulas & Definitions
      Use Markdown tables or blockquotes for clear, scannable definitions and formulas. If there's math, use LaTeX ($...).
      
      Make it fun to read, deeply relevant to ${fileObj.subject}, and visually perfectly structured!
    `;

    const contents = filePart 
      ? [{ role: 'user', parts: [{ text: prompt }, filePart] }]
      : [{ role: 'user', parts: [{ text: prompt + "\n\nFallback description: " + fileContent }] }];

    const result = await model.generateContent({ contents });
    const summaryContent = result.response.text();

    // Save summary to database
    const [insertResult] = await pool.query(
      'INSERT INTO summaries (user_id, file_id, content) VALUES (?, ?, ?)',
      [req.user.id, file_id, summaryContent]
    );

    // Log AI request
    await pool.query(
      'INSERT INTO ai_requests (user_id, request_type, content, response) VALUES (?, ?, ?, ?)',
      [req.user.id, 'summary', fileContent.substring(0, 500), summaryContent.substring(0, 500)]
    );

    return res.status(200).json({
      summary: summaryContent,
      summary_id: insertResult.insertId,
      message: 'Summary generated successfully',
    });
  } catch (error) {
    console.error('Generate summary error:', error);
    return res.status(500).json({ error: `Failed to generate summary: ${error.message}` });
  }
};

/**
 * POST /api/ai/quiz/generate/
 * Generate a quiz for an uploaded file using Gemini
 */
const generateQuiz = async (req, res) => {
  const { file_id, num_questions = 5 } = req.body;

  if (!file_id) {
    return res.status(400).json({ error: 'File ID is required' });
  }

  try {
    const [files] = await pool.query(
      'SELECT * FROM uploaded_files WHERE id = ? AND user_id = ?',
      [file_id, req.user.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileObj = files[0];

    // Generate quiz using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    let filePart = null;
    let fileContent = `Content from ${fileObj.title} - ${fileObj.subject} for ${fileObj.grade}`;
    
    if (fileObj.file_path && fs.existsSync(fileObj.file_path)) {
      try {
        const ext = path.extname(fileObj.file_name).toLowerCase();
        let mimeType = 'application/pdf';
        if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.txt') mimeType = 'text/plain';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else mimeType = 'application/pdf';
        
        const fileData = fs.readFileSync(fileObj.file_path).toString('base64');
        filePart = {
          inlineData: {
            data: fileData,
            mimeType: mimeType
          }
        };
        fileContent = '[File Content Attached]';
      } catch (err) {
        console.error('Error reading file for Gemini:', err);
      }
    }

    const prompt = `
      Please create a ${num_questions}-question quiz based on the attached educational document:
      
      Subject: ${fileObj.subject}
      Grade: ${fileObj.grade}
      Title: ${fileObj.title}
      
      Please provide:
      1. ${num_questions} multiple choice questions
      2. 4 answer choices for each question (A, B, C, D)
      3. The correct answer for each question
      4. A brief explanation for each correct answer
      
      Format the response as a JSON object with this structure:
      {
          "questions": [
              {
                  "question": "Question text here?",
                  "options": {
                      "A": "Option A",
                      "B": "Option B",
                      "C": "Option C",
                      "D": "Option D"
                  },
                  "correct_answer": "A",
                  "explanation": "Explanation of why this is correct"
              }
          ]
      }
      
      Make sure the questions are appropriate for the grade level and subject.
      Return ONLY the JSON object, no additional text.
    `;

    const contents = filePart 
      ? [{ role: 'user', parts: [{ text: prompt }, filePart] }]
      : [{ role: 'user', parts: [{ text: prompt + "\n\nFallback content: " + fileContent }] }];

    const result = await model.generateContent({ contents });
    const quizContent = result.response.text();

    // Try to parse the response as JSON
    let quizData;
    try {
      // Clean markdown code fences if present
      const cleaned = quizContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      quizData = JSON.parse(cleaned);
    } catch {
      // If parsing fails, create a simple fallback structure
      quizData = {
        questions: [
          {
            question: 'Sample question based on the content?',
            options: {
              A: 'Option A',
              B: 'Option B',
              C: 'Option C',
              D: 'Option D',
            },
            correct_answer: 'A',
            explanation: 'This is a sample explanation',
          },
        ],
      };
    }

    // Save quiz to database
    const [insertResult] = await pool.query(
      'INSERT INTO quizzes (user_id, file_id, questions) VALUES (?, ?, ?)',
      [req.user.id, file_id, JSON.stringify(quizData)]
    );

    // Log AI request
    await pool.query(
      'INSERT INTO ai_requests (user_id, request_type, content, response) VALUES (?, ?, ?, ?)',
      [req.user.id, 'quiz', fileContent.substring(0, 500), JSON.stringify(quizData).substring(0, 500)]
    );

    return res.status(200).json({
      quiz: quizData,
      quiz_id: insertResult.insertId,
      message: 'Quiz generated successfully',
    });
  } catch (error) {
    console.error('Generate quiz error:', error);
    return res.status(500).json({ error: `Failed to generate quiz: ${error.message}` });
  }
};

/**
 * GET /api/ai/summaries/
 * Get all summaries for the current user
 */
const getUserSummaries = async (req, res) => {
  try {
    const [summaries] = await pool.query(
      `SELECT s.id, s.content, s.created_at,
              f.title AS file_title, f.subject, f.grade
       FROM summaries s
       JOIN uploaded_files f ON s.file_id = f.id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json(summaries);
  } catch (error) {
    console.error('Get summaries error:', error);
    return res.status(500).json({ error: 'Failed to fetch summaries.' });
  }
};

/**
 * GET /api/ai/quizzes/
 * Get all quizzes for the current user
 */
const getUserQuizzes = async (req, res) => {
  try {
    const [quizzes] = await pool.query(
      `SELECT q.id, q.questions, q.created_at,
              f.title AS file_title, f.subject, f.grade
       FROM quizzes q
       JOIN uploaded_files f ON q.file_id = f.id
       WHERE q.user_id = ?
       ORDER BY q.created_at DESC`,
      [req.user.id]
    );

    // Parse questions JSON if stored as string
    const parsed = quizzes.map((q) => ({
      ...q,
      questions: typeof q.questions === 'string' ? JSON.parse(q.questions) : q.questions,
    }));

    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Get quizzes error:', error);
    return res.status(500).json({ error: 'Failed to fetch quizzes.' });
  }
};

module.exports = {
  generateSummary,
  generateQuiz,
  getUserSummaries,
  getUserQuizzes,
};
