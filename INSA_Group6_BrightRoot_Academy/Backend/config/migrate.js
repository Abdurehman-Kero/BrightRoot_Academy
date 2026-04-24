// ============================================
// Database Migration - Create All Tables
// ============================================
// Run this script to create the MySQL schema:
//   node config/migrate.js
// ============================================
require('dotenv').config();
const mysql = require('mysql2/promise');

const migrate = async () => {
  let connection;
  try {
    // Handle password: use value from .env, fallback to 'root' (MAMP default)
    const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root';

    // Connect without selecting a database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: dbPassword,
    });

    const dbName = process.env.DB_NAME || 'brightroot_academy';

    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database "${dbName}" ensured`);

    // Switch to the database
    await connection.query(`USE \`${dbName}\``);

    // ── 1. Users Table ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(150) NOT NULL UNIQUE,
        email VARCHAR(254) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(150) DEFAULT '',
        last_name VARCHAR(150) DEFAULT '',
        is_active TINYINT(1) DEFAULT 1,
        is_staff TINYINT(1) DEFAULT 0,
        is_superuser TINYINT(1) DEFAULT 0,
        date_joined DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "users" created');

    // ── 2. Blacklisted Tokens (for logout) ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS blacklisted_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token TEXT NOT NULL,
        blacklisted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_blacklisted_at (blacklisted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "blacklisted_tokens" created');

    // ── 3. Uploaded Files ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        subject ENUM('Maths','Physics','Chemistry','Biology','English') NOT NULL DEFAULT 'Maths',
        grade ENUM('Grade9','Grade10','Grade11','Grade12') NOT NULL DEFAULT 'Grade9',
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(2048) DEFAULT NULL,
        file_path VARCHAR(500) DEFAULT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_title_grade_subject (user_id, title(100), grade, subject),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "uploaded_files" created');

    // ── 4. Summaries ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS summaries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        file_id INT NOT NULL,
        content LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "summaries" created');

    // ── 5. Quizzes ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        file_id INT NOT NULL,
        questions JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "quizzes" created');

    // ── 6. Common Books ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS common_books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject ENUM('Maths','Physics','Chemistry','Biology','English') NOT NULL,
        grade ENUM('Grade9','Grade10','Grade11','Grade12') NOT NULL,
        file_url VARCHAR(2048) NOT NULL,
        description TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "common_books" created');

    // ── 7. AI Requests (logging) ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        request_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "ai_requests" created');

    console.log('\n🎉 All migrations completed successfully!');
    console.log('   Database is ready to use.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
};

migrate();
