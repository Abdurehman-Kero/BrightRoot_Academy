// ============================================
// AI Tutor Controller - Gemini-Powered Tutor
// ============================================
const { pool } = require('../config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Retry helper — fail FAST on quota/key errors, 1 quick retry on transient errors ──
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const withRetry = async (fn, maxRetries = 1) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const msg = error.message || '';
      const isQuotaError = msg.includes('429') || msg.includes('quota') ||
                           msg.includes('RATE_LIMIT') || msg.includes('Too Many Requests') ||
                           msg.includes('API_KEY_INVALID') || msg.includes('API key not valid');
      // Quota / key errors: throw immediately — retrying won't help
      if (isQuotaError) throw error;
      // Transient errors: one quick retry after 1s
      if (attempt < maxRetries) {
        console.log(`⚡ Transient error, retrying in 1s (attempt ${attempt + 1})...`);
        await sleep(1000);
        continue;
      }
      throw error;
    }
  }
};

// ── System prompt builder ──
const buildSystemPrompt = (subject, grade, language, memory = []) => {
  const lang = language === 'am' ? 'Amharic' : 'English';
  const memoryContext = memory.length > 0
    ? `\n\nStudent Profile:\n${memory.map(m => `- ${m.memory_type}: ${m.content}`).join('\n')}`
    : '';

  return `You are BrightRoot AI Tutor, a friendly and expert teacher for Ethiopian high school students.

CORE RULES:
1. Respond in ${lang}. If asked to switch language, do so.
2. You specialize in: ${subject || 'all subjects'} for ${grade || 'Grades 9-12'}.
3. Follow the Ethiopian Ministry of Education curriculum.
4. Provide step-by-step explanations.
5. Use mathematical notation with LaTeX: wrap inline math with $...$, display math with $$...$$
6. Be encouraging, patient, and supportive.
7. When showing formulas, explain each variable.
8. Suggest follow-up questions at the end of your responses.
9. If the student uploads an image or document, analyze it carefully (handwritten work, textbook page, diagram).
10. For wrong answers, explain WHY it's wrong before showing the correct approach.
11. Never give direct answers to homework - guide the student to solve it themselves.
12. If a quiz is requested, generate high-quality multiple-choice questions based on the material.
FORMAT RULES:
13. IMPORTANT: If the prompt includes a "[Context: I am reading a document titled...]" block, DO NOT claim you cannot see files. You must act as if you can see it and answer the question based on the document. I will attach the document file to the request directly.
- Use **bold** for key terms
- Use bullet points for lists
- Use numbered steps for solutions
- Use > blockquotes for important notes
- Use \`code\` for mathematical expressions when LaTeX is complex
- End responses with 2-3 suggested follow-up questions under "💡 **Want to explore more?**"
${memoryContext}`;
};

// ── Create new conversation ──
const createConversation = async (req, res) => {
  const { subject, grade, language, title } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO ai_conversations (user_id, title, subject, grade, language) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, title || `${subject || 'General'} Chat`, subject || null, grade || null, language || 'en']
    );

    // Insert system message
    const systemPrompt = buildSystemPrompt(subject, grade, language);
    await pool.query(
      'INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [result.insertId, 'system', systemPrompt]
    );

    const [conv] = await pool.query('SELECT * FROM ai_conversations WHERE id = ?', [result.insertId]);
    return res.status(201).json(conv[0]);
  } catch (error) {
    console.error('Create conversation error:', error);
    return res.status(500).json({ error: 'Failed to create conversation.' });
  }
};

