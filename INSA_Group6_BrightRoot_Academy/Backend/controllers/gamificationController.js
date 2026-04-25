// ============================================
// Gamification Controller - XP, Badges, Streaks
// ============================================
const { pool } = require('../config/database');

// ── Level config ──
const LEVELS = [
  { level: 1,  title: 'Beginner',        xp_needed: 0    },
  { level: 2,  title: 'Curious Learner', xp_needed: 100  },
  { level: 3,  title: 'Explorer',        xp_needed: 250  },
  { level: 4,  title: 'Student',         xp_needed: 500  },
  { level: 5,  title: 'Rising Star',     xp_needed: 900  },
  { level: 6,  title: 'Knowledge Seeker',xp_needed: 1400 },
  { level: 7,  title: 'Achiever',        xp_needed: 2000 },
  { level: 8,  title: 'Advanced',        xp_needed: 2800 },
  { level: 9,  title: 'Expert',          xp_needed: 3800 },
  { level: 10, title: 'Scholar',         xp_needed: 5000 },
  { level: 11, title: 'Elite',           xp_needed: 6500 },
  { level: 12, title: 'Master',          xp_needed: 8500 },
  { level: 13, title: 'Champion',        xp_needed: 11000},
  { level: 14, title: 'Legend',          xp_needed: 14000},
  { level: 15, title: 'Grandmaster',     xp_needed: 18000},
];

const getLevel = (totalXp) => {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXp >= lvl.xp_needed) current = lvl;
    else break;
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = LEVELS[nextIdx] || { level: current.level + 1, xp_needed: current.xp_needed + 5000, title: 'Grandmaster+' };
  const currentLevelXp = totalXp - current.xp_needed;
  const xpForNext = next.xp_needed - current.xp_needed;
  return { ...current, next_level_xp: next.xp_needed, current_level_xp: currentLevelXp, xp_for_next: xpForNext, progress_pct: Math.min(100, (currentLevelXp / xpForNext) * 100) };
};

// ── Award XP (core engine) ──
const awardXP = async (userId, amount, reason, category = 'other', referenceId = null) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Log transaction
    await conn.query(
      'INSERT INTO xp_transactions (user_id, xp_amount, reason, category, reference_id) VALUES (?,?,?,?,?)',
      [userId, amount, reason, category, referenceId]
    );

    // Get or create student_xp record
    const [existing] = await conn.query('SELECT * FROM student_xp WHERE user_id = ?', [userId]);
    let record = existing[0];

    if (!record) {
      await conn.query('INSERT INTO student_xp (user_id) VALUES (?)', [userId]);
      const [newRec] = await conn.query('SELECT * FROM student_xp WHERE user_id = ?', [userId]);
      record = newRec[0];
    }

    const newTotalXp = record.total_xp + amount;
    const levelInfo = getLevel(newTotalXp);

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = record.last_activity_date ? record.last_activity_date.toISOString?.().split('T')[0] || record.last_activity_date : null;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak = record.streak_days;
    if (lastActivity === today) {
      // Already active today — no change
    } else if (lastActivity === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1; // reset
    }
    const longestStreak = Math.max(record.longest_streak, newStreak);

    await conn.query(
      `UPDATE student_xp SET total_xp=?, level=?, title=?, current_level_xp=?, next_level_xp=?,
       streak_days=?, longest_streak=?, last_activity_date=?, updated_at=NOW() WHERE user_id=?`,
      [newTotalXp, levelInfo.level, levelInfo.title, levelInfo.current_level_xp, levelInfo.next_level_xp, newStreak, longestStreak, today, userId]
    );

    await conn.commit();

    // Check badges async (don't block response)
    checkAndAwardBadges(userId, { newTotalXp, newStreak, level: levelInfo.level }).catch(() => {});
    // Update challenge progress
    updateChallengeProgress(userId, category, amount, referenceId).catch(() => {});

    return { xp_awarded: amount, new_total: newTotalXp, level: levelInfo.level, title: levelInfo.title, streak: newStreak };
  } catch (err) {
    await conn.rollback();
    console.error('XP award error:', err.message);
    return null;
  } finally {
    conn.release();
  }
};

