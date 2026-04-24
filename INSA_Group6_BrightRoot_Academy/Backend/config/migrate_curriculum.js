// ============================================
// Curriculum Migration - Create All Tables
// ============================================
// Run: node config/migrate_curriculum.js
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

    // ── 1. Curriculum Subjects ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS curriculum_subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(500),
        icon VARCHAR(50) DEFAULT 'bi-book',
        color VARCHAR(20) DEFAULT '#3498db',
        order_index INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "curriculum_subjects" created');

    // ── 2. Curriculum Grades ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS curriculum_grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grade_level INT NOT NULL UNIQUE,
        label VARCHAR(50) NOT NULL,
        description VARCHAR(255),
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "curriculum_grades" created');

    // ── 3. Units ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS curriculum_units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_id INT NOT NULL,
        grade_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        order_index INT DEFAULT 0,
        is_published TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (grade_id) REFERENCES curriculum_grades(id) ON DELETE CASCADE,
        UNIQUE KEY uq_unit (subject_id, grade_id, title(100))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "curriculum_units" created');

    // ── 4. Chapters ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS curriculum_chapters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unit_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        order_index INT DEFAULT 0,
        is_published TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (unit_id) REFERENCES curriculum_units(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "curriculum_chapters" created');

    // ── 5. Lessons ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS curriculum_lessons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chapter_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        explanation LONGTEXT,
        duration_minutes INT DEFAULT 30,
        order_index INT DEFAULT 0,
        is_published TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (chapter_id) REFERENCES curriculum_chapters(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "curriculum_lessons" created');

    // ── 6. Lesson Formulas ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lesson_formulas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        formula_content TEXT NOT NULL,
        explanation TEXT,
        order_index INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "lesson_formulas" created');

    // ── 7. Lesson Diagrams ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lesson_diagrams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        image_url VARCHAR(2048) NOT NULL,
        caption TEXT,
        order_index INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "lesson_diagrams" created');

    // ── 8. Lesson Flashcards ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lesson_flashcards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT NOT NULL,
        front_text TEXT NOT NULL,
        back_text TEXT NOT NULL,
        order_index INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "lesson_flashcards" created');

    // ── 9. Lesson Exercises ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lesson_exercises (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT NOT NULL,
        question TEXT NOT NULL,
        question_type ENUM('MCQ','SHORT_ANSWER','LONG_ANSWER','TRUE_FALSE') DEFAULT 'MCQ',
        options JSON,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        difficulty ENUM('EASY','MEDIUM','HARD') DEFAULT 'MEDIUM',
        order_index INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "lesson_exercises" created');

    // ── 10. Lesson Files ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lesson_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(2048) NOT NULL,
        file_path VARCHAR(500),
        file_type VARCHAR(50),
        description VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "lesson_files" created');

    // ── 11. Lesson Summaries (AI) ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lesson_summaries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT NOT NULL,
        content LONGTEXT NOT NULL,
        generated_by VARCHAR(50) DEFAULT 'gemini',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "lesson_summaries" created');

    // ── 12. Lesson Quizzes (AI) ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lesson_quizzes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT NOT NULL,
        questions JSON NOT NULL,
        num_questions INT DEFAULT 5,
        generated_by VARCHAR(50) DEFAULT 'gemini',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "lesson_quizzes" created');

    // ── 13. Past Exam Questions ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS past_exam_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT NOT NULL,
        exam_year INT NOT NULL,
        question TEXT NOT NULL,
        question_type ENUM('MCQ','SHORT_ANSWER','LONG_ANSWER','TRUE_FALSE') DEFAULT 'MCQ',
        options JSON,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        source VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "past_exam_questions" created');

    // ── 14. User Lesson Progress ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_lesson_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NOT NULL,
        is_completed TINYINT(1) DEFAULT 0,
        progress_percent INT DEFAULT 0,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_lesson (user_id, lesson_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "user_lesson_progress" created');

    console.log('\n🎉 All curriculum tables created successfully!\n');

    // ── SEED DATA ──
    console.log('📦 Seeding initial curriculum data...\n');

    // Seed Subjects
    await connection.query(`
      INSERT IGNORE INTO curriculum_subjects (name, description, icon, color, order_index) VALUES
      ('Maths', 'Algebra, Geometry, Calculus and Problem Solving', 'bi-calculator', '#3498db', 1),
      ('Physics', 'Mechanics, Electricity, Thermodynamics and Optics', 'bi-lightning', '#9b59b6', 2),
      ('Chemistry', 'Organic, Inorganic and Physical Chemistry', 'bi-droplet', '#2ecc71', 3),
      ('Biology', 'Cell Biology, Genetics, Ecology and Human Biology', 'bi-tree', '#f39c12', 4),
      ('English', 'Grammar, Literature, Writing and Comprehension', 'bi-book', '#e74c3c', 5)
    `);
    console.log('✅ Subjects seeded');

    // Seed Grades
    await connection.query(`
      INSERT IGNORE INTO curriculum_grades (grade_level, label, description) VALUES
      (9, 'Grade 9', 'Preparatory - First Year'),
      (10, 'Grade 10', 'Preparatory - Second Year'),
      (11, 'Grade 11', 'Preparatory - Third Year'),
      (12, 'Grade 12', 'Preparatory - Final Year')
    `);
    console.log('✅ Grades seeded');

    // Get subject and grade IDs
    const [subjects] = await connection.query('SELECT id, name FROM curriculum_subjects');
    const [grades] = await connection.query('SELECT id, grade_level FROM curriculum_grades');

    const mathId = subjects.find(s => s.name === 'Maths').id;
    const physicsId = subjects.find(s => s.name === 'Physics').id;
    const chemId = subjects.find(s => s.name === 'Chemistry').id;
    const bioId = subjects.find(s => s.name === 'Biology').id;
    const engId = subjects.find(s => s.name === 'English').id;

    const g9 = grades.find(g => g.grade_level === 9).id;
    const g10 = grades.find(g => g.grade_level === 10).id;

    // Seed sample Units for Grade 9 Maths
    const [unitResult] = await connection.query(`
      INSERT IGNORE INTO curriculum_units (subject_id, grade_id, title, description, order_index) VALUES
      (?, ?, 'Unit 1: Number Systems', 'Understanding rational and irrational numbers, real number system', 1),
      (?, ?, 'Unit 2: Algebra', 'Linear equations, inequalities, and polynomials', 2),
      (?, ?, 'Unit 3: Geometry', 'Basic geometric concepts, triangles, and circles', 3)
    `, [mathId, g9, mathId, g9, mathId, g9]);
    console.log('✅ Sample units seeded (Grade 9 Maths)');

    // Get unit IDs
    const [units] = await connection.query('SELECT id, title FROM curriculum_units WHERE subject_id = ? AND grade_id = ?', [mathId, g9]);

    if (units.length > 0) {
      const unit1Id = units[0].id;

      // Seed sample Chapters for Unit 1
      await connection.query(`
        INSERT IGNORE INTO curriculum_chapters (unit_id, title, description, order_index) VALUES
        (?, 'Chapter 1: Natural Numbers and Integers', 'Properties of natural numbers, integers, and operations', 1),
        (?, 'Chapter 2: Rational Numbers', 'Fractions, decimals, and their properties', 2),
        (?, 'Chapter 3: Irrational Numbers', 'Square roots, cube roots, and irrational numbers', 3)
      `, [unit1Id, unit1Id, unit1Id]);
      console.log('✅ Sample chapters seeded');

      // Get chapter IDs
      const [chapters] = await connection.query('SELECT id, title FROM curriculum_chapters WHERE unit_id = ?', [unit1Id]);

      if (chapters.length > 0) {
        const ch1Id = chapters[0].id;

        // Seed sample Lessons
        await connection.query(`
          INSERT IGNORE INTO curriculum_lessons (chapter_id, title, explanation, duration_minutes, order_index) VALUES
          (?, 'Lesson 1: Introduction to Natural Numbers',
           'Natural numbers are the counting numbers starting from 1, 2, 3, and so on. They are used for counting and ordering.\n\n## Properties of Natural Numbers\n\n1. **Closure Property**: The sum and product of any two natural numbers is always a natural number.\n2. **Commutative Property**: a + b = b + a and a × b = b × a\n3. **Associative Property**: (a + b) + c = a + (b + c)\n4. **Distributive Property**: a × (b + c) = a × b + a × c\n\n## Examples\n\n- The set of natural numbers: N = {1, 2, 3, 4, 5, ...}\n- Zero is NOT a natural number in Ethiopian curriculum\n- Every natural number has a successor',
           25, 1),
          (?, 'Lesson 2: Integers and Their Properties',
           'Integers extend natural numbers to include zero and negative numbers.\n\n## What are Integers?\n\nThe set of integers: Z = {..., -3, -2, -1, 0, 1, 2, 3, ...}\n\n## Properties\n\n1. **Additive Identity**: a + 0 = a\n2. **Additive Inverse**: a + (-a) = 0\n3. **Multiplication by Zero**: a × 0 = 0\n\n## Number Line\n\nIntegers can be represented on a number line where:\n- Positive integers are to the right of zero\n- Negative integers are to the left of zero\n- The distance from zero is called the absolute value',
           30, 2),
          (?, 'Lesson 3: Operations on Integers',
           'Learn how to add, subtract, multiply, and divide integers.\n\n## Addition Rules\n\n- Same sign: Add absolute values, keep the sign\n- Different signs: Subtract smaller from larger, take sign of larger\n\n## Multiplication Rules\n\n- Positive × Positive = Positive\n- Negative × Negative = Positive\n- Positive × Negative = Negative\n\n## Division Rules\n\nSame rules as multiplication for signs.\n\n## Order of Operations (BODMAS)\n\n1. Brackets\n2. Orders (powers)\n3. Division and Multiplication (left to right)\n4. Addition and Subtraction (left to right)',
           35, 3)
        `, [ch1Id, ch1Id, ch1Id]);
        console.log('✅ Sample lessons seeded');

        // Get lesson IDs
        const [lessons] = await connection.query('SELECT id, title FROM curriculum_lessons WHERE chapter_id = ?', [ch1Id]);

        if (lessons.length > 0) {
          const l1Id = lessons[0].id;

          // Seed formulas
          await connection.query(`
            INSERT IGNORE INTO lesson_formulas (lesson_id, title, formula_content, explanation, order_index) VALUES
            (?, 'Commutative Property of Addition', 'a + b = b + a', 'The order of addition does not change the result', 1),
            (?, 'Associative Property of Addition', '(a + b) + c = a + (b + c)', 'Grouping of numbers does not affect the sum', 2),
            (?, 'Distributive Property', 'a × (b + c) = a × b + a × c', 'Multiplication distributes over addition', 3)
          `, [l1Id, l1Id, l1Id]);
          console.log('✅ Sample formulas seeded');

          // Seed flashcards
          await connection.query(`
            INSERT IGNORE INTO lesson_flashcards (lesson_id, front_text, back_text, order_index) VALUES
            (?, 'What are Natural Numbers?', 'Counting numbers starting from 1, 2, 3, ... Used for counting and ordering.', 1),
            (?, 'Is zero a natural number?', 'No. In the Ethiopian curriculum, zero is NOT considered a natural number.', 2),
            (?, 'What is the Closure Property?', 'The sum and product of any two natural numbers is always a natural number.', 3),
            (?, 'What is a successor?', 'The next natural number after a given number. The successor of n is n + 1.', 4)
          `, [l1Id, l1Id, l1Id, l1Id]);
          console.log('✅ Sample flashcards seeded');

          // Seed exercises
          await connection.query(`
            INSERT IGNORE INTO lesson_exercises (lesson_id, question, question_type, options, correct_answer, explanation, difficulty, order_index) VALUES
            (?, 'Which of the following is a natural number?', 'MCQ',
             '${JSON.stringify({"A": "-5", "B": "0", "C": "7", "D": "3.14"})}',
             'C', '7 is a natural number because it is a positive counting number.', 'EASY', 1),
            (?, 'What is the successor of 99?', 'SHORT_ANSWER', NULL,
             '100', 'The successor of any natural number n is n + 1. So successor of 99 = 99 + 1 = 100.', 'EASY', 2),
            (?, 'True or False: The set of natural numbers has a largest element.', 'TRUE_FALSE', NULL,
             'False', 'Natural numbers are infinite. There is no largest natural number.', 'MEDIUM', 3),
            (?, 'Calculate: 15 + 23 using the commutative property to verify your answer.', 'SHORT_ANSWER', NULL,
             '38', '15 + 23 = 38 and 23 + 15 = 38. Both give the same result, verifying the commutative property.', 'EASY', 4)
          `, [l1Id, l1Id, l1Id, l1Id]);
          console.log('✅ Sample exercises seeded');

          // Seed past exam questions
          await connection.query(`
            INSERT IGNORE INTO past_exam_questions (lesson_id, exam_year, question, question_type, options, correct_answer, explanation, source) VALUES
            (?, 2023, 'Which property states that a + b = b + a for natural numbers?', 'MCQ',
             '${JSON.stringify({"A": "Associative", "B": "Commutative", "C": "Distributive", "D": "Identity"})}',
             'B', 'The commutative property of addition states that changing the order of addends does not change the sum.',
             'Grade 9 National Exam 2023'),
            (?, 2022, 'The set of natural numbers is denoted by:', 'MCQ',
             '${JSON.stringify({"A": "Z", "B": "Q", "C": "N", "D": "R"})}',
             'C', 'N represents natural numbers, Z for integers, Q for rationals, R for real numbers.',
             'Grade 9 Regional Exam 2022')
          `, [l1Id, l1Id]);
          console.log('✅ Sample past exam questions seeded');
        }
      }
    }

    // Seed sample units for other subjects too
    await connection.query(`
      INSERT IGNORE INTO curriculum_units (subject_id, grade_id, title, description, order_index) VALUES
      (?, ?, 'Unit 1: Mechanics', 'Motion, forces, and energy', 1),
      (?, ?, 'Unit 2: Heat and Temperature', 'Thermal physics and heat transfer', 2),
      (?, ?, 'Unit 1: Matter and Its Properties', 'States of matter and chemical properties', 1),
      (?, ?, 'Unit 1: Biology of Life', 'Cell biology and organization of life', 1),
      (?, ?, 'Unit 1: Reading and Vocabulary', 'Reading comprehension and vocabulary building', 1)
    `, [physicsId, g9, physicsId, g9, chemId, g9, bioId, g9, engId, g9]);
    console.log('✅ Sample units seeded for other subjects');

    console.log('\n🎉 Curriculum seeding completed!\n');

  } catch (error) {
    console.error('❌ Curriculum migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
};

migrate();
