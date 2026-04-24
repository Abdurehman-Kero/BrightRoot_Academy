// ============================================
// AI Tutor Migration - Chat & Memory Tables
// ============================================
// Run: node config/migrate_tutor.js
// ============================================
require('dotenv').config();
const mysql = require('mysql2/promise');

const migrate = async () => {
  let connection;
  try {
    const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root';
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: dbPassword,
      database: process.env.DB_NAME || 'brightroot_academy',
    });

    console.log('🔗 Connected to database\n');

    // ── 1. AI Conversations ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) DEFAULT 'New Chat',
        subject VARCHAR(100),
        grade VARCHAR(50),
        language VARCHAR(20) DEFAULT 'en',
        is_active TINYINT(1) DEFAULT 1,
        message_count INT DEFAULT 0,
        total_tokens INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_active (user_id, is_active),
        INDEX idx_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "ai_conversations" created');

    // ── 2. AI Messages ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        role ENUM('user','assistant','system') NOT NULL,
        content LONGTEXT NOT NULL,
        image_url VARCHAR(2048),
        tokens_used INT DEFAULT 0,
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
        INDEX idx_conversation (conversation_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "ai_messages" created');

    // ── 3. AI Student Memory ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_student_memory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        memory_type ENUM('strength','weakness','preference','note','topic_history') NOT NULL,
        subject VARCHAR(100),
        content TEXT NOT NULL,
        confidence FLOAT DEFAULT 0.5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_type (user_id, memory_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "ai_student_memory" created');

    // ── 4. AI Suggested Questions ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_suggested_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        question TEXT NOT NULL,
        is_used TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "ai_suggested_questions" created');

    console.log('\n🎉 AI Tutor tables created successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
};

migrate();
