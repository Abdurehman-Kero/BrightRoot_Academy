import React, { useState, useEffect, useRef } from "react";
import { ProgressBar, Badge, Spinner } from "react-bootstrap";
import axios from "axios";
import "./GamificationPage.css";

const API = "http://localhost:8000/api/gamification";

const GamificationPage = ({ onBack, token }) => {
  const [view, setView] = useState("profile"); // profile, leaderboard, badges, challenges
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [xpClaimed, setXpClaimed] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newBadgeAlert, setNewBadgeAlert] = useState(null);
  const prevLevel = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadAll();
    claimDailyXP();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profRes, badgesRes, challengesRes] = await Promise.all([
        axios.get(`${API}/profile/`, { headers }),
        axios.get(`${API}/badges/`, { headers }),
        axios.get(`${API}/challenges/`, { headers }),
      ]);
      const prof = profRes.data;
      if (prevLevel.current && prevLevel.current < prof.profile.level) setShowLevelUp(true);
      prevLevel.current = prof.profile.level;
      setProfile(prof.profile);
      setBadges(prof.badges);
      setTransactions(prof.transactions);
      setAllBadges(badgesRes.data);
      setChallenges(challengesRes.data);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await axios.get(`${API}/leaderboard/`, { headers });
      setLeaderboard(res.data);
    } catch {}
  };

  const claimDailyXP = async () => {
    try {
      const res = await axios.post(`${API}/login-xp/`, {}, { headers });
      if (!res.data.already_claimed) setXpClaimed(true);
    } catch {}
  };

  const getCategoryIcon = (cat) => {
    const map = { exam: "bi-pencil-square", streak: "bi-fire", login: "bi-door-open", badge: "bi-award", challenge: "bi-trophy", other: "bi-star" };
    return map[cat] || "bi-star";
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "#f1c40f";
    if (rank === 2) return "#bdc3c7";
    if (rank === 3) return "#cd7f32";
    return "#6e7681";
  };

  const getRankEmoji = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  if (loading) return (
    <div className="gam-loading">
      <Spinner animation="border" variant="success" />
      <p>Loading your progress...</p>
    </div>
  );

  // ═══════════ PROFILE VIEW ═══════════
  const renderProfile = () => (
    <div className="gam-profile">
      {/* Level Up Celebration */}
      {showLevelUp && (
        <div className="levelup-overlay" onClick={() => setShowLevelUp(false)}>
          <div className="levelup-card">
            <div className="levelup-emoji">🎉</div>
            <h2>Level Up!</h2>
            <p>You reached <strong>Level {profile.level}</strong></p>
            <p className="levelup-title">{profile.title}</p>
            <button onClick={() => setShowLevelUp(false)}>Continue</button>
          </div>
        </div>
      )}

      {/* Daily XP Claim */}
      {xpClaimed && (
        <div className="xp-toast">
          <i className="bi bi-star-fill me-2"></i>+10 XP — Daily Bonus Claimed!
        </div>
      )}

      {/* Hero Card */}
      {profile && (
        <div className="hero-card">
          <div className="hero-avatar">
            <span className="avatar-level">{profile.level}</span>
            <div className="avatar-ring"></div>
          </div>
          <div className="hero-info">
            <h3 className="hero-name">{profile.title}</h3>
            <div className="hero-xp-row">
              <span className="xp-total">{profile.total_xp.toLocaleString()} XP</span>
              <span className="hero-rank">Rank #{profile.rank}</span>
            </div>
            <div className="level-bar-container">
              <div className="level-labels">
                <span>Lv {profile.level}</span>
                <span>{profile.current_level_xp} / {profile.xp_for_next} XP</span>
                <span>Lv {profile.level + 1}</span>
              </div>
              <div className="level-bar-bg">
                <div
                  className="level-bar-fill"
                  style={{ width: `${profile.progress_pct}%` }}
                >
                  <span className="level-bar-glow"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      {profile && (
        <div className="stats-row">
          <div className="mini-stat">
            <i className="bi bi-fire"></i>
            <div className="mini-val">{profile.streak_days}</div>
            <div className="mini-label">Day Streak</div>
          </div>
          <div className="mini-stat">
            <i className="bi bi-trophy"></i>
            <div className="mini-val">{badges.length}</div>
            <div className="mini-label">Badges</div>
          </div>
          <div className="mini-stat">
            <i className="bi bi-graph-up-arrow"></i>
            <div className="mini-val">{profile.longest_streak}</div>
            <div className="mini-label">Best Streak</div>
          </div>
          <div className="mini-stat">
            <i className="bi bi-star-fill"></i>
            <div className="mini-val">{profile.total_xp.toLocaleString()}</div>
            <div className="mini-label">Total XP</div>
          </div>
        </div>
      )}

      {/* Streak Indicator */}
      {profile && profile.streak_days > 0 && (
        <div className="streak-banner">
          <div className="streak-flames">
            {[...Array(Math.min(profile.streak_days, 7))].map((_, i) => (
              <span key={i} className={`flame ${i < profile.streak_days ? 'active' : ''}`}>🔥</span>
            ))}
          </div>
          <div className="streak-text">
            <strong>{profile.streak_days} Day Streak!</strong>
            <span>Keep going — you're on fire!</span>
          </div>
        </div>
      )}

      {/* Recent Badges */}
      {badges.length > 0 && (
        <div className="section-box">
          <div className="section-head">
            <h5><i className="bi bi-award me-2"></i>Recent Badges</h5>
            <button className="see-all-btn" onClick={() => setView("badges")}>See All</button>
          </div>
          <div className="badge-row">
            {badges.slice(0, 6).map((b) => (
              <div key={b.id} className="badge-chip" title={b.description}>
                <span className="badge-icon">{b.icon}</span>
                <span className="badge-name">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent XP */}
      <div className="section-box">
        <h5><i className="bi bi-clock-history me-2"></i>Recent XP Activity</h5>
        <div className="xp-log">
          {transactions.slice(0, 8).map((t, i) => (
            <div key={i} className="xp-item">
              <i className={`bi ${getCategoryIcon(t.category)}`}></i>
              <span className="xp-reason">{t.reason}</span>
              <span className="xp-amount">+{t.xp_amount} XP</span>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-secondary small">No XP activity yet. Complete an exam to start!</p>}
        </div>
      </div>
    </div>
  );

  // ═══════════ LEADERBOARD ═══════════
  const renderLeaderboard = () => (
    <div className="leaderboard-view">
      <h5><i className="bi bi-bar-chart-fill me-2"></i>Weekly Leaderboard</h5>
      <div className="leader-list">
        {leaderboard.map((l, i) => {
          const rank = i + 1;
          return (
            <div key={l.user_id} className={`leader-row ${l.user_id === profile?.user_id ? 'me' : ''}`}>
              <div className="leader-rank" style={{ color: getRankColor(rank) }}>
                {getRankEmoji(rank)}
              </div>
              <div className="leader-avatar-sm">{rank}</div>
              <div className="leader-info">
                <span className="leader-name">{l.first_name || l.username}</span>
                <span className="leader-level">Lv {l.level} · {l.title}</span>
              </div>
              <div className="leader-right">
                <span className="leader-xp">{Number(l.total_xp).toLocaleString()} XP</span>
                <div className="leader-badges">🏅×{l.badge_count}</div>
              </div>
            </div>
          );
        })}
        {leaderboard.length === 0 && <p className="text-secondary text-center mt-3">Be the first on the leaderboard! Take an exam.</p>}
      </div>
    </div>
  );

  // ═══════════ BADGES ═══════════
  const renderBadges = () => {
    const earnedIds = new Set(badges.map(b => b.id));
    const categories = [...new Set(allBadges.map(b => b.category))];
    return (
      <div className="badges-view">
        <h5><i className="bi bi-award me-2"></i>All Badges ({badges.length}/{allBadges.length})</h5>
        {categories.map(cat => (
          <div key={cat} className="badge-category">
            <h6 className="badge-cat-title">{cat.charAt(0).toUpperCase() + cat.slice(1)}</h6>
            <div className="all-badges-grid">
              {allBadges.filter(b => b.category === cat).map(b => {
                const earned = earnedIds.has(b.id);
                return (
                  <div key={b.id} className={`badge-card ${earned ? 'earned' : 'locked'}`} style={{ '--badge-color': b.color }}>
                    <div className="badge-big-icon">{earned ? b.icon : '🔒'}</div>
                    <div className="badge-card-name">{b.name}</div>
                    <div className="badge-card-desc">{b.description}</div>
                    <div className="badge-xp-pill">+{b.xp_reward} XP</div>
                    {earned && <div className="earned-check">✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ═══════════ CHALLENGES ═══════════
  const renderChallenges = () => (
    <div className="challenges-view">
      <h5><i className="bi bi-lightning-charge me-2"></i>Weekly Challenges</h5>
      <p className="challenges-subtitle">Complete challenges to earn bonus XP!</p>
      <div className="challenge-list">
        {challenges.map((ch) => {
          const pct = Math.min(100, ((ch.current_value || 0) / ch.target_value) * 100);
          return (
            <div key={ch.id} className={`challenge-card ${ch.is_completed ? 'completed' : ''}`}>
              <div className="challenge-header">
                <i className={`bi ${ch.icon} challenge-icon`}></i>
                <div className="challenge-info">
                  <strong>{ch.title}</strong>
                  <p>{ch.description}</p>
                </div>
                <div className="challenge-reward">
                  <span>+{ch.xp_reward}</span>
                  <small>XP</small>
                </div>
              </div>
              <div className="challenge-progress-row">
                <div className="challenge-bar-bg">
                  <div className="challenge-bar-fill" style={{ width: `${pct}%` }}></div>
                </div>
                <span className="challenge-progress-text">
                  {ch.current_value || 0}/{ch.target_value}
                </span>
              </div>
              {ch.is_completed && (
                <div className="challenge-done"><i className="bi bi-check-circle-fill me-1"></i>Completed!</div>
              )}
            </div>
          );
        })}
        {challenges.length === 0 && <p className="text-secondary text-center mt-3">No challenges this week yet.</p>}
      </div>
    </div>
  );

  // ═══════════ MAIN ═══════════
  return (
    <div className="gam-page">
      {/* Header */}
      <div className="gam-header">
        <h4><i className="bi bi-star-fill me-2" style={{color:"#f59e0b"}}></i>My Progress</h4>
        <div className="gam-xp-badge">
          <i className="bi bi-star-fill me-1"></i>
          {profile?.total_xp?.toLocaleString() || 0} XP
        </div>
      </div>

      {/* Tab Nav */}
      <div className="gam-tabs">
        {[
          { id: "profile", icon: "bi-person-circle", label: "Profile" },
          { id: "challenges", icon: "bi-lightning-charge", label: "Challenges" },
          { id: "badges", icon: "bi-award", label: "Badges" },
          { id: "leaderboard", icon: "bi-bar-chart-fill", label: "Leaderboard" },
        ].map(tab => (
          <button
            key={tab.id}
            className={`gam-tab ${view === tab.id ? "active" : ""}`}
            onClick={() => {
              setView(tab.id);
              if (tab.id === "leaderboard") loadLeaderboard();
            }}
          >
            <i className={`bi ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="gam-content">
        {view === "profile" && renderProfile()}
        {view === "leaderboard" && renderLeaderboard()}
        {view === "badges" && renderBadges()}
        {view === "challenges" && renderChallenges()}
      </div>
    </div>
  );
};

export default GamificationPage;
