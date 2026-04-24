// ============================================
// Migration: Ethiopian National Exam Prep System
// ============================================
require('dotenv').config();
const { pool } = require('./database');

const tables = [
  // 1. Question Bank
  `CREATE TABLE IF NOT EXISTS exam_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject VARCHAR(50) NOT NULL,
    grade INT NOT NULL DEFAULT 12,
    chapter VARCHAR(200),
    topic VARCHAR(200),
    difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
    question_text TEXT NOT NULL,
    question_image VARCHAR(500),
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer ENUM('A','B','C','D') NOT NULL,
    explanation TEXT,
    year INT COMMENT 'Exam year if past exam',
    is_past_exam TINYINT(1) DEFAULT 0,
    is_predicted TINYINT(1) DEFAULT 0,
    tags VARCHAR(500),
    times_answered INT DEFAULT 0,
    times_correct INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_subject (subject),
    INDEX idx_grade (grade),
    INDEX idx_difficulty (difficulty),
    INDEX idx_topic (topic),
    INDEX idx_year (year)
  )`,

  // 2. Exam Templates
  `CREATE TABLE IF NOT EXISTS exam_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    subject VARCHAR(50),
    grade INT DEFAULT 12,
    exam_type ENUM('past_exam','mock','practice','predicted','entrance') NOT NULL DEFAULT 'practice',
    year INT,
    total_questions INT NOT NULL DEFAULT 50,
    time_limit_minutes INT NOT NULL DEFAULT 120,
    passing_score DECIMAL(5,2) DEFAULT 50.00,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_subject (subject),
    INDEX idx_type (exam_type)
  )`,

  // 3. Exam Template Questions (linking table)
  `CREATE TABLE IF NOT EXISTS exam_template_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    question_id INT NOT NULL,
    question_order INT DEFAULT 0,
    FOREIGN KEY (template_id) REFERENCES exam_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
  )`,

  // 4. Student Exam Attempts
  `CREATE TABLE IF NOT EXISTS exam_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    template_id INT,
    exam_type ENUM('past_exam','mock','practice','predicted','entrance') NOT NULL,
    subject VARCHAR(50),
    title VARCHAR(300),
    total_questions INT NOT NULL,
    correct_answers INT DEFAULT 0,
    wrong_answers INT DEFAULT 0,
    skipped INT DEFAULT 0,
    score DECIMAL(5,2) DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    time_taken_seconds INT DEFAULT 0,
    time_limit_seconds INT,
    status ENUM('in_progress','completed','abandoned') DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_subject (subject)
  )`,

  // 5. Individual Answers per Attempt
  `CREATE TABLE IF NOT EXISTS exam_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    question_order INT DEFAULT 0,
    selected_answer ENUM('A','B','C','D') DEFAULT NULL,
    correct_answer ENUM('A','B','C','D') NOT NULL,
    is_correct TINYINT(1) DEFAULT 0,
    is_flagged TINYINT(1) DEFAULT 0,
    time_spent_seconds INT DEFAULT 0,
    answered_at TIMESTAMP NULL,
    FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE,
    INDEX idx_attempt (attempt_id)
  )`,

  // 6. Student Performance Analytics
  `CREATE TABLE IF NOT EXISTS exam_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(200),
    total_attempted INT DEFAULT 0,
    total_correct INT DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0,
    avg_time_per_question DECIMAL(8,2) DEFAULT 0,
    difficulty_level VARCHAR(20),
    last_attempted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_topic (user_id, subject, topic),
    INDEX idx_user_subject (user_id, subject)
  )`,
];

