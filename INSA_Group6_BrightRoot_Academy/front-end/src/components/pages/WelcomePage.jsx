import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./WelcomePage.css";

const SUBJECTS = [
  { id: "maths",     name: "Maths",     emoji: "📐", color: "#3b82f6", desc: "Algebra, Geometry, Calculus" },
  { id: "physics",   name: "Physics",   emoji: "⚡", color: "#8b5cf6", desc: "Mechanics, Electricity, Optics" },
  { id: "chemistry", name: "Chemistry", emoji: "🧪", color: "#22c55e", desc: "Organic, Inorganic, Physical" },
  { id: "biology",   name: "Biology",   emoji: "🌿", color: "#f59e0b", desc: "Cell Biology, Genetics, Ecology" },
  { id: "english",   name: "English",   emoji: "📖", color: "#ef4444", desc: "Grammar, Literature, Writing" },
  { id: "history",   name: "History",   emoji: "🏛️", color: "#1abc9c", desc: "Ethiopian & World History" },
];

const GRADES = [
  { value: "Grade9",  label: "Grade 9",  sub: "Foundation" },
  { value: "Grade10", label: "Grade 10", sub: "Intermediate" },
  { value: "Grade11", label: "Grade 11", sub: "Advanced" },
  { value: "Grade12", label: "Grade 12", sub: "National Exam" },
];

const WelcomePage = ({
  onSubjectSelected,
  onGoToChat,
  onGoToUpload,
  onGoToQuiz,
  onGoToCurriculum,
  onGoToExam,
  onGoToGamification,
  onGoToPlanner,
}) => {
  const { user, updateUserProfile } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);

  const firstName = user?.first_name || user?.firstName || user?.username || "Student";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const handleContinue = () => {
    if (selectedSubject && selectedGrade) {
      updateUserProfile({ currentSubject: selectedSubject.id, currentGrade: selectedGrade.value, lastActivity: new Date().toISOString() });
      onSubjectSelected?.({ subject: selectedSubject, grade: selectedGrade });
    }
  };

  const QUICK_ACTIONS = [
    { icon: "bi-robot",          label: "AI Tutor",    sub: "Ask anything instantly",      color: "#3b82f6", action: onGoToChat },
    { icon: "bi-book-half",      label: "Curriculum",  sub: "Browse lessons by grade",     color: "#22c55e", action: onGoToCurriculum },
    { icon: "bi-pencil-square",  label: "Exam Prep",   sub: "Practice past papers",        color: "#8b5cf6", action: onGoToExam },
    { icon: "bi-patch-question", label: "Quizzes",     sub: "Test your knowledge",         color: "#f59e0b", action: onGoToQuiz },
    { icon: "bi-star-fill",      label: "Progress",    sub: "XP, badges & leaderboard",    color: "#f472b6", action: onGoToGamification },
    { icon: "bi-calendar-check", label: "Study Plan",  sub: "AI-built daily schedule",     color: "#1abc9c", action: onGoToPlanner },
  ];

  return (
    <div className="wp-page">
      {/* Background orbs */}
      <div className="wp-orb wp-orb-1"></div>
      <div className="wp-orb wp-orb-2"></div>

      <div className="wp-container">

        {/* ── Greeting Hero ── */}
        <div className="wp-hero">
          <div className="wp-hero-left">
            <div className="wp-greeting-badge">
              <span className="wp-badge-dot"></span>
              Ready to learn
            </div>
            <h1 className="wp-hello">
              {greeting}, <span className="wp-name-grad">{firstName}!</span>
            </h1>
            <p className="wp-tagline">
              What would you like to study today? Your AI tutor is ready.
            </p>
          </div>
          <div className="wp-hero-right">
            <div className="wp-stat-card">
              <div className="wp-stat-icon">🔥</div>
              <div className="wp-stat-val">Day 1</div>
              <div className="wp-stat-lbl">Study Streak</div>
            </div>
            <div className="wp-stat-card">
              <div className="wp-stat-icon">⭐</div>
              <div className="wp-stat-val">0 XP</div>
              <div className="wp-stat-lbl">Total Points</div>
            </div>
            <div className="wp-stat-card">
              <div className="wp-stat-icon">📅</div>
              <div className="wp-stat-val">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="wp-stat-lbl">Today</div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <section className="wp-section">
          <div className="wp-section-label">Quick Actions</div>
          <div className="wp-actions-grid">
            {QUICK_ACTIONS.map((a, i) => (
              <button
                key={i}
                className="wp-action-card"
                style={{ "--ac": a.color }}
                onClick={a.action}
              >
                <div className="wp-action-icon">
                  <i className={`bi ${a.icon}`}></i>
                </div>
                <div className="wp-action-text">
                  <strong>{a.label}</strong>
                  <span>{a.sub}</span>
                </div>
                <i className="bi bi-arrow-right-short wp-action-arrow"></i>
              </button>
            ))}
          </div>
        </section>

        {/* ── Subject Selector ── */}
        <section className="wp-section" id="subjects">
          <div className="wp-section-header">
            <div className="wp-section-label">Choose Subject & Grade</div>
            <p className="wp-section-sub">Select a subject and grade to open the AI-powered study dashboard</p>
          </div>

          <div className="wp-subjects-grid">
            {SUBJECTS.map(s => (
              <button
                key={s.id}
                className={`wp-subject-btn ${selectedSubject?.id === s.id ? "active" : ""}`}
                style={{ "--sc": s.color }}
                onClick={() => { setSelectedSubject(s); setSelectedGrade(null); }}
              >
                <span className="wp-subj-emoji">{s.emoji}</span>
                <strong className="wp-subj-name">{s.name}</strong>
                <span className="wp-subj-desc">{s.desc}</span>
                {selectedSubject?.id === s.id && (
                  <span className="wp-check"><i className="bi bi-check2"></i></span>
                )}
              </button>
            ))}
          </div>

          {/* Grade picker — slides in */}
          {selectedSubject && (
            <div className="wp-grade-section">
              <p className="wp-grade-label">
                <span style={{ color: selectedSubject.color }}>{selectedSubject.name}</span>
                {" "}— select your grade:
              </p>
              <div className="wp-grades-row">
                {GRADES.map(g => (
                  <button
                    key={g.value}
                    className={`wp-grade-btn ${selectedGrade?.value === g.value ? "active" : ""}`}
                    onClick={() => setSelectedGrade(g)}
                  >
                    <span className="wp-grade-label-main">{g.label}</span>
                    <span className="wp-grade-sub">{g.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start button */}
          {selectedSubject && selectedGrade && (
            <div className="wp-start-row">
              <button className="wp-start-btn" onClick={handleContinue}>
                <i className="bi bi-play-fill me-2"></i>
                Start {selectedSubject.name} · {selectedGrade.label}
                <i className="bi bi-arrow-right ms-2"></i>
              </button>
            </div>
          )}
        </section>

        {/* ── AI Tutor CTA ── */}
        <section className="wp-cta-banner">
          <div className="wp-cta-left">
            <div className="wp-cta-icon">🤖</div>
            <div>
              <strong>Ask your AI Tutor anything</strong>
              <p>Get instant explanations for any concept in any subject</p>
            </div>
          </div>
          <button className="wp-cta-btn" onClick={onGoToChat}>
            Start Chatting <i className="bi bi-arrow-right ms-1"></i>
          </button>
        </section>

      </div>
    </div>
  );
};

export default WelcomePage;
