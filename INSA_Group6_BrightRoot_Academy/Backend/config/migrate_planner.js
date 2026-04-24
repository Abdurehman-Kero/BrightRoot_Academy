// ============================================
// Migration: AI Study Planner System
// ============================================
require('dotenv').config();
const { pool } = require('./database');

const tables = [
  // 1. Upcoming exams the student registers
  `CREATE TABLE IF NOT EXISTS student_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    exam_date DATE NOT NULL,
    exam_name VARCHAR(200),
    grade INT DEFAULT 12,
    priority ENUM('low','medium','high','critical') DEFAULT 'high',
    notes TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, exam_date)
  )`,

  // 2. AI-generated study plans
  `CREATE TABLE IF NOT EXISTS study_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    plan_start DATE NOT NULL,
    plan_end DATE NOT NULL,
    ai_generated TINYINT(1) DEFAULT 1,
    total_hours DECIMAL(5,1) DEFAULT 0,
    status ENUM('active','completed','paused') DEFAULT 'active',
    ai_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
  )`,

  // 3. Individual study sessions (daily schedule items)
  `CREATE TABLE IF NOT EXISTS study_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_id INT NOT NULL,
    user_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(200),
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL,
    session_type ENUM('study','review','practice','rest') DEFAULT 'study',
    priority ENUM('low','medium','high') DEFAULT 'medium',
    is_completed TINYINT(1) DEFAULT 0,
    actual_duration INT DEFAULT 0,
    notes TEXT,
    ai_tip TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, session_date),
    INDEX idx_plan (plan_id)
  )`,

  // 4. Study reminders
  `CREATE TABLE IF NOT EXISTS study_reminders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id INT,
    message VARCHAR(300) NOT NULL,
    remind_at DATETIME NOT NULL,
    is_sent TINYINT(1) DEFAULT 0,
    is_dismissed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_remind (user_id, remind_at, is_sent)
  )`,
];

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('📅 Creating Study Planner tables...\n');
    for (const sql of tables) {
      await conn.query(sql);
      const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`   ✅ ${name}`);
    }
    console.log('\n📅 Study Planner migration complete!\n');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