// Seed sample questions for Ethiopian National Exam
const seedQuestions = [
  // ── Mathematics ──
  { subject: 'Maths', grade: 12, topic: 'Algebra', difficulty: 'easy',
    question_text: 'If f(x) = 2x + 3, what is f(5)?',
    option_a: '10', option_b: '13', option_c: '15', option_d: '8',
    correct_answer: 'B', explanation: 'f(5) = 2(5) + 3 = 10 + 3 = 13',
    year: 2023, is_past_exam: 1 },
  { subject: 'Maths', grade: 12, topic: 'Algebra', difficulty: 'medium',
    question_text: 'Solve: 2x² - 5x - 3 = 0. The solutions are:',
    option_a: 'x = 3, x = -1/2', option_b: 'x = -3, x = 1/2', option_c: 'x = 3, x = 1/2', option_d: 'x = -3, x = -1/2',
    correct_answer: 'A', explanation: 'Using the quadratic formula or factoring: 2x² - 5x - 3 = (2x + 1)(x - 3) = 0, so x = 3 or x = -1/2',
    year: 2023, is_past_exam: 1 },
  { subject: 'Maths', grade: 12, topic: 'Calculus', difficulty: 'medium',
    question_text: 'What is the derivative of f(x) = x³ - 4x² + 2x - 1?',
    option_a: '3x² - 8x + 2', option_b: '3x² - 4x + 2', option_c: 'x² - 8x + 2', option_d: '3x³ - 8x² + 2x',
    correct_answer: 'A', explanation: "f'(x) = 3x² - 8x + 2 using the power rule: d/dx(xⁿ) = nxⁿ⁻¹",
    year: 2022, is_past_exam: 1 },
  { subject: 'Maths', grade: 12, topic: 'Trigonometry', difficulty: 'easy',
    question_text: 'What is the value of sin(30°)?',
    option_a: '√3/2', option_b: '1/2', option_c: '√2/2', option_d: '1',
    correct_answer: 'B', explanation: 'sin(30°) = 1/2 is a standard trigonometric value' },
  { subject: 'Maths', grade: 12, topic: 'Calculus', difficulty: 'hard',
    question_text: '∫(2x + 1)/(x² + x + 1) dx = ?',
    option_a: 'ln|x² + x + 1| + C', option_b: '2ln|x² + x + 1| + C', option_c: 'ln|x² + x| + C', option_d: '(x² + x + 1)² + C',
    correct_answer: 'A', explanation: 'Notice that d/dx(x² + x + 1) = 2x + 1, so ∫(2x+1)/(x²+x+1)dx = ln|x²+x+1| + C',
    year: 2024, is_past_exam: 1 },
  { subject: 'Maths', grade: 12, topic: 'Statistics', difficulty: 'easy',
    question_text: 'The mean of 3, 7, 5, 9, 6 is:',
    option_a: '5', option_b: '6', option_c: '7', option_d: '8',
    correct_answer: 'B', explanation: 'Mean = (3+7+5+9+6)/5 = 30/5 = 6' },
  { subject: 'Maths', grade: 12, topic: 'Geometry', difficulty: 'medium',
    question_text: 'The area of a circle with radius 7 cm is approximately:',
    option_a: '44 cm²', option_b: '154 cm²', option_c: '22 cm²', option_d: '308 cm²',
    correct_answer: 'B', explanation: 'Area = πr² = π(7)² = 49π ≈ 153.94 ≈ 154 cm²' },

  // ── Physics ──
  { subject: 'Physics', grade: 12, topic: 'Mechanics', difficulty: 'easy',
    question_text: "According to Newton's second law, F = ma. If m = 5 kg and a = 3 m/s², what is F?",
    option_a: '8 N', option_b: '15 N', option_c: '2 N', option_d: '1.67 N',
    correct_answer: 'B', explanation: 'F = ma = 5 × 3 = 15 N',
    year: 2023, is_past_exam: 1 },
  { subject: 'Physics', grade: 12, topic: 'Mechanics', difficulty: 'medium',
    question_text: 'A ball is thrown vertically upward with initial velocity 20 m/s. Maximum height reached is: (g=10 m/s²)',
    option_a: '10 m', option_b: '20 m', option_c: '40 m', option_d: '200 m',
    correct_answer: 'B', explanation: 'At max height, v=0. Using v²=u²-2gh: 0=400-20h, h=20m' },
  { subject: 'Physics', grade: 12, topic: 'Electricity', difficulty: 'medium',
    question_text: 'The resistance of a conductor is 10Ω and current is 2A. The voltage across it is:',
    option_a: '5 V', option_b: '12 V', option_c: '20 V', option_d: '0.2 V',
    correct_answer: 'C', explanation: 'V = IR = 2 × 10 = 20V (Ohm\'s Law)',
    year: 2022, is_past_exam: 1 },
  { subject: 'Physics', grade: 12, topic: 'Waves', difficulty: 'easy',
    question_text: 'The speed of light in vacuum is approximately:',
    option_a: '3 × 10⁶ m/s', option_b: '3 × 10⁸ m/s', option_c: '3 × 10¹⁰ m/s', option_d: '3 × 10⁴ m/s',
    correct_answer: 'B', explanation: 'The speed of light c ≈ 3 × 10⁸ m/s' },
  { subject: 'Physics', grade: 12, topic: 'Thermodynamics', difficulty: 'hard',
    question_text: 'The efficiency of a Carnot engine operating between 600K and 300K is:',
    option_a: '25%', option_b: '50%', option_c: '75%', option_d: '100%',
    correct_answer: 'B', explanation: 'η = 1 - T_cold/T_hot = 1 - 300/600 = 0.5 = 50%',
    year: 2024, is_past_exam: 1 },

  // ── Chemistry ──
  { subject: 'Chemistry', grade: 12, topic: 'Atomic Structure', difficulty: 'easy',
    question_text: 'The atomic number of Carbon is:',
    option_a: '4', option_b: '6', option_c: '8', option_d: '12',
    correct_answer: 'B', explanation: 'Carbon has 6 protons, so its atomic number is 6',
    year: 2023, is_past_exam: 1 },
  { subject: 'Chemistry', grade: 12, topic: 'Chemical Bonding', difficulty: 'medium',
    question_text: 'Which type of bond is formed between Na and Cl in NaCl?',
    option_a: 'Covalent', option_b: 'Ionic', option_c: 'Metallic', option_d: 'Hydrogen',
    correct_answer: 'B', explanation: 'Na (metal) transfers an electron to Cl (non-metal), forming an ionic bond' },
  { subject: 'Chemistry', grade: 12, topic: 'Organic Chemistry', difficulty: 'medium',
    question_text: 'The IUPAC name of CH₃CH₂OH is:',
    option_a: 'Methanol', option_b: 'Ethanol', option_c: 'Propanol', option_d: 'Butanol',
    correct_answer: 'B', explanation: 'CH₃CH₂OH has 2 carbons (eth-) with an -OH group (-ol), so it is Ethanol',
    year: 2022, is_past_exam: 1 },
  { subject: 'Chemistry', grade: 12, topic: 'Equilibrium', difficulty: 'hard',
    question_text: 'For the reaction 2NO₂ ⇌ N₂O₄, if Kc = 4.0 and [NO₂] = 0.5M, then [N₂O₄] is:',
    option_a: '0.5 M', option_b: '1.0 M', option_c: '2.0 M', option_d: '4.0 M',
    correct_answer: 'B', explanation: 'Kc = [N₂O₄]/[NO₂]² = [N₂O₄]/(0.5)² = 4.0, so [N₂O₄] = 4.0 × 0.25 = 1.0 M' },

  // ── Biology ──
  { subject: 'Biology', grade: 12, topic: 'Cell Biology', difficulty: 'easy',
    question_text: 'Which organelle is called the "powerhouse of the cell"?',
    option_a: 'Nucleus', option_b: 'Ribosome', option_c: 'Mitochondria', option_d: 'Golgi body',
    correct_answer: 'C', explanation: 'Mitochondria produce ATP through cellular respiration, earning the nickname "powerhouse of the cell"',
    year: 2023, is_past_exam: 1 },
  { subject: 'Biology', grade: 12, topic: 'Genetics', difficulty: 'medium',
    question_text: 'In Mendelian genetics, if both parents are Tt (heterozygous), what fraction of offspring will be homozygous recessive?',
    option_a: '1/4', option_b: '1/2', option_c: '3/4', option_d: '1/3',
    correct_answer: 'A', explanation: 'Punnett square: TT, Tt, Tt, tt → 1/4 are tt (homozygous recessive)' },
  { subject: 'Biology', grade: 12, topic: 'Evolution', difficulty: 'medium',
    question_text: "Darwin's theory of evolution is based on:",
    option_a: 'Inheritance of acquired characters', option_b: 'Natural selection', option_c: 'Mutation theory', option_d: 'Lamarckism',
    correct_answer: 'B', explanation: "Darwin's theory is based on natural selection — survival of the fittest",
    year: 2024, is_past_exam: 1 },
  { subject: 'Biology', grade: 12, topic: 'Ecology', difficulty: 'easy',
    question_text: 'The process by which plants make food using sunlight is called:',
    option_a: 'Respiration', option_b: 'Fermentation', option_c: 'Photosynthesis', option_d: 'Transpiration',
    correct_answer: 'C', explanation: 'Photosynthesis: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂' },

  // ── English ──
  { subject: 'English', grade: 12, topic: 'Grammar', difficulty: 'easy',
    question_text: 'Choose the correct sentence:',
    option_a: 'She don\'t like coffee', option_b: 'She doesn\'t likes coffee', option_c: 'She doesn\'t like coffee', option_d: 'She not like coffee',
    correct_answer: 'C', explanation: 'Third person singular uses "doesn\'t" + base form of verb' },
  { subject: 'English', grade: 12, topic: 'Vocabulary', difficulty: 'medium',
    question_text: 'The word "ubiquitous" means:',
    option_a: 'Rare', option_b: 'Present everywhere', option_c: 'Unknown', option_d: 'Ancient',
    correct_answer: 'B', explanation: 'Ubiquitous means present, appearing, or found everywhere',
    year: 2023, is_past_exam: 1 },
];