// ── Check & Award Badges ──
const checkAndAwardBadges = async (userId, stats) => {
  try {
    const [allBadges] = await pool.query('SELECT * FROM badges WHERE is_active = 1');
    const [earned] = await pool.query('SELECT badge_id FROM student_badges WHERE user_id = ?', [userId]);
    const earnedIds = new Set(earned.map(e => e.badge_id));

    // Get extended stats
    const [examStats] = await pool.query(
      `SELECT COUNT(*) as total, SUM(percentage >= 90) as high_scores, SUM(percentage = 100) as perfect
       FROM exam_attempts WHERE user_id = ? AND status = 'completed'`, [userId]);
    const [subjectStats] = await pool.query(
      `SELECT subject, COUNT(*) as count FROM exam_attempts WHERE user_id = ? AND percentage >= 80 AND status='completed' GROUP BY subject`, [userId]);

    const subjectMap = {};
    subjectStats.forEach(s => { subjectMap[s.subject.toLowerCase()] = s.count; });

    const context = {
      streak_days: stats.newStreak || 0,
      total_xp: stats.newTotalXp || 0,
      level: stats.level || 1,
      exams_completed: Number(examStats[0]?.total || 0),
      perfect_score: Number(examStats[0]?.perfect || 0),
      high_scores: Number(examStats[0]?.high_scores || 0),
      subject_mastery_maths: subjectMap['maths'] || 0,
      subject_mastery_physics: subjectMap['physics'] || 0,
    };

    const newBadges = [];
    for (const badge of allBadges) {
      if (earnedIds.has(badge.id)) continue;
      const val = context[badge.condition_type] || 0;
      if (val >= badge.condition_value) {
        await pool.query('INSERT IGNORE INTO student_badges (user_id, badge_id) VALUES (?,?)', [userId, badge.id]);
        // Award badge XP
        await pool.query(
          'INSERT INTO xp_transactions (user_id, xp_amount, reason, category) VALUES (?,?,?,?)',
          [userId, badge.xp_reward, `Badge: ${badge.name}`, 'badge']
        );
        await pool.query('UPDATE student_xp SET total_xp = total_xp + ? WHERE user_id = ?', [badge.xp_reward, userId]);
        newBadges.push({ name: badge.name, icon: badge.icon, xp: badge.xp_reward });
      }
    }
    return newBadges;
  } catch (e) {
    console.error('Badge check error:', e.message);
    return [];
  }
};

// ── Update Weekly Challenge Progress ──
const updateChallengeProgress = async (userId, category, xpAmount, referenceId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [challenges] = await pool.query(
      'SELECT * FROM weekly_challenges WHERE week_start <= ? AND week_end >= ? AND is_active = 1',
      [today, today]
    );
    for (const ch of challenges) {
      // Ensure progress row exists
      await pool.query(
        'INSERT IGNORE INTO challenge_progress (user_id, challenge_id) VALUES (?,?)',
        [userId, ch.id]
      );
      const [prog] = await pool.query(
        'SELECT * FROM challenge_progress WHERE user_id = ? AND challenge_id = ?',
        [userId, ch.id]
      );
      if (prog[0]?.is_completed) continue;

      let increment = 0;
      if (ch.challenge_type === 'exam_count' && category === 'exam') increment = 1;
      if (ch.challenge_type === 'xp') increment = xpAmount;
      if (ch.challenge_type === 'streak') increment = 1;

      if (increment > 0) {
        const newVal = (prog[0]?.current_value || 0) + increment;
        const completed = newVal >= ch.target_value ? 1 : 0;
        await pool.query(
          `UPDATE challenge_progress SET current_value=?, is_completed=?, completed_at=? WHERE user_id=? AND challenge_id=?`,
          [newVal, completed, completed ? new Date() : null, userId, ch.id]
        );
        if (completed) {
          await pool.query(
            'INSERT INTO xp_transactions (user_id, xp_amount, reason, category) VALUES (?,?,?,?)',
            [userId, ch.xp_reward, `Challenge: ${ch.title}`, 'challenge']
          );
          await pool.query('UPDATE student_xp SET total_xp = total_xp + ? WHERE user_id = ?', [ch.xp_reward, userId]);
        }
      }
    }
  } catch (e) {
    console.error('Challenge update error:', e.message);
  }
};

