import React, { useState, useEffect, useRef, useCallback } from "react";
import { Badge, Button, ProgressBar, Spinner } from "react-bootstrap";
import axios from "axios";
import "./ExamPage.css";

const API = "http://localhost:8000/api/exam";

const ExamPage = ({ onBack, token }) => {
  const [view, setView] = useState("dashboard"); // dashboard, exams, taking, results, review, history
  const [exams, setExams] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [subjectsData, setSubjectsData] = useState({ subjects: [], topics: [], years: [] });

  // Exam state
  const [examData, setExamData] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Results
  const [results, setResults] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef(null);
  const examStartTime = useRef(null);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    loadStats();
    loadSubjects();
  }, []);

  // Timer
  useEffect(() => {
    if (view === "taking" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { handleSubmit(); return 0; }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [view, timeLeft > 0]);

  const loadStats = async () => {
    try {
      const res = await axios.get(`${API}/stats/`, { headers });
      setStats(res.data);
    } catch {}
  };

  const loadSubjects = async () => {
    try {
      const res = await axios.get(`${API}/subjects/`, { headers });
      setSubjectsData(res.data);
    } catch {}
  };

  const loadExams = async () => {
    try {
      let url = `${API}/exams/?`;
      if (filterSubject) url += `subject=${filterSubject}&`;
      if (filterType) url += `type=${filterType}`;
      const res = await axios.get(url, { headers });
      setExams(res.data);
      setView("exams");
    } catch {}
  };

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API}/history/`, { headers });
      setHistory(res.data);
      setView("history");
    } catch {}
  };

  const startExam = async (templateId, subject, type, count) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/start/`, {
        template_id: templateId, subject, type, questionCount: count || 20,
      }, { headers });
      setExamData(res.data);
      setCurrentQ(0);
      setAnswers({});
      setFlagged(new Set());
      setTimeLeft(res.data.time_limit_seconds);
      examStartTime.current = Date.now();
      setView("taking");
      enterFullscreen();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to start exam");
    } finally { setLoading(false); }
  };

  const selectAnswer = async (qId, answer) => {
    setAnswers((prev) => ({ ...prev, [qId]: answer }));
    try {
      await axios.post(`${API}/attempts/${examData.attempt_id}/answer/`, {
        question_id: qId, selected_answer: answer,
      }, { headers });
    } catch {}
  };

  const toggleFlagQ = (qId) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (view !== "taking") return;
    clearInterval(timerRef.current);
    exitFullscreen();
    setLoading(true);
    try {
      const timeTaken = Math.floor((Date.now() - examStartTime.current) / 1000);
      const res = await axios.post(`${API}/attempts/${examData.attempt_id}/submit/`, {
        time_taken: timeTaken,
      }, { headers });
      setResults(res.data);
      setView("results");
      loadStats();
    } catch (err) {
      alert("Failed to submit exam");
    } finally { setLoading(false); }
  };

  const viewReview = async (attemptId) => {
    try {
      const res = await axios.get(`${API}/attempts/${attemptId}/`, { headers });
      setReviewData(res.data);
      setView("review");
    } catch {}
  };

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.();
    setIsFullscreen(true);
  };
  const exitFullscreen = () => {
    document.exitFullscreen?.();
    setIsFullscreen(false);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const getTypeColor = (t) => {
    const map = { past_exam: "warning", mock: "info", practice: "success", predicted: "danger", entrance: "primary" };
    return map[t] || "secondary";
  };

  // ═══════════ DASHBOARD ═══════════
  const renderDashboard = () => (
    <div className="exam-dashboard">
      <div className="dash-header">
        <div>
          <h2><i className="bi bi-mortarboard-fill me-2"></i>Exam Prep Center</h2>
          <p className="text-secondary">Ethiopian National Exam Preparation</p>
        </div>
        {stats && (
          <div className="countdown-card">
            <div className="countdown-number">{stats.daysUntilExam}</div>
            <div className="countdown-label">Days Until<br/>National Exam</div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <i className="bi bi-journal-check"></i>
            <div className="stat-value">{stats.overview?.total || 0}</div>
            <div className="stat-label">Exams Taken</div>
          </div>
          <div className="stat-card">
            <i className="bi bi-graph-up-arrow"></i>
            <div className="stat-value">{Number(stats.overview?.avg_score || 0).toFixed(1)}%</div>
            <div className="stat-label">Average Score</div>
          </div>
          <div className="stat-card">
            <i className="bi bi-bullseye"></i>
            <div className="stat-value">{stats.strongTopics?.length || 0}</div>
            <div className="stat-label">Strong Topics</div>
          </div>
          <div className="stat-card accent">
            <i className="bi bi-exclamation-triangle"></i>
            <div className="stat-value">{stats.weakTopics?.length || 0}</div>
            <div className="stat-label">Weak Topics</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h5>Quick Start</h5>
        <div className="action-grid">
          {["Maths", "Physics", "Chemistry", "Biology", "English"].map((subj) => (
            <button key={subj} className="action-btn" onClick={() => startExam(null, subj, "practice", 10)}>
              <i className="bi bi-lightning-charge"></i>
              <span>{subj}</span>
              <small>10 Questions</small>
            </button>
          ))}
          <button className="action-btn entrance" onClick={() => startExam(null, null, "practice", 25)}>
            <i className="bi bi-trophy"></i>
            <span>Entrance Mock</span>
            <small>All Subjects</small>
          </button>
        </div>
      </div>

      {/* Nav Buttons */}
      <div className="nav-row">
        <button className="nav-btn" onClick={loadExams}>
          <i className="bi bi-collection"></i>Browse Exams
        </button>
        <button className="nav-btn" onClick={loadHistory}>
          <i className="bi bi-clock-history"></i>History
        </button>
        <button className="nav-btn" onClick={onBack}>
          <i className="bi bi-arrow-left"></i>Back to Academy
        </button>
      </div>

      {/* Weak Topics */}
      {stats?.weakTopics?.length > 0 && (
        <div className="weak-section">
          <h5><i className="bi bi-exclamation-triangle text-warning me-2"></i>Focus Areas</h5>
          <div className="topic-list">
            {stats.weakTopics.map((t, i) => (
              <div key={i} className="topic-item weak">
                <span className="topic-name">{t.subject} → {t.topic}</span>
                <div className="topic-bar">
                  <ProgressBar now={t.accuracy} variant="danger" style={{ height: 6 }} />
                  <span className="topic-pct">{Number(t.accuracy).toFixed(0)}%</span>
                </div>
                <button className="practice-btn" onClick={() => startExam(null, t.subject, "practice", 5)}>
                  Practice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Results */}
      {stats?.recentAttempts?.length > 0 && (
        <div className="recent-section">
          <h5><i className="bi bi-clock-history me-2"></i>Recent Results</h5>
          {stats.recentAttempts.slice(0, 5).map((a) => (
            <div key={a.id} className="recent-item" onClick={() => viewReview(a.id)}>
              <div className="recent-info">
                <span className="recent-title">{a.title}</span>
                <Badge bg={getTypeColor(a.exam_type)} className="ms-2">{a.subject}</Badge>
              </div>
              <div className="recent-score">
                <span className={Number(a.percentage) >= 50 ? "text-success" : "text-danger"}>
                  {Number(a.percentage || 0).toFixed(0)}%
                </span>
                <small>({a.correct_answers}/{a.total_questions})</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ═══════════ EXAM LIST ═══════════
  const renderExamList = () => (
    <div className="exam-list-view">
      <div className="list-header">
        <button className="back-btn" onClick={() => setView("dashboard")}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h4>Available Exams</h4>
      </div>
      <div className="filter-row">
        <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="filter-select">
          <option value="">All Subjects</option>
          {subjectsData.subjects.map((s) => (
            <option key={s.subject} value={s.subject}>{s.subject} ({s.question_count})</option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
          <option value="">All Types</option>
          <option value="past_exam">Past Exams</option>
          <option value="mock">Mock Exams</option>
          <option value="practice">Practice</option>
          <option value="entrance">Entrance</option>
        </select>
        <button className="filter-apply" onClick={loadExams}>Apply</button>
      </div>
      <div className="exam-cards">
        {exams.map((ex) => (
          <div key={ex.id} className="exam-card">
            <div className="exam-card-top">
              <Badge bg={getTypeColor(ex.exam_type)}>{ex.exam_type.replace("_", " ")}</Badge>
              {ex.year && <Badge bg="dark">{ex.year}</Badge>}
            </div>
            <h6>{ex.title}</h6>
            <div className="exam-meta">
              <span><i className="bi bi-list-ol me-1"></i>{ex.question_count || ex.total_questions} Qs</span>
              <span><i className="bi bi-clock me-1"></i>{ex.time_limit_minutes} min</span>
              {ex.subject && <span><i className="bi bi-book me-1"></i>{ex.subject}</span>}
            </div>
            <button className="start-exam-btn" onClick={() => startExam(ex.id)} disabled={loading}>
              {loading ? <Spinner size="sm" /> : <><i className="bi bi-play-fill me-1"></i>Start</>}
            </button>
          </div>
        ))}
        {exams.length === 0 && <p className="text-secondary text-center mt-4">No exams found.</p>}
      </div>
    </div>
  );

  // ═══════════ TAKING EXAM ═══════════
  const renderExam = () => {
    if (!examData) return null;
    const q = examData.questions[currentQ];
    const answered = Object.keys(answers).length;
    const progress = (answered / examData.total_questions) * 100;
    const isUrgent = timeLeft < 300;

    return (
      <div className={`exam-taking ${isFullscreen ? "fullscreen" : ""}`}>
        {/* Top Bar */}
        <div className="exam-topbar">
          <div className="exam-title-area">
            <h6>{examData.title}</h6>
            <span className="q-counter">Q {currentQ + 1}/{examData.total_questions}</span>
          </div>
          <div className={`exam-timer ${isUrgent ? "urgent" : ""}`}>
            <i className="bi bi-clock"></i>
            <span>{formatTime(timeLeft)}</span>
          </div>
          <div className="exam-actions-top">
            <button className="top-btn" onClick={() => setIsFullscreen(!isFullscreen)}>
              <i className={`bi ${isFullscreen ? "bi-fullscreen-exit" : "bi-fullscreen"}`}></i>
            </button>
            <button className="top-btn submit-btn-top" onClick={() => {
              if (window.confirm(`Submit exam? ${examData.total_questions - answered} questions unanswered.`)) handleSubmit();
            }}>Submit</button>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar now={progress} variant="success" style={{ height: 3, borderRadius: 0 }} />

        <div className="exam-body">
          {/* Question */}
          <div className="question-panel">
            <div className="question-header">
              <Badge bg="dark">{q.subject}</Badge>
              <Badge bg={q.difficulty === "easy" ? "success" : q.difficulty === "hard" ? "danger" : "warning"}>
                {q.difficulty}
              </Badge>
              <button className={`flag-btn ${flagged.has(q.id) ? "flagged" : ""}`} onClick={() => toggleFlagQ(q.id)}>
                <i className={`bi ${flagged.has(q.id) ? "bi-flag-fill" : "bi-flag"}`}></i>
              </button>
            </div>

            <p className="question-text">{q.question_text}</p>

            <div className="options">
              {[
                { key: "A", text: q.option_a },
                { key: "B", text: q.option_b },
                { key: "C", text: q.option_c },
                { key: "D", text: q.option_d },
              ].map((opt) => (
                <button
                  key={opt.key}
                  className={`option-btn ${answers[q.id] === opt.key ? "selected" : ""}`}
                  onClick={() => selectAnswer(q.id, opt.key)}
                >
                  <span className="option-letter">{opt.key}</span>
                  <span className="option-text">{opt.text}</span>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="q-nav">
              <button disabled={currentQ === 0} onClick={() => setCurrentQ(currentQ - 1)} className="q-nav-btn">
                <i className="bi bi-chevron-left me-1"></i>Previous
              </button>
              <span className="q-nav-info">{answered} of {examData.total_questions} answered</span>
              {currentQ < examData.total_questions - 1 ? (
                <button onClick={() => setCurrentQ(currentQ + 1)} className="q-nav-btn next">
                  Next<i className="bi bi-chevron-right ms-1"></i>
                </button>
              ) : (
                <button onClick={() => {
                  if (window.confirm("Submit your exam?")) handleSubmit();
                }} className="q-nav-btn submit">
                  Submit<i className="bi bi-check-lg ms-1"></i>
                </button>
              )}
            </div>
          </div>

          {/* Question Navigator Sidebar */}
          <div className="q-navigator">
            <h6>Questions</h6>
            <div className="q-grid">
              {examData.questions.map((qq, i) => (
                <button
                  key={qq.id}
                  className={`q-dot ${currentQ === i ? "current" : ""} ${answers[qq.id] ? "answered" : ""} ${flagged.has(qq.id) ? "flagged" : ""}`}
                  onClick={() => setCurrentQ(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="q-legend">
              <span><span className="dot answered"></span>Answered</span>
              <span><span className="dot current"></span>Current</span>
              <span><span className="dot flagged"></span>Flagged</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════ RESULTS ═══════════
  const renderResults = () => {
    if (!results) return null;
    const { score } = results;
    const isPassed = results.passed;

    return (
      <div className="results-view">
        <div className={`result-hero ${isPassed ? "passed" : "failed"}`}>
          <div className="result-icon">
            <i className={`bi ${isPassed ? "bi-trophy-fill" : "bi-emoji-frown"}`}></i>
          </div>
          <h2>{isPassed ? "Congratulations! 🎉" : "Keep Practicing! 💪"}</h2>
          <div className="score-circle">
            <div className="score-value">{Number(score.percentage).toFixed(0)}%</div>
            <div className="score-label">{score.correct}/{score.total} correct</div>
          </div>
        </div>

        <div className="result-stats">
          <div className="r-stat correct"><i className="bi bi-check-circle"></i>{score.correct} Correct</div>
          <div className="r-stat wrong"><i className="bi bi-x-circle"></i>{score.wrong} Wrong</div>
          <div className="r-stat skipped"><i className="bi bi-dash-circle"></i>{score.skipped} Skipped</div>
          <div className="r-stat time"><i className="bi bi-clock"></i>{formatTime(results.time_taken)}</div>
        </div>

        <div className="result-actions">
          <button className="result-btn" onClick={() => { setReviewData({ attempt: examData, results: results.results }); setView("review"); }}>
            <i className="bi bi-search me-2"></i>Review Answers
          </button>
          <button className="result-btn primary" onClick={() => setView("dashboard")}>
            <i className="bi bi-house me-2"></i>Dashboard
          </button>
        </div>
      </div>
    );
  };

  // ═══════════ REVIEW MODE ═══════════
  const renderReview = () => {
    if (!reviewData) return null;
    return (
      <div className="review-view">
        <div className="review-header">
          <button className="back-btn" onClick={() => setView("dashboard")}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <h4>Review Answers</h4>
        </div>
        <div className="review-questions">
          {reviewData.results.map((r, i) => (
            <div key={i} className={`review-card ${r.is_correct ? "correct" : r.selected_answer ? "wrong" : "skipped"}`}>
              <div className="review-q-header">
                <span className="review-q-num">Q{r.question_order || i + 1}</span>
                <Badge bg={r.is_correct ? "success" : r.selected_answer ? "danger" : "secondary"}>
                  {r.is_correct ? "✓ Correct" : r.selected_answer ? "✗ Wrong" : "Skipped"}
                </Badge>
                <Badge bg="dark" className="ms-1">{r.subject} • {r.topic}</Badge>
              </div>
              <p className="review-q-text">{r.question_text}</p>
              <div className="review-options">
                {["A", "B", "C", "D"].map((key) => {
                  const optText = r[`option_${key.toLowerCase()}`];
                  const isSelected = r.selected_answer === key;
                  const isCorrect = r.correct_answer === key;
                  let cls = "review-opt";
                  if (isCorrect) cls += " correct-opt";
                  if (isSelected && !isCorrect) cls += " wrong-opt";
                  return (
                    <div key={key} className={cls}>
                      <span className="opt-letter">{key}</span>
                      <span>{optText}</span>
                      {isCorrect && <i className="bi bi-check-circle-fill text-success ms-auto"></i>}
                      {isSelected && !isCorrect && <i className="bi bi-x-circle-fill text-danger ms-auto"></i>}
                    </div>
                  );
                })}
              </div>
              {r.explanation && (
                <div className="review-explanation">
                  <i className="bi bi-lightbulb me-2"></i>
                  <span>{r.explanation}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="back-dash-btn" onClick={() => setView("dashboard")}>
          <i className="bi bi-house me-2"></i>Back to Dashboard
        </button>
      </div>
    );
  };

  // ═══════════ HISTORY ═══════════
  const renderHistory = () => (
    <div className="history-view">
      <div className="list-header">
        <button className="back-btn" onClick={() => setView("dashboard")}><i className="bi bi-arrow-left"></i></button>
        <h4>Exam History</h4>
      </div>
      <div className="history-list">
        {history.map((h) => (
          <div key={h.id} className="history-item" onClick={() => h.status === "completed" && viewReview(h.id)}>
            <div className="history-info">
              <strong>{h.title}</strong>
              <div className="history-meta">
                <Badge bg={getTypeColor(h.exam_type)}>{h.exam_type.replace("_", " ")}</Badge>
                <span>{new Date(h.started_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="history-score">
              {h.status === "completed" ? (
                <>
                  <span className={Number(h.percentage) >= 50 ? "text-success" : "text-danger"}>
                    {Number(h.percentage || 0).toFixed(0)}%
                  </span>
                  <small>{h.correct_answers}/{h.total_questions}</small>
                </>
              ) : (
                <Badge bg="secondary">{h.status}</Badge>
              )}
            </div>
          </div>
        ))}
        {history.length === 0 && <p className="text-secondary text-center mt-4">No exam history yet.</p>}
      </div>
    </div>
  );

  // ═══════════ MAIN RENDER ═══════════
  return (
    <div className="exam-page">
      {view === "dashboard" && renderDashboard()}
      {view === "exams" && renderExamList()}
      {view === "taking" && renderExam()}
      {view === "results" && renderResults()}
      {view === "review" && renderReview()}
      {view === "history" && renderHistory()}
    </div>
  );
};

export default ExamPage;
