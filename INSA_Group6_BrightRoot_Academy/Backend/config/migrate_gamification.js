// ============================================
// Migration: Gamification & Motivation System
// ============================================
require('dotenv').config();
const { pool } = require('./database');

const tables = [
  // 1. Student XP & Level
  `CREATE TABLE IF NOT EXISTS student_xp (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    total_xp INT DEFAULT 0,
    level INT DEFAULT 1,
    current_level_xp INT DEFAULT 0,
    next_level_xp INT DEFAULT 100,
    streak_days INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_activity_date DATE NULL,
    title VARCHAR(100) DEFAULT 'Beginner',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // 2. XP Transactions Log
  `CREATE TABLE IF NOT EXISTS xp_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    xp_amount INT NOT NULL,
    reason VARCHAR(200) NOT NULL,
    category ENUM('exam','lesson','streak','badge','challenge','login','other') DEFAULT 'other',
    reference_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
  )`,

  // 3. Badges / Achievements
  `CREATE TABLE IF NOT EXISTS badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#2ecc71',
    category ENUM('academic','streak','social','exam','milestone','special') DEFAULT 'academic',
    xp_reward INT DEFAULT 50,
    condition_type VARCHAR(50) NOT NULL,
    condition_value INT DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 4. Student Earned Badges
  `CREATE TABLE IF NOT EXISTS student_badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_badge (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
  )`,

  // 5. Weekly Challenges
  `CREATE TABLE IF NOT EXISTS weekly_challenges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) DEFAULT 'bi-trophy',
    challenge_type ENUM('exam_score','exam_count','streak','xp','lesson') DEFAULT 'exam_count',
    target_value INT NOT NULL,
    xp_reward INT DEFAULT 200,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_week (week_start, week_end)
  )`,

  // 6. Student Challenge Progress
  `CREATE TABLE IF NOT EXISTS challenge_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    challenge_id INT NOT NULL,
    current_value INT DEFAULT 0,
    is_completed TINYINT(1) DEFAULT 0,
    completed_at TIMESTAMP NULL,
    xp_claimed TINYINT(1) DEFAULT 0,
    UNIQUE KEY unique_user_challenge (user_id, challenge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES weekly_challenges(id) ON DELETE CASCADE
  )`,
];

// Seed badges
const seedBadges = [
  // Streak badges
  { name: 'Early Bird', description: 'Study 3 days in a row', icon: '🌅', color: '#f39c12', category: 'streak', xp_reward: 50, condition_type: 'streak_days', condition_value: 3 },
  { name: 'Week Warrior', description: 'Study 7 days in a row', icon: '🔥', color: '#e74c3c', category: 'streak', xp_reward: 150, condition_type: 'streak_days', condition_value: 7 },
  { name: 'Dedicated Scholar', description: 'Study 14 days in a row', icon: '⚡', color: '#9b59b6', category: 'streak', xp_reward: 300, condition_type: 'streak_days', condition_value: 14 },
  { name: 'Study Machine', description: 'Study 30 days in a row', icon: '🚀', color: '#3498db', category: 'streak', xp_reward: 750, condition_type: 'streak_days', condition_value: 30 },
  // Exam badges
  { name: 'First Step', description: 'Complete your first exam', icon: '🎯', color: '#2ecc71', category: 'exam', xp_reward: 50, condition_type: 'exams_completed', condition_value: 1 },
  { name: 'Quiz Master', description: 'Complete 10 exams', icon: '📝', color: '#1abc9c', category: 'exam', xp_reward: 200, condition_type: 'exams_completed', condition_value: 10 },
  { name: 'Exam Champion', description: 'Complete 50 exams', icon: '🏆', color: '#f1c40f', category: 'exam', xp_reward: 500, condition_type: 'exams_completed', condition_value: 50 },
  { name: 'Perfect Score', description: 'Score 100% on any exam', icon: '⭐', color: '#f1c40f', category: 'exam', xp_reward: 300, condition_type: 'perfect_score', condition_value: 100 },
  { name: 'High Achiever', description: 'Score 90%+ on 5 exams', icon: '💎', color: '#3498db', category: 'exam', xp_reward: 400, condition_type: 'high_scores', condition_value: 5 },
  // Milestone badges
  { name: 'Rising Star', description: 'Reach Level 5', icon: '⭐', color: '#e74c3c', category: 'milestone', xp_reward: 100, condition_type: 'level', condition_value: 5 },
  { name: 'Scholar', description: 'Reach Level 10', icon: '🎓', color: '#9b59b6', category: 'milestone', xp_reward: 250, condition_type: 'level', condition_value: 10 },
  { name: 'XP Hunter', description: 'Earn 1000 total XP', icon: '💰', color: '#f39c12', category: 'milestone', xp_reward: 150, condition_type: 'total_xp', condition_value: 1000 },
  { name: 'XP Legend', description: 'Earn 5000 total XP', icon: '👑', color: '#e74c3c', category: 'milestone', xp_reward: 500, condition_type: 'total_xp', condition_value: 5000 },
  // Subject badges
  { name: 'Math Wizard', description: 'Score 80%+ on 5 Maths exams', icon: '📐', color: '#3498db', category: 'academic', xp_reward: 200, condition_type: 'subject_mastery_maths', condition_value: 5 },
  { name: 'Science Pro', description: 'Score 80%+ on 5 Physics exams', icon: '🔬', color: '#1abc9c', category: 'academic', xp_reward: 200, condition_type: 'subject_mastery_physics', condition_value: 5 },
];