// Seed exam templates
const seedTemplates = [
  { title: 'Ethiopian National Exam 2024 - Mathematics', subject: 'Maths', exam_type: 'past_exam', year: 2024, total_questions: 7, time_limit_minutes: 120 },
  { title: 'Ethiopian National Exam 2023 - Physics', subject: 'Physics', exam_type: 'past_exam', year: 2023, total_questions: 5, time_limit_minutes: 120 },
  { title: 'Maths Mock Exam - Grade 12', subject: 'Maths', exam_type: 'mock', total_questions: 7, time_limit_minutes: 90 },
  { title: 'Physics Mock Exam - Grade 12', subject: 'Physics', exam_type: 'mock', total_questions: 5, time_limit_minutes: 90 },
  { title: 'Chemistry Practice Test', subject: 'Chemistry', exam_type: 'practice', total_questions: 4, time_limit_minutes: 60 },
  { title: 'Biology Practice Test', subject: 'Biology', exam_type: 'practice', total_questions: 4, time_limit_minutes: 60 },
  { title: 'University Entrance Mock Exam', subject: null, exam_type: 'entrance', total_questions: 25, time_limit_minutes: 180 },
];

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('🎓 Creating Exam Prep tables...\n');
    for (const sql of tables) {
      await conn.query(sql);
      const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`   ✅ ${name}`);
    }

    // Seed questions
    console.log('\n📝 Seeding exam questions...');
    const [existing] = await conn.query('SELECT COUNT(*) as c FROM exam_questions');
    if (existing[0].c === 0) {
      for (const q of seedQuestions) {
        await conn.query(
          `INSERT INTO exam_questions (subject, grade, topic, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, year, is_past_exam)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [q.subject, q.grade, q.topic, q.difficulty, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation, q.year || null, q.is_past_exam || 0]
        );
      }
      console.log(`   ✅ Seeded ${seedQuestions.length} questions`);

      // Seed templates
      for (const t of seedTemplates) {
        const [result] = await conn.query(
          'INSERT INTO exam_templates (title, subject, exam_type, year, total_questions, time_limit_minutes) VALUES (?,?,?,?,?,?)',
          [t.title, t.subject, t.exam_type, t.year || null, t.total_questions, t.time_limit_minutes]
        );

        // Link questions to template
        const subject = t.subject;
        if (subject) {
          const [questions] = await conn.query(
            'SELECT id FROM exam_questions WHERE subject = ? ORDER BY RAND() LIMIT ?',
            [subject, t.total_questions]
          );
          for (let i = 0; i < questions.length; i++) {
            await conn.query(
              'INSERT INTO exam_template_questions (template_id, question_id, question_order) VALUES (?,?,?)',
              [result.insertId, questions[i].id, i + 1]
            );
          }
        } else {
          // Entrance exam: mix all subjects
          const [questions] = await conn.query('SELECT id FROM exam_questions ORDER BY RAND() LIMIT ?', [t.total_questions]);
          for (let i = 0; i < questions.length; i++) {
            await conn.query(
              'INSERT INTO exam_template_questions (template_id, question_id, question_order) VALUES (?,?,?)',
              [result.insertId, questions[i].id, i + 1]
            );
          }
        }
      }
      console.log(`   ✅ Seeded ${seedTemplates.length} exam templates`);
    } else {
      console.log('   ⏭️  Questions already seeded, skipping');
    }

    console.log('\n🎓 Exam Prep migration complete!\n');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
