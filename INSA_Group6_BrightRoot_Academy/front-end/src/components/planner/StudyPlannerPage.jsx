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
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExam, setNewExam] = useState({ subject: "Maths", exam_date: "", exam_name: "", priority: "high" });
  const [genSettings, setGenSettings] = useState({ hours_per_day: 4, preferred_start: "09:00" });
  const [successMsg, setSuccessMsg] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, examsRes, plansRes, remindersRes] = await Promise.all([
        axios.get(`${API}/today/`, { headers }),
        axios.get(`${API}/exams/`, { headers }),
        axios.get(`${API}/plans/`, { headers }),
        axios.get(`${API}/reminders/`, { headers }),
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
      const res = await axios.get(`${API}/sessions/?start_date=${start}&end_date=${end}`, { headers });
      setSessions(res.data);
    } catch {}
  }, [calMonth]);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (view === "calendar") loadCalendarSessions(); }, [view, calMonth]);

  const addExamHandler = async () => {
    if (!newExam.exam_date) return alert("Please set the exam date.");
    try {
      await axios.post(`${API}/exams/`, newExam, { headers });
      setShowAddExam(false);
      setNewExam({ subject: "Maths", exam_date: "", exam_name: "", priority: "high" });
      loadAll();
      showSuccess("✅ Exam added!");
    } catch (e) { alert(e.response?.data?.error || "Failed to add exam"); }
  };

  const deleteExam = async (id) => {
    if (!window.confirm("Remove this exam?")) return;
    try {
      await axios.delete(`${API}/exams/${id}/`, { headers });
      loadAll();
    } catch {}
  };

  const generatePlan = async () => {
    if (exams.length === 0) return alert("Add at least one upcoming exam first!");
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/plans/generate/`, genSettings, { headers });
      loadAll();
      loadCalendarSessions();
      setView("calendar");
      showSuccess(`🎉 Plan generated: ${res.data.plan.title} (${res.data.session_count} sessions)`);
    } catch (e) { alert(e.response?.data?.error || "Failed to generate plan. Check your API quota."); }
    finally { setGenerating(false); }
  };

  const toggleSession = async (sessionId, isDone) => {
    try {
      await axios.patch(`${API}/sessions/${sessionId}/`, { is_completed: !isDone }, { headers });
      loadAll();
      if (!isDone) showSuccess("✅ Session marked complete! +20 XP");
    } catch {}
  };

  const dismissReminder = async (id) => {
    try {
      await axios.post(`${API}/reminders/${id}/dismiss/`, {}, { headers });
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

  const formatDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const daysUntil = (d) => Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000);

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
        <div className="no-sessions">
          <i className="bi bi-calendar-x"></i>
          <p>No sessions today.</p>
          <button className="gen-btn" onClick={() => setView("generate")}>Generate Study Plan</button>
        </div>
      )}

      {/* Upcoming Exams */}
      {today.upcoming_exams?.length > 0 && (
        <div className="upcoming-exams">
          <h5 className="section-title"><i className="bi bi-alarm me-2"></i>Upcoming Exams</h5>
          {today.upcoming_exams.map(e => {
            const days = daysUntil(e.exam_date);
            return (
              <div key={e.id} className={`exam-countdown ${days <= 3 ? "urgent" : ""}`}>
                <div className="exam-subj" style={{ color: SUBJECT_COLORS[e.subject] }}>{e.subject}</div>
                <div className="exam-name">{e.exam_name}</div>
                <div className="exam-days">
                  <span className={days <= 3 ? "text-danger" : days <= 7 ? "text-warning" : "text-success"}>
                    {days === 0 ? "TODAY!" : days === 1 ? "Tomorrow!" : `${days} days`}
                  </span>
                  <small>{formatDate(e.exam_date)}</small>
                </div>
              </div>
            );
          })}
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

  // ═══ EXAMS VIEW ═══
  const renderExams = () => (
    <div className="exams-view">
      <div className="exams-header">
        <h5><i className="bi bi-calendar-event me-2"></i>My Exams</h5>
        <button className="add-exam-btn" onClick={() => setShowAddExam(!showAddExam)}>
          <i className="bi bi-plus-lg me-1"></i>Add Exam
        </button>
      </div>

      {showAddExam && (
        <div className="add-exam-form">
          <select value={newExam.subject} onChange={e => setNewExam({ ...newExam, subject: e.target.value })} className="p-input">
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <input type="text" placeholder="Exam name (e.g. National Exam)" value={newExam.exam_name}
            onChange={e => setNewExam({ ...newExam, exam_name: e.target.value })} className="p-input" />
          <input type="date" value={newExam.exam_date}
            onChange={e => setNewExam({ ...newExam, exam_date: e.target.value })} className="p-input"
            min={new Date().toISOString().split("T")[0]} />
          <select value={newExam.priority} onChange={e => setNewExam({ ...newExam, priority: e.target.value })} className="p-input">
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="critical">Critical</option>
          </select>
          <div className="form-btns">
            <button className="save-btn" onClick={addExamHandler}>Save Exam</button>
            <button className="cancel-btn" onClick={() => setShowAddExam(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="exam-cards-list">
        {exams.map(e => {
          const days = daysUntil(e.exam_date);
          return (
            <div key={e.id} className="exam-card-item" style={{ "--sc": SUBJECT_COLORS[e.subject] || "#2ecc71" }}>
              <div className="exam-card-left">
                <div className="eci-bar"></div>
                <div>
                  <div className="eci-subj">{e.subject}</div>
                  <div className="eci-name">{e.exam_name}</div>
                  <Badge bg={e.priority === "critical" ? "danger" : e.priority === "high" ? "warning" : "secondary"} className="mt-1">
                    {e.priority}
                  </Badge>
                </div>
              </div>
              <div className="exam-card-right">
                <div className="eci-date">{formatDate(e.exam_date)}</div>
                <div className={`eci-days ${days <= 3 ? "text-danger" : days <= 7 ? "text-warning" : "text-success"}`}>
                  {days === 0 ? "TODAY" : days < 0 ? "Passed" : `${days} days`}
                </div>
                <button className="del-btn" onClick={() => deleteExam(e.id)}>
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          );
        })}
        {exams.length === 0 && (
          <div className="no-exams">
            <i className="bi bi-calendar-plus"></i>
            <p>No exams added yet. Add your upcoming exams!</p>
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
        <div className="gen-no-exams">
          <p>You need to add your upcoming exams first.</p>
          <button className="gen-btn" onClick={() => setView("exams")}>Add Exams</button>
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
            <div className="existing-plans">
              <h6>Existing Plans</h6>
              {plans.map(p => (
                <div key={p.id} className="plan-chip" onClick={() => { setView("calendar"); }}>
                  <i className="bi bi-calendar-check me-2"></i>
                  <span>{p.title}</span>
                  <small>{p.plan_start} → {p.plan_end}</small>
                </div>
              ))}
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
          { id: "exams", icon: "bi-pencil-square", label: "Exams" },
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
        {view === "exams" && renderExams()}
        {view === "generate" && renderGenerate()}
      </div>
    </div>
  );
};

export default StudyPlannerPage;