// Seed weekly challenges
const getThisWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 0);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
};

const seedChallenges = () => {
  const { start, end } = getThisWeek();
  return [
    { title: 'Exam Sprint', description: 'Complete 5 practice exams this week', icon: 'bi-lightning-charge', challenge_type: 'exam_count', target_value: 5, xp_reward: 300, week_start: start, week_end: end },
    { title: 'High Scorer', description: 'Score 75% or higher on any exam', icon: 'bi-graph-up-arrow', challenge_type: 'exam_score', target_value: 75, xp_reward: 200, week_start: start, week_end: end },
    { title: 'XP Grind', description: 'Earn 500 XP this week', icon: 'bi-star-fill', challenge_type: 'xp', target_value: 500, xp_reward: 250, week_start: start, week_end: end },
    { title: 'Streak Keeper', description: 'Study 5 days this week', icon: 'bi-fire', challenge_type: 'streak', target_value: 5, xp_reward: 350, week_start: start, week_end: end },
  ];
};

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('🎮 Creating Gamification tables...\n');
    for (const sql of tables) {
      await conn.query(sql);
      const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`   ✅ ${name}`);
    }

    // Seed badges
    const [existingBadges] = await conn.query('SELECT COUNT(*) as c FROM badges');
    if (existingBadges[0].c === 0) {
      for (const b of seedBadges) {
        await conn.query(
          'INSERT INTO badges (name, description, icon, color, category, xp_reward, condition_type, condition_value) VALUES (?,?,?,?,?,?,?,?)',
          [b.name, b.description, b.icon, b.color, b.category, b.xp_reward, b.condition_type, b.condition_value]
        );
      }
      console.log(`\n   ✅ Seeded ${seedBadges.length} badges`);
    }

    // Seed challenges
    const [existingChallenges] = await conn.query('SELECT COUNT(*) as c FROM weekly_challenges');
    if (existingChallenges[0].c === 0) {
      const challenges = seedChallenges();
      for (const c of challenges) {
        await conn.query(
          'INSERT INTO weekly_challenges (title, description, icon, challenge_type, target_value, xp_reward, week_start, week_end) VALUES (?,?,?,?,?,?,?,?)',
          [c.title, c.description, c.icon, c.challenge_type, c.target_value, c.xp_reward, c.week_start, c.week_end]
        );
      }
      console.log(`   ✅ Seeded ${challenges.length} weekly challenges`);
    }

    console.log('\n🎮 Gamification migration complete!\n');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