// ── Get user conversations ──
const getConversations = async (req, res) => {
  try {
    const [conversations] = await pool.query(
      `SELECT id, title, subject, grade, language, message_count, updated_at, created_at
       FROM ai_conversations WHERE user_id = ? AND is_active = 1
       ORDER BY updated_at DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
};

// ── Get conversation messages ──
const getMessages = async (req, res) => {
  const { id } = req.params;
  try {
    const [conv] = await pool.query(
      'SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (conv.length === 0) return res.status(404).json({ error: 'Conversation not found.' });

    const [messages] = await pool.query(
      "SELECT id, role, content, image_url, created_at FROM ai_messages WHERE conversation_id = ? AND role != 'system' ORDER BY created_at ASC",
      [id]
    );

    // Get suggestions
    const [suggestions] = await pool.query(
      'SELECT id, question FROM ai_suggested_questions WHERE conversation_id = ? AND is_used = 0 ORDER BY created_at DESC LIMIT 3',
      [id]
    );

    return res.json({ conversation: conv[0], messages, suggestions });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
};

// ── Send message (with streaming via SSE) ──
const sendMessage = async (req, res) => {
  const { id } = req.params;
  const message = req.body.message || req.body.text || '';
  const hasImage = !!req.file;

  if (!message && !hasImage) {
    return res.status(400).json({ error: 'Message or image is required.' });
  }

  try {
    // Verify conversation ownership
    const [conv] = await pool.query(
      'SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (conv.length === 0) return res.status(404).json({ error: 'Conversation not found.' });

    const conversation = conv[0];

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/tutor/${req.file.filename}`;
    }

    // Save user message
    await pool.query(
      'INSERT INTO ai_messages (conversation_id, role, content, image_url) VALUES (?, ?, ?, ?)',
      [id, 'user', message || '[Image uploaded]', imageUrl]
    );

    // Get conversation history (last 20 messages for context)
    const [history] = await pool.query(
      'SELECT role, content, image_url FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [id]
    );

    // Get student memory
    const [memory] = await pool.query(
      'SELECT memory_type, content FROM ai_student_memory WHERE user_id = ? ORDER BY updated_at DESC LIMIT 10',
      [req.user.id]
    );

    // Build messages for Gemini
    const systemPrompt = buildSystemPrompt(
      conversation.subject, conversation.grade, conversation.language, memory
    );

    // Prepare chat history for Gemini
    const chatHistory = [];
    for (const msg of history) {
      if (msg.role === 'system') continue;
      chatHistory.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Remove the last user message (we'll send it separately)
    const lastUserMsg = chatHistory.pop();

    // Set up streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let model;
    let userParts = [];

    // Handle image if present
    if (req.file) {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/jpeg';

      userParts = [
        { text: `${systemPrompt}\n\n${message || 'Please analyze this image and help me understand it.'}` },
        { inlineData: { data: base64Image, mimeType } },
      ];
    } else {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      // Use chat mode for conversation continuity
      if (chatHistory.length > 0) {
        try {
          const chat = model.startChat({
            history: [
              { role: 'user', parts: [{ text: 'Please follow these instructions: ' + systemPrompt }] },
              { role: 'model', parts: [{ text: 'I understand. I will follow these instructions as the BrightRoot AI Tutor.' }] },
              ...chatHistory,
            ],
          });

          res.write(`data: ${JSON.stringify({ type: 'chunk', content: '' })}\n\n`); // keepalive
          const result = await withRetry(() => chat.sendMessageStream(message));
          let fullResponse = '';

          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              fullResponse += text;
              res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
            }
          }

          // Save assistant response
          await pool.query(
            'INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)',
            [id, 'assistant', fullResponse]
          );

          // Update conversation
          await pool.query(
            'UPDATE ai_conversations SET message_count = message_count + 2, updated_at = NOW() WHERE id = ?',
            [id]
          );

          // Auto-generate title if first message
          if (conversation.message_count === 0) {
            const titlePrompt = `Generate a very short title (max 6 words) for a conversation that starts with: "${message}". Return ONLY the title, no quotes.`;
            try {
              const titleResult = await model.generateContent(titlePrompt);
              const newTitle = titleResult.response.text().trim().substring(0, 100);
              await pool.query('UPDATE ai_conversations SET title = ? WHERE id = ?', [newTitle, id]);
              res.write(`data: ${JSON.stringify({ type: 'title', content: newTitle })}\n\n`);
            } catch {}
          }

          // Extract follow-up suggestions
          const suggestions = extractSuggestions(fullResponse);
          if (suggestions.length > 0) {
            // Clear old suggestions
            await pool.query('DELETE FROM ai_suggested_questions WHERE conversation_id = ?', [id]);
            for (const q of suggestions) {
              await pool.query(
                'INSERT INTO ai_suggested_questions (conversation_id, question) VALUES (?, ?)',
                [id, q]
              );
            }
            res.write(`data: ${JSON.stringify({ type: 'suggestions', content: suggestions })}\n\n`);
          }

          // Update student memory based on conversation
          await updateStudentMemory(req.user.id, message, fullResponse, conversation.subject);

          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          return res.end();
        } catch (chatError) {
          const chatMsg = chatError.message || '';
          const isQuota = chatMsg.includes('429') || chatMsg.includes('quota') ||
                          chatMsg.includes('RATE_LIMIT') || chatMsg.includes('Too Many Requests') ||
                          chatMsg.includes('API_KEY_INVALID') || chatMsg.includes('API key not valid');
          // Quota/key errors: re-throw immediately so outer catch handles it properly
          if (isQuota) throw chatError;
          // Only fall through to non-chat mode for genuine transient errors
          console.error('Chat mode transient error, falling back to non-chat:', chatMsg.substring(0, 100));
        }
      }

      // Fallback: non-chat mode
      userParts = [{ text: `${systemPrompt}\n\nStudent: ${message}` }];
    }

    // Generate response (non-chat or image mode)
    res.write(`data: ${JSON.stringify({ type: 'chunk', content: '' })}\n\n`); // keepalive
    const result = await withRetry(() => model.generateContentStream({ contents: [{ parts: userParts }] }));
    let fullResponse = '';

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
      }
    }

    // Save response
    await pool.query(
      'INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [id, 'assistant', fullResponse]
    );

    await pool.query(
      'UPDATE ai_conversations SET message_count = message_count + 2, updated_at = NOW() WHERE id = ?',
      [id]
    );

    // Title generation for first message
    if (conversation.message_count === 0) {
      try {
        const titleResult = await model.generateContent(
          `Generate a very short title (max 6 words) for: "${message}". Return ONLY the title.`
        );
        const newTitle = titleResult.response.text().trim().substring(0, 100);
        await pool.query('UPDATE ai_conversations SET title = ? WHERE id = ?', [newTitle, id]);
        res.write(`data: ${JSON.stringify({ type: 'title', content: newTitle })}\n\n`);
      } catch {}
    }

    const suggestions = extractSuggestions(fullResponse);
    if (suggestions.length > 0) {
      await pool.query('DELETE FROM ai_suggested_questions WHERE conversation_id = ?', [id]);
      for (const q of suggestions) {
        await pool.query('INSERT INTO ai_suggested_questions (conversation_id, question) VALUES (?, ?)', [id, q]);
      }
      res.write(`data: ${JSON.stringify({ type: 'suggestions', content: suggestions })}\n\n`);
    }

    await updateStudentMemory(req.user.id, message, fullResponse, conversation.subject);

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Send message error:', error);
    const errMsg = error.message || '';
    let userMessage = errMsg;
    let eventType = 'error';
    
    if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
      userMessage = 'The Gemini API key is not valid. Please update GEMINI_API_KEY in Backend/.env with a valid key from https://aistudio.google.com/app/apikey';
      eventType = 'quota_error';
    } else if (errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('RATE_LIMIT') || errMsg.includes('Too Many Requests')) {
      userMessage = 'Gemini API free-tier quota exceeded. Get a new API key at https://aistudio.google.com/app/apikey and update GEMINI_API_KEY in Backend/.env';
      eventType = 'quota_error';
    }
    
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: `⚠️ ${userMessage}` })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: eventType, content: userMessage })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      return res.end();
    }
    res.write(`data: ${JSON.stringify({ type: eventType, content: userMessage })}\n\n`);
    res.end();
  }
};