// ── API: Get student profile ──
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [xpRec] = await pool.query('SELECT * FROM student_xp WHERE user_id = ?', [userId]);

    let profile = xpRec[0];
    if (!profile) {
      await pool.query('INSERT INTO student_xp (user_id) VALUES (?)', [userId]);
      const [newRec] = await pool.query('SELECT * FROM student_xp WHERE user_id = ?', [userId]);
      profile = newRec[0];
    }

    const levelInfo = getLevel(profile.total_xp);

    // Get badges
    const [badges] = await pool.query(
      `SELECT b.*, sb.earned_at FROM student_badges sb
       JOIN badges b ON sb.badge_id = b.id
       WHERE sb.user_id = ? ORDER BY sb.earned_at DESC`,
      [userId]
    );

    // Get recent XP transactions
    const [transactions] = await pool.query(
      'SELECT * FROM xp_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );

    // Leaderboard rank
    const [rank] = await pool.query(
      'SELECT COUNT(*) + 1 as rank FROM student_xp WHERE total_xp > ?',
      [profile.total_xp]
    );

    return res.json({
      profile: { ...profile, ...levelInfo, rank: rank[0].rank },
      badges,
      transactions,
      levels: LEVELS,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

// ── API: Get leaderboard ──
const getLeaderboard = async (req, res) => {
  try {
    const [leaders] = await pool.query(
      `SELECT sx.user_id, sx.total_xp, sx.level, sx.title, sx.streak_days,
              u.username, u.first_name, u.last_name,
              (SELECT COUNT(*) FROM student_badges WHERE user_id = sx.user_id) as badge_count
       FROM student_xp sx
       JOIN users u ON sx.user_id = u.id
       ORDER BY sx.total_xp DESC LIMIT 20`
    );
    return res.json(leaders);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
};

// ── API: Get weekly challenges ──
const getChallenges = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const [challenges] = await pool.query(
      `SELECT wc.*, cp.current_value, cp.is_completed, cp.completed_at
       FROM weekly_challenges wc
       LEFT JOIN challenge_progress cp ON cp.challenge_id = wc.id AND cp.user_id = ?
       WHERE wc.week_start <= ? AND wc.week_end >= ? AND wc.is_active = 1`,
      [userId, today, today]
    );
    return res.json(challenges);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch challenges.' });
  }
};

// ── API: Get all badges (with earned status) ──
const getAllBadges = async (req, res) => {
  try {
    const userId = req.user.id;
    const [badges] = await pool.query(
      `SELECT b.*, sb.earned_at,
              CASE WHEN sb.user_id IS NOT NULL THEN 1 ELSE 0 END as is_earned
       FROM badges b
       LEFT JOIN student_badges sb ON sb.badge_id = b.id AND sb.user_id = ?
       WHERE b.is_active = 1 ORDER BY b.category, b.condition_value`,
      [userId]
    );
    return res.json(badges);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch badges.' });
  }
};

// ── API: Daily login XP ──
const claimLoginXP = async (req, res) => {
  try {
    const userId = req.user.id;
    const [xpRec] = await pool.query('SELECT last_activity_date FROM student_xp WHERE user_id = ?', [userId]);
    const today = new Date().toISOString().split('T')[0];
    const lastDate = xpRec[0]?.last_activity_date?.toISOString?.().split('T')[0] || null;

    if (lastDate === today) {
      return res.json({ already_claimed: true, message: 'Already claimed today!' });
    }

    const result = await awardXP(userId, 10, 'Daily login bonus', 'login');
    return res.json({ xp_awarded: 10, ...result, already_claimed: false });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to claim login XP.' });
  }
};

module.exports = { awardXP, getProfile, getLeaderboard, getChallenges, getAllBadges, claimLoginXP };
