import React, { useState, useEffect, useCallback } from "react";
import { Spinner, Badge, ProgressBar } from "react-bootstrap";
import axios from "axios";
import "./StudyPlannerPage.css";

const API = "http://localhost:8000/api/planner";

const SUBJECTS = ["Maths", "Physics", "Chemistry", "Biology", "English", "History", "Geography", "Civics"];
const SUBJECT_COLORS = {
  Maths: "#3498db", Physics: "#e74c3c", Chemistry: "#9b59b6",
  Biology: "#2ecc71", English: "#f39c12", History: "#1abc9c",
  Geography: "#e67e22", Civics: "#e91e63",
};
const SESSION_TYPE_COLORS = { study: "#3498db", review: "#f39c12", practice: "#2ecc71", rest: "#6e7681" };

const StudyPlannerPage = ({ onBack, token }) => {
  const [view, setView] = useState("today"); // today, calendar, exams, generate
  const [today, setToday] = useState({});
  const [exams, setExams] = useState([]);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ subject: "Maths", type: "Exam", name: "", date: "", priority: "high" });
  const [genSettings, setGenSettings] = useState({ hours_per_day: 4, preferred_start: "09:00" });
  const [successMsg, setSuccessMsg] = useState("");

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("brightroot_token")}`,
    "Content-Type": "application/json"
  });

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const hdrs = getHeaders();
      const [todayRes, examsRes, plansRes, remindersRes] = await Promise.all([
        axios.get(`${API}/today/`, { headers: hdrs }),
        axios.get(`${API}/exams/`, { headers: hdrs }),
        axios.get(`${API}/plans/`, { headers: hdrs }),
        axios.get(`${API}/reminders/`, { headers: hdrs }),
      ]);
      setToday(todayRes.data);
      setExams(examsRes.data);
      setPlans(plansRes.data);
      setReminders(remindersRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadCalendarSessions = useCallback(async () => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const end = `${y}-${String(m + 1).padStart(2, "0")}-${new Date(y, m + 1, 0).getDate()}`;
    try {
      const res = await axios.get(`${API}/sessions/?start_date=${start}&end_date=${end}`, { headers: getHeaders() });
      setSessions(res.data);
    } catch {}
  }, [calMonth]);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (view === "calendar") loadCalendarSessions(); }, [view, calMonth]);

  const addGoalHandler = async () => {
    if (!newGoal.date || !newGoal.name) return alert("Please set a name and date.");
    try {
      const payload = {
        subject: newGoal.subject,
        exam_name: `${newGoal.type}: ${newGoal.name}`,
        exam_date: newGoal.date,
        priority: newGoal.priority
      };
      await axios.post(`${API}/exams/`, payload, { headers: getHeaders() });
      setShowAddGoal(false);
      setNewGoal({ subject: "Maths", type: "Exam", name: "", date: "", priority: "high" });
      loadAll();
      showSuccess(`✅ ${newGoal.type} added!`);
      // Immediately suggest generating a plan
      setTimeout(() => {
        if (window.confirm(`Would you like AI to instantly generate a study plan for this ${newGoal.type}?`)) {
          setView("generate");
        }
      }, 500);
    } catch (e) { alert(e.response?.data?.error || "Failed to add goal (Ensure you are still logged in)"); }
  };

  const deleteGoal = async (id) => {
    if (!window.confirm("Remove this goal?")) return;
    try {
      await axios.delete(`${API}/exams/${id}/`, { headers: getHeaders() });
      loadAll();
    } catch {}
  };

  const generatePlan = async () => {
    if (exams.length === 0) return alert("Add at least one upcoming exam first!");
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/plans/generate/`, genSettings, { headers: getHeaders() });
      loadAll();
      loadCalendarSessions();
      setView("calendar");
      showSuccess(`🎉 Plan generated: ${res.data.plan.title} (${res.data.session_count} sessions)`);
    } catch (e) { alert(e.response?.data?.error || "Failed to generate plan. Check your API quota."); }
    finally { setGenerating(false); }
  };

  const toggleSession = async (sessionId, isDone) => {
    try {
      await axios.patch(`${API}/sessions/${sessionId}/`, { is_completed: !isDone }, { headers: getHeaders() });
      loadAll();
      if (!isDone) showSuccess("✅ Session marked complete! +20 XP");
    } catch {}
  };

  const dismissReminder = async (id) => {
    try {
      await axios.post(`${API}/reminders/${id}/dismiss/`, {}, { headers: getHeaders() });
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch {}
  };

  const daysInMonth = () => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    return { firstDay, days };
  };

  const getSessionsForDate = (dateStr) => sessions.filter(s => s.session_date?.startsWith(dateStr));

  const formatDate = (d) => {
    if (!d) return "";
    const cleanDate = d.includes('T') ? d.split('T')[0] : d;
    return new Date(cleanDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const daysUntil = (d) => {
    if (!d) return 0;
    const cleanDate = d.includes('T') ? d.split('T')[0] : d;
    return Math.ceil((new Date(cleanDate + 'T12:00:00') - new Date()) / 86400000);
  };

  if (loading) return (
    <div className="planner-loading"><Spinner animation="border" variant="success" /><p>Loading your planner...</p></div>
  );

  // ═══ TODAY VIEW ═══
  const renderToday = () => (
    <div className="today-view">
      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="reminders-bar">
          {reminders.map(r => (
            <div key={r.id} className="reminder-chip">
              <i className="bi bi-bell-fill me-1"></i>
              <span>{r.message}</span>
              <button onClick={() => dismissReminder(r.id)}><i className="bi bi-x"></i></button>
            </div>
          ))}
        </div>
      )}

      {/* Today Summary */}
      <div className="today-hero">
        <div className="today-date-badge">
          <div className="today-day">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</div>
          <div className="today-full">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div className="today-stats">
          <div className="today-stat">
            <i className="bi bi-check-circle-fill"></i>
            <div className="ts-val">{today.completed || 0}/{today.total || 0}</div>
            <div className="ts-lbl">Sessions Done</div>
          </div>
          <div className="today-stat">
            <i className="bi bi-clock-fill"></i>
            <div className="ts-val">{Math.floor((today.total_minutes || 0) / 60)}h {(today.total_minutes || 0) % 60}m</div>
            <div className="ts-lbl">Total Study</div>
          </div>
        </div>
      </div>

      {/* Progress */}
      {today.total > 0 && (
        <div className="today-progress-bar">
          <ProgressBar now={((today.completed || 0) / today.total) * 100} variant="success" style={{ height: 8, borderRadius: 4 }} />
          <span className="progress-label">{Math.round(((today.completed || 0) / today.total) * 100)}% complete</span>
        </div>
      )}

      {/* Today's Sessions */}
      <h5 className="section-title"><i className="bi bi-list-check me-2"></i>Today's Schedule</h5>
      {today.sessions?.length > 0 ? (
        <div className="session-list">
          {today.sessions.map(s => (
            <div key={s.id} className={`session-card ${s.is_completed ? "done" : ""}`}
              style={{ "--subj-color": SUBJECT_COLORS[s.subject] || "#2ecc71" }}>
              <div className="session-time">
                <span>{s.start_time?.slice(0, 5)}</span>
                <span className="sess-dur">{s.duration_minutes}m</span>
              </div>
              <div className="session-subj-bar"></div>
              <div className="session-info">
                <strong>{s.subject}</strong>
                <span className="session-topic">{s.topic}</span>
                {s.ai_tip && <span className="ai-tip"><i className="bi bi-lightbulb me-1"></i>{s.ai_tip}</span>}
              </div>
              <div className="session-actions">
                <Badge bg={SESSION_TYPE_COLORS[s.session_type] ? undefined : "secondary"}
                  style={{ background: SESSION_TYPE_COLORS[s.session_type] }}>
                  {s.session_type}
                </Badge>
                <button className={`done-btn ${s.is_completed ? "completed" : ""}`}
                  onClick={() => toggleSession(s.id, s.is_completed)}>
                  <i className={`bi ${s.is_completed ? "bi-check-circle-fill" : "bi-circle"}`}></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-sessions text-center py-5 bg-dark rounded-4 border border-secondary shadow-sm">
          <i className="bi bi-rocket-takeoff display-1 text-success opacity-75 mb-3"></i>
          <h4 className="text-white">You're all clear today!</h4>
          <p className="text-secondary px-4">There are no study sessions scheduled. If you have an upcoming exam, project, or assignment, add it now and let AI build your study plan!</p>
          <div className="mt-4 d-flex gap-3 justify-content-center">
            <button className="btn btn-primary rounded-pill px-4" onClick={() => setView("goals")}><i className="bi bi-plus-lg me-2"></i>Add Goal</button>
            <button className="btn btn-outline-success rounded-pill px-4" onClick={() => setView("generate")}><i className="bi bi-magic me-2"></i>Auto-Plan</button>
          </div>
        </div>
      )}

      {/* Upcoming Goals */}
      {today.upcoming_exams?.length > 0 && (
        <div className="upcoming-exams mt-5">
          <h5 className="section-title text-light"><i className="bi bi-flag-fill me-2 text-primary"></i>Upcoming Milestones</h5>
          <div className="d-flex gap-3 overflow-auto pb-3">
            {today.upcoming_exams.map(e => {
              const days = daysUntil(e.exam_date);
              return (
                <div key={e.id} className={`exam-countdown p-3 rounded-4 border border-secondary shadow-sm ${days <= 3 ? "border-danger bg-danger bg-opacity-10" : "bg-dark"}`} style={{ minWidth: '200px' }}>
                  <div className="exam-subj fw-bold fs-6 mb-1" style={{ color: SUBJECT_COLORS[e.subject] }}>{e.subject}</div>
                  <div className="exam-name text-white fw-medium text-truncate" title={e.exam_name}>{e.exam_name}</div>
                  <div className="exam-days mt-2 d-flex justify-content-between align-items-center">
                    <span className={`fw-bold ${days <= 3 ? "text-danger" : days <= 7 ? "text-warning" : "text-success"}`}>
                      {days === 0 ? "TODAY!" : days === 1 ? "Tomorrow!" : `${days} days`}
                    </span>
                    <small className="text-secondary">{formatDate(e.exam_date)}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ═══ CALENDAR VIEW ═══
  const renderCalendar = () => {
    const { firstDay, days } = daysInMonth();
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const todayStr = new Date().toISOString().split("T")[0];

    return (
      <div className="calendar-view">
        <div className="cal-header">
          <button className="cal-nav-btn" onClick={() => setCalMonth(new Date(y, m - 1, 1))}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <h5>{calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h5>
          <button className="cal-nav-btn" onClick={() => setCalMonth(new Date(y, m + 1, 1))}>
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>

        <div className="cal-weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="cal-weekday">{d}</div>
          ))}
        </div>

        <div className="cal-grid">
          {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} className="cal-cell empty"></div>)}
          {[...Array(days)].map((_, i) => {
            const day = i + 1;
            const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const daySessions = getSessionsForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const hasExam = exams.some(e => e.exam_date === dateStr);

            return (
              <div key={day}
                className={`cal-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${daySessions.length > 0 ? "has-sessions" : ""}`}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              >
                <span className="cal-day">{day}</span>
                {hasExam && <span className="exam-dot" title="Exam day">📝</span>}
                <div className="session-dots">
                  {daySessions.slice(0, 3).map((s, si) => (
                    <span key={si} className="session-dot" style={{ background: SUBJECT_COLORS[s.subject] || "#2ecc71" }}></span>
                  ))}
                  {daySessions.length > 3 && <span className="more-dot">+{daySessions.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Date Sessions */}
        {selectedDate && (
          <div className="selected-sessions">
            <h6>{formatDate(selectedDate)}</h6>
            {getSessionsForDate(selectedDate).length > 0 ? (
              getSessionsForDate(selectedDate).map(s => (
                <div key={s.id} className={`mini-session ${s.is_completed ? "done" : ""}`}
                  style={{ "--sc": SUBJECT_COLORS[s.subject] || "#2ecc71" }}>
                  <span className="ms-bar"></span>
                  <span className="ms-time">{s.start_time?.slice(0, 5)}</span>
                  <span className="ms-subj">{s.subject}</span>
                  <span className="ms-topic">{s.topic}</span>
                  <button className="ms-done-btn" onClick={() => toggleSession(s.id, s.is_completed)}>
                    <i className={`bi ${s.is_completed ? "bi-check-circle-fill text-success" : "bi-circle"}`}></i>
                  </button>
                </div>
              ))
            ) : (
              <p className="no-sess-msg">No sessions scheduled.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // ═══ GOALS VIEW ═══
  const renderGoals = () => (
    <div className="exams-view">
      <div className="exams-header d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <div className="bg-primary bg-opacity-25 rounded-circle p-2 me-3">
            <i className="bi bi-bullseye fs-3 text-primary"></i>
          </div>
          <div>
            <h4 className="text-white mb-0">My Study Goals</h4>
            <span className="text-secondary">Exams, Projects, and Assignments</span>
          </div>
        </div>
        <button className="btn btn-primary rounded-pill px-4 shadow" onClick={() => setShowAddGoal(!showAddGoal)}>
          <i className="bi bi-plus-lg me-2"></i>New Goal
        </button>
      </div>

      {showAddGoal && (
        <div className="add-exam-form bg-dark p-4 rounded-4 border border-secondary shadow-lg mb-4 animation-fade-in">
          <h5 className="text-light mb-3">Add a New Goal</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label text-secondary small">Goal Type</label>
              <select value={newGoal.type} onChange={e => setNewGoal({ ...newGoal, type: e.target.value })} className="form-select bg-black text-light border-secondary">
                <option value="Exam">Exam</option>
                <option value="Assignment">Assignment</option>
                <option value="Project">Project</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label text-secondary small">Subject</label>
              <select value={newGoal.subject} onChange={e => setNewGoal({ ...newGoal, subject: e.target.value })} className="form-select bg-black text-light border-secondary">
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-md-8">
              <label className="form-label text-secondary small">Name / Topic</label>
              <input type="text" placeholder={`e.g. Midterm, Research Paper...`} value={newGoal.name}
                onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} className="form-control bg-black text-light border-secondary" />
            </div>
            <div className="col-md-4">
              <label className="form-label text-secondary small">Deadline Date</label>
              <input type="date" value={newGoal.date}
                onChange={e => setNewGoal({ ...newGoal, date: e.target.value })} className="form-control bg-black text-light border-secondary"
                min={new Date().toISOString().split("T")[0]} />
            </div>
          </div>
          <div className="mt-4 d-flex gap-2 justify-content-end">
            <button className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShowAddGoal(false)}>Cancel</button>
            <button className="btn btn-success rounded-pill px-4 shadow" onClick={addGoalHandler}><i className="bi bi-check2 me-2"></i>Save Goal</button>
          </div>
        </div>
      )}

      <div className="exam-cards-list row g-3">
        {exams.map(e => {
          const days = daysUntil(e.exam_date);
          return (
            <div className="col-md-6" key={e.id}>
              <div className="exam-card-item bg-dark border-secondary h-100 rounded-4 shadow-sm" style={{ "--sc": SUBJECT_COLORS[e.subject] || "#2ecc71" }}>
                <div className="exam-card-left">
                  <div className="eci-bar"></div>
                  <div>
                    <div className="eci-subj d-flex align-items-center gap-2">
                      <span style={{ color: SUBJECT_COLORS[e.subject] }}><i className="bi bi-book-half me-1"></i>{e.subject}</span>
                      <Badge bg={e.priority === "critical" ? "danger" : e.priority === "high" ? "warning" : "secondary"}>
                        {e.priority}
                      </Badge>
                    </div>
                    <div className="eci-name text-white fs-5 mt-1">{e.exam_name}</div>
                  </div>
                </div>
                <div className="exam-card-right d-flex flex-column align-items-end justify-content-center">
                  <div className="eci-date text-secondary small"><i className="bi bi-calendar3 me-1"></i>{formatDate(e.exam_date)}</div>
                  <div className={`eci-days fw-bold fs-5 ${days <= 3 ? "text-danger" : days <= 7 ? "text-warning" : "text-success"}`}>
                    {days === 0 ? "TODAY" : days < 0 ? "Passed" : `${days} days left`}
                  </div>
                  <button className="btn btn-link text-danger p-0 mt-2 text-decoration-none small" onClick={() => deleteGoal(e.id)}>
                    <i className="bi bi-trash me-1"></i>Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {exams.length === 0 && (
          <div className="col-12 text-center py-5 bg-dark rounded-4 border border-secondary shadow-sm">
            <i className="bi bi-flag display-1 text-primary opacity-50 mb-3 d-block"></i>
            <h4 className="text-white">No Upcoming Goals</h4>
            <p className="text-secondary px-4">Whether it's an exam, a project deadline, or an assignment, add it here and we'll help you plan for it.</p>
            <button className="btn btn-primary rounded-pill mt-2 px-4 shadow" onClick={() => setShowAddGoal(true)}><i className="bi bi-plus-lg me-2"></i>Add Your First Goal</button>
          </div>
        )}
      </div>
    </div>
  );

  // ═══ GENERATE VIEW ═══
  const renderGenerate = () => (
    <div className="generate-view">
      <div className="gen-hero">
        <div className="gen-icon">🤖</div>
        <h4>AI Study Planner</h4>
        <p>Our AI will analyze your exams, weak topics, and available time to create your perfect study schedule.</p>
      </div>

      {exams.length === 0 ? (
        <div className="gen-no-exams bg-dark p-5 rounded-4 border border-secondary text-center shadow-sm">
          <i className="bi bi-flag display-1 text-secondary mb-3 d-block"></i>
          <h4 className="text-white">What are we planning for?</h4>
          <p className="text-secondary px-4">Before I can build a schedule, I need to know your upcoming goals. Add your exams, projects, or assignments first.</p>
          <button className="btn btn-primary rounded-pill px-5 py-2 mt-3 shadow" onClick={() => setView("goals")}><i className="bi bi-plus-lg me-2"></i>Add Your First Goal</button>
        </div>
      ) : (
        <>
          <div className="gen-exams-preview">
            <h6>Exams to plan for:</h6>
            {exams.map(e => (
              <div key={e.id} className="gen-exam-chip" style={{ background: SUBJECT_COLORS[e.subject] + "22", borderColor: SUBJECT_COLORS[e.subject] }}>
                <span style={{ color: SUBJECT_COLORS[e.subject] }}>{e.subject}</span>
                <span>{formatDate(e.exam_date)}</span>
              </div>
            ))}
          </div>

          <div className="gen-settings">
            <h6>Preferences</h6>
            <label>Hours of study per day
              <input type="range" min="1" max="10" value={genSettings.hours_per_day}
                onChange={e => setGenSettings({ ...genSettings, hours_per_day: parseInt(e.target.value) })} />
              <span className="range-val">{genSettings.hours_per_day} hours</span>
            </label>
            <label>Preferred start time
              <input type="time" value={genSettings.preferred_start}
                onChange={e => setGenSettings({ ...genSettings, preferred_start: e.target.value })}
                className="p-input" />
            </label>
          </div>

          <button className={`big-gen-btn ${generating ? "loading" : ""}`} onClick={generatePlan} disabled={generating}>
            {generating ? <><Spinner animation="border" size="sm" className="me-2" />Generating with AI...</> : <><i className="bi bi-magic me-2"></i>Generate My Study Plan</>}
          </button>

          {plans.length > 0 && (
            <div className="existing-plans mt-4">
              <h6 className="text-secondary mb-3">Your Saved Study Plans</h6>
              <div className="d-flex flex-column gap-2">
                {plans.map(p => (
                  <div key={p.id} className="plan-chip bg-dark border-secondary d-flex justify-content-between align-items-center p-3 rounded-3 shadow-sm hover-bg-secondary cursor-pointer" onClick={() => { setView("calendar"); }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-primary bg-opacity-25 rounded p-2 text-primary">
                        <i className="bi bi-calendar-check fs-5"></i>
                      </div>
                      <div>
                        <div className="text-white fw-bold">{p.title}</div>
                        <small className="text-secondary"><i className="bi bi-clock me-1"></i>{formatDate(p.plan_start)} to {formatDate(p.plan_end)}</small>
                      </div>
                    </div>
                    <i className="bi bi-chevron-right text-secondary"></i>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="planner-page">
      {/* Header */}
      <div className="planner-header">
        <div className="planner-title">
          <h4><i className="bi bi-calendar-check me-2"></i>Study Planner</h4>
          <span>AI-Powered Schedule</span>
        </div>
        <button className="gen-mini-btn" onClick={() => setView("generate")} title="Generate AI Plan">
          <i className="bi bi-magic"></i>
        </button>
      </div>

      {/* Success Toast */}
      {successMsg && <div className="success-toast">{successMsg}</div>}

      {/* Tabs */}
      <div className="planner-tabs">
        {[
          { id: "today", icon: "bi-sun", label: "Today" },
          { id: "calendar", icon: "bi-calendar3", label: "Calendar" },
          { id: "goals", icon: "bi-bullseye", label: "Goals" },
          { id: "generate", icon: "bi-magic", label: "AI Plan" },
        ].map(tab => (
          <button key={tab.id} className={`p-tab ${view === tab.id ? "active" : ""}`}
            onClick={() => setView(tab.id)}>
            <i className={`bi ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="planner-content">
        {view === "today" && renderToday()}
        {view === "calendar" && renderCalendar()}
        {view === "goals" && renderGoals()}
        {view === "generate" && renderGenerate()}
      </div>
    </div>
  );
};

export default StudyPlannerPage;