// ── Extract follow-up suggestions ──
const extractSuggestions = (text) => {
  const suggestions = [];
  const lines = text.split('\n');
  let inSuggestions = false;

  for (const line of lines) {
    if (line.includes('Want to explore') || line.includes('Try asking') || line.includes('Follow-up')) {
      inSuggestions = true;
      continue;
    }
    if (inSuggestions) {
      const match = line.match(/^[\s-*•\d.]+(.+?)[\s?]*$/);
      if (match && match[1].trim().length > 5) {
        suggestions.push(match[1].trim().replace(/\?$/, '') + '?');
      }
    }
  }

  return suggestions.slice(0, 3);
};

// ── Update student memory ──
const updateStudentMemory = async (userId, question, answer, subject) => {
  try {
    // Save topic history
    const topicSummary = question.substring(0, 200);
    await pool.query(
      'INSERT INTO ai_student_memory (user_id, memory_type, subject, content) VALUES (?, ?, ?, ?)',
      [userId, 'topic_history', subject || 'General', topicSummary]
    );

    // Keep only last 20 topic histories per user
    await pool.query(`
      DELETE FROM ai_student_memory WHERE user_id = ? AND memory_type = 'topic_history'
      AND id NOT IN (
        SELECT id FROM (
          SELECT id FROM ai_student_memory WHERE user_id = ? AND memory_type = 'topic_history'
          ORDER BY created_at DESC LIMIT 20
        ) as recent
      )
    `, [userId, userId]);
  } catch (error) {
    console.error('Memory update error:', error.message);
  }
};

// ── Delete conversation ──
const deleteConversation = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE ai_conversations SET is_active = 0 WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    return res.json({ message: 'Conversation deleted.' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return res.status(500).json({ error: 'Failed to delete conversation.' });
  }
};

// ── Rename conversation ──
const renameConversation = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  try {
    await pool.query(
      'UPDATE ai_conversations SET title = ? WHERE id = ? AND user_id = ?',
      [title, id, req.user.id]
    );
    return res.json({ message: 'Renamed.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to rename.' });
  }
};

// ── Get student memory ──
const getStudentMemory = async (req, res) => {
  try {
    const [memory] = await pool.query(
      'SELECT * FROM ai_student_memory WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.id]
    );
    return res.json(memory);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch memory.' });
  }
};

const generateQuiz = async (req, res) => {
  const { topic, subject, grade, instructions } = req.body;
  let textContent = topic || "";

  try {
    if (req.file) {
      const filePath = req.file.path;
      // Handle huge files by limiting the read size or being more selective
      // For now, let's extract text and let the prompt handle instructions
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        textContent = data.text;
      } else {
        textContent = fs.readFileSync(filePath, 'utf8');
      }
      
      // Safety: Truncate very large text to avoid token limits, 
      // but keep enough for the instruction to work.
      if (textContent.length > 50000) {
        textContent = textContent.substring(0, 50000) + "... [Text Truncated]";
      }
    }

    if (!textContent && !topic) {
      return res.status(400).json({ error: 'Please provide a topic or upload a file to generate a quiz.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    
    const prompt = `Generate a high-quality quiz for an Ethiopian student in ${grade || 'High School'} studying ${subject || 'this topic'}.
    ${instructions ? `SPECIAL INSTRUCTIONS: ${instructions}` : ''}
    
    Based on the following content, create 5-10 Multiple Choice Questions (MCQs).
    Content:
    ${textContent}

    Return ONLY a JSON array of objects with this format:
    [
      {
        "id": 1,
        "question": "The question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": "The exact string from options that is correct",
        "explanation": "Brief explanation why it's correct"
      }
    ]`;

    const result = await withRetry(() => model.generateContent(prompt));
    const response = result.response.text();
    
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to generate a valid quiz format. Please try again with a clearer topic.");
    }

    const quiz = JSON.parse(jsonMatch[0]);

    // PERSISTENCE: Save to database
    const [dbResult] = await pool.query(
      'INSERT INTO ai_tutor_quizzes (user_id, topic, subject, grade, questions) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, topic || req.file?.originalname || "General Quiz", subject || null, grade || null, JSON.stringify(quiz)]
    );

    return res.json({ 
      quiz, 
      id: dbResult.insertId,
      message: "Quiz generated and saved successfully!" 
    });
  } catch (error) {
    console.error('Generate quiz error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate quiz.' });
  }
};

const getQuizzes = async (req, res) => {
  try {
    const [quizzes] = await pool.query(
      'SELECT id, topic, subject, grade, questions, created_at FROM ai_tutor_quizzes WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    // Parse questions back to JSON
    quizzes.forEach(q => {
      if (typeof q.questions === 'string') q.questions = JSON.parse(q.questions);
    });
    return res.json(quizzes);
  } catch (error) {
    console.error('Get quizzes error:', error);
    return res.status(500).json({ error: 'Failed to fetch quizzes.' });
  }
};

const deleteQuiz = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'DELETE FROM ai_tutor_quizzes WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Quiz not found or not owned by you.' });
    }
    return res.json({ message: 'Quiz deleted successfully.' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    return res.status(500).json({ error: 'Failed to delete quiz.' });
  }
};

module.exports = {
  createConversation, getConversations, getMessages,
  sendMessage, deleteConversation, renameConversation, getStudentMemory,
  generateQuiz, getQuizzes, deleteQuiz
};
