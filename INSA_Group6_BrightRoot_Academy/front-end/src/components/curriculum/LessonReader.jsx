import React, { useState, useEffect } from "react";
import {
  Container, Row, Col, Card, Button, Badge, Spinner, Alert,
  Accordion, Modal, ProgressBar,
} from "react-bootstrap";
import axios from "axios";
import "./LessonReader.css";

const LessonReader = ({ lessonId, token, onNavigate }) => {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("content");

  // Flashcard state
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Exercise state
  const [exerciseAnswers, setExerciseAnswers] = useState({});
  const [showExerciseResults, setShowExerciseResults] = useState(false);

  // AI generation
  const [aiLoading, setAiLoading] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [currentQuizQ, setCurrentQuizQ] = useState(0);

  const apiHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const API = "http://localhost:8000/api";

  useEffect(() => {
    if (lessonId) loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/curriculum/lessons/${lessonId}/`, {
        headers: apiHeaders,
      });
      setLesson(response.data);
      setCurrentCard(0);
      setFlipped(false);
      setExerciseAnswers({});
      setShowExerciseResults(false);
      setQuizAnswers({});
      setShowQuizResults(false);
      setCurrentQuizQ(0);
      setActiveSection("content");
    } catch (err) {
      setError("Failed to load lesson.");
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async () => {
    try {
      await axios.post(
        `${API}/curriculum/progress/`,
        { lesson_id: lessonId, is_completed: true },
        { headers: { ...apiHeaders, "Content-Type": "application/json" } }
      );
      setLesson((prev) => ({
        ...prev,
        progress: { ...prev.progress, is_completed: 1, progress_percent: 100 },
      }));
    } catch (err) {
      console.error("Failed to mark complete:", err);
    }
  };

  const generateSummary = async () => {
    setAiLoading(true);
    try {
      const response = await axios.post(
        `${API}/curriculum/lessons/${lessonId}/generate-summary/`,
        {},
        { headers: { ...apiHeaders, "Content-Type": "application/json" } }
      );
      setLesson((prev) => ({
        ...prev,
        summary: { content: response.data.summary },
      }));
      setShowSummaryModal(true);
    } catch (err) {
      setError("Failed to generate summary.");
    } finally {
      setAiLoading(false);
    }
  };

  const generateQuiz = async () => {
    setAiLoading(true);
    try {
      const response = await axios.post(
        `${API}/curriculum/lessons/${lessonId}/generate-quiz/`,
        { num_questions: 5 },
        { headers: { ...apiHeaders, "Content-Type": "application/json" } }
      );
      setLesson((prev) => ({ ...prev, quiz: response.data.quiz }));
      setQuizAnswers({});
      setShowQuizResults(false);
      setCurrentQuizQ(0);
      setShowQuizModal(true);
    } catch (err) {
      setError("Failed to generate quiz.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="lesson-loading">
        <Spinner animation="border" variant="success" />
        <p className="mt-3">Loading lesson...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-4">
        {error}
      </Alert>
    );
  }

  if (!lesson) return null;

  const isCompleted = lesson.progress?.is_completed;

  // Exercise scoring
  const getExerciseScore = () => {
    let correct = 0;
    lesson.exercises.forEach((ex, i) => {
      if (exerciseAnswers[i] === ex.correct_answer) correct++;
    });
    return { correct, total: lesson.exercises.length };
  };

  // Quiz scoring
  const getQuizScore = () => {
    const questions = lesson.quiz?.questions?.questions || lesson.quiz?.questions || [];
    let correct = 0;
    questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct_answer) correct++;
    });
    return { correct, total: questions.length };
  };

  const sections = [
    { key: "content", icon: "bi-book", label: "Content" },
    { key: "formulas", icon: "bi-calculator", label: "Formulas", count: lesson.formulas?.length },
    { key: "flashcards", icon: "bi-card-text", label: "Flashcards", count: lesson.flashcards?.length },
    { key: "exercises", icon: "bi-pencil-square", label: "Exercises", count: lesson.exercises?.length },
    { key: "exams", icon: "bi-clipboard-check", label: "Past Exams", count: lesson.past_exam_questions?.length },
    { key: "files", icon: "bi-paperclip", label: "Files", count: lesson.files?.length },
  ];

  return (
    <div className="lesson-reader">
      {/* Header */}
      <div className="lesson-header">
        <div className="lesson-breadcrumb">
          <span>{lesson.subject_name}</span>
          <i className="bi bi-chevron-right mx-1"></i>
          <span>{lesson.unit_title}</span>
          <i className="bi bi-chevron-right mx-1"></i>
          <span>{lesson.chapter_title}</span>
        </div>
        <h2 className="lesson-title">{lesson.title}</h2>
        <div className="lesson-meta">
          <Badge bg="dark">
            <i className="bi bi-clock me-1"></i>
            {lesson.duration_minutes} minutes
          </Badge>
          <Badge bg={isCompleted ? "success" : "secondary"}>
            {isCompleted ? (
              <>
                <i className="bi bi-check-circle me-1"></i>Completed
              </>
            ) : (
              <>
                <i className="bi bi-circle me-1"></i>In Progress
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="section-tabs">
        {sections.map((s) => (
          <button
            key={s.key}
            className={`section-tab ${activeSection === s.key ? "active" : ""}`}
            onClick={() => setActiveSection(s.key)}
          >
            <i className={`bi ${s.icon} me-1`}></i>
            {s.label}
            {s.count > 0 && (
              <Badge bg="secondary" pill className="ms-1" style={{ fontSize: "0.6rem" }}>
                {s.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content Section */}
      <div className="lesson-content-area">
        {/* ── Main Explanation ── */}
        {activeSection === "content" && (
          <div className="content-section">
            <div className="explanation-content">
              {lesson.explanation?.split("\n").map((line, i) => {
                if (line.startsWith("## "))
                  return <h3 key={i} className="mt-4 mb-2 text-success">{line.replace("## ", "")}</h3>;
                if (line.startsWith("- ") || line.startsWith("* "))
                  return <li key={i} className="ms-3 mb-1">{line.replace(/^[-*] /, "")}</li>;
                if (line.match(/^\d+\.\s/))
                  return <li key={i} className="ms-3 mb-1">{line}</li>;
                if (line.startsWith("**") && line.endsWith("**"))
                  return <p key={i} className="fw-bold text-info">{line.replace(/\*\*/g, "")}</p>;
                if (line.trim() === "") return <br key={i} />;
                return <p key={i} className="mb-2">{line}</p>;
              })}
            </div>

            {/* Diagrams */}
            {lesson.diagrams?.length > 0 && (
              <div className="mt-4">
                <h5 className="text-success"><i className="bi bi-image me-2"></i>Diagrams</h5>
                <Row>
                  {lesson.diagrams.map((d) => (
                    <Col key={d.id} md={6} className="mb-3">
                      <Card className="bg-dark border-secondary">
                        <Card.Img src={d.image_url} alt={d.title} />
                        <Card.Body>
                          <Card.Title className="text-light fs-6">{d.title}</Card.Title>
                          {d.caption && <Card.Text className="text-secondary small">{d.caption}</Card.Text>}
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            )}

            {/* AI Actions */}
            <div className="ai-actions mt-4">
              <Button variant="outline-info" onClick={generateSummary} disabled={aiLoading}>
                <i className="bi bi-magic me-2"></i>
                {lesson.summary ? "Regenerate AI Summary" : "Generate AI Summary"}
              </Button>
              <Button variant="outline-warning" onClick={generateQuiz} disabled={aiLoading} className="ms-2">
                <i className="bi bi-patch-question me-2"></i>
                {lesson.quiz ? "Regenerate AI Quiz" : "Generate AI Quiz"}
              </Button>
              {lesson.summary && (
                <Button variant="outline-success" onClick={() => setShowSummaryModal(true)} className="ms-2">
                  <i className="bi bi-eye me-2"></i>View Summary
                </Button>
              )}
              {lesson.quiz && (
                <Button variant="outline-primary" onClick={() => { setShowQuizModal(true); setShowQuizResults(false); setCurrentQuizQ(0); setQuizAnswers({}); }} className="ms-2">
                  <i className="bi bi-play-circle me-2"></i>Take Quiz
                </Button>
              )}
              {aiLoading && <Spinner size="sm" variant="info" className="ms-2" />}
            </div>
          </div>
        )}

        {/* ── Formulas ── */}
        {activeSection === "formulas" && (
          <div className="formulas-section">
            {lesson.formulas?.length === 0 ? (
              <p className="text-secondary">No formulas for this lesson.</p>
            ) : (
              lesson.formulas?.map((f) => (
                <Card key={f.id} className="formula-card mb-3">
                  <Card.Body>
                    <h6 className="text-info">{f.title}</h6>
                    <div className="formula-display">{f.formula_content}</div>
                    {f.explanation && <p className="text-secondary small mt-2">{f.explanation}</p>}
                  </Card.Body>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── Flashcards ── */}
        {activeSection === "flashcards" && (
          <div className="flashcards-section">
            {lesson.flashcards?.length === 0 ? (
              <p className="text-secondary">No flashcards for this lesson.</p>
            ) : (
              <div className="flashcard-viewer">
                <div className="flashcard-counter">
                  Card {currentCard + 1} of {lesson.flashcards.length}
                </div>
                <div
                  className={`flashcard ${flipped ? "flipped" : ""}`}
                  onClick={() => setFlipped(!flipped)}
                >
                  <div className="flashcard-inner">
                    <div className="flashcard-front">
                      <p>{lesson.flashcards[currentCard]?.front_text}</p>
                      <small className="text-secondary">Click to reveal answer</small>
                    </div>
                    <div className="flashcard-back">
                      <p>{lesson.flashcards[currentCard]?.back_text}</p>
                      <small className="text-secondary">Click to flip back</small>
                    </div>
                  </div>
                </div>
                <div className="flashcard-nav mt-3">
                  <Button
                    variant="outline-light" size="sm"
                    onClick={() => { setCurrentCard(Math.max(0, currentCard - 1)); setFlipped(false); }}
                    disabled={currentCard === 0}
                  >
                    <i className="bi bi-arrow-left me-1"></i>Previous
                  </Button>
                  <Button
                    variant="outline-light" size="sm"
                    onClick={() => { setCurrentCard(Math.min(lesson.flashcards.length - 1, currentCard + 1)); setFlipped(false); }}
                    disabled={currentCard === lesson.flashcards.length - 1}
                  >
                    Next<i className="bi bi-arrow-right ms-1"></i>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Exercises ── */}
        {activeSection === "exercises" && (
          <div className="exercises-section">
            {lesson.exercises?.length === 0 ? (
              <p className="text-secondary">No practice exercises for this lesson.</p>
            ) : (
              <>
                {lesson.exercises.map((ex, i) => (
                  <Card key={ex.id} className="exercise-card mb-3">
                    <Card.Body>
                      <div className="d-flex justify-content-between">
                        <h6 className="text-light">Question {i + 1}</h6>
                        <Badge bg={ex.difficulty === "EASY" ? "success" : ex.difficulty === "HARD" ? "danger" : "warning"}>
                          {ex.difficulty}
                        </Badge>
                      </div>
                      <p className="mt-2">{ex.question}</p>

                      {ex.question_type === "MCQ" && ex.options && (
                        <div className="exercise-options">
                          {Object.entries(typeof ex.options === 'string' ? JSON.parse(ex.options) : ex.options).map(([key, val]) => (
                            <Button
                              key={key}
                              variant={
                                showExerciseResults
                                  ? key === ex.correct_answer
                                    ? "success"
                                    : exerciseAnswers[i] === key
                                    ? "danger"
                                    : "outline-secondary"
                                  : exerciseAnswers[i] === key
                                  ? "primary"
                                  : "outline-secondary"
                              }
                              className="w-100 mb-2 text-start"
                              onClick={() => !showExerciseResults && setExerciseAnswers((p) => ({ ...p, [i]: key }))}
                            >
                              <strong>{key}.</strong> {val}
                            </Button>
                          ))}
                        </div>
                      )}

                      {ex.question_type === "TRUE_FALSE" && (
                        <div className="d-flex gap-2 mt-2">
                          {["True", "False"].map((opt) => (
                            <Button
                              key={opt}
                              variant={
                                showExerciseResults
                                  ? opt === ex.correct_answer ? "success" : exerciseAnswers[i] === opt ? "danger" : "outline-secondary"
                                  : exerciseAnswers[i] === opt ? "primary" : "outline-secondary"
                              }
                              onClick={() => !showExerciseResults && setExerciseAnswers((p) => ({ ...p, [i]: opt }))}
                            >
                              {opt}
                            </Button>
                          ))}
                        </div>
                      )}

                      {showExerciseResults && ex.explanation && (
                        <Alert variant="info" className="mt-2 small">
                          <strong>Explanation:</strong> {ex.explanation}
                        </Alert>
                      )}
                    </Card.Body>
                  </Card>
                ))}

                <div className="text-center mt-3">
                  {!showExerciseResults ? (
                    <Button variant="success" onClick={() => setShowExerciseResults(true)}>
                      <i className="bi bi-check2-all me-2"></i>Check Answers
                    </Button>
                  ) : (
                    <div>
                      <Alert variant={getExerciseScore().correct === getExerciseScore().total ? "success" : "info"}>
                        Score: {getExerciseScore().correct} / {getExerciseScore().total} ({Math.round((getExerciseScore().correct / getExerciseScore().total) * 100)}%)
                      </Alert>
                      <Button variant="outline-light" onClick={() => { setExerciseAnswers({}); setShowExerciseResults(false); }}>
                        <i className="bi bi-arrow-repeat me-2"></i>Retry
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Past Exams ── */}
        {activeSection === "exams" && (
          <div className="exams-section">
            {lesson.past_exam_questions?.length === 0 ? (
              <p className="text-secondary">No past exam questions available.</p>
            ) : (
              <Accordion>
                {lesson.past_exam_questions?.map((eq, i) => (
                  <Accordion.Item key={eq.id} eventKey={i.toString()}>
                    <Accordion.Header>
                      <Badge bg="info" className="me-2">{eq.exam_year}</Badge>
                      {eq.question.substring(0, 80)}...
                    </Accordion.Header>
                    <Accordion.Body>
                      <p className="text-light">{eq.question}</p>
                      {eq.options && (
                        <div className="mb-3">
                          {Object.entries(typeof eq.options === 'string' ? JSON.parse(eq.options) : eq.options).map(([k, v]) => (
                            <div key={k} className={`p-2 rounded mb-1 ${k === eq.correct_answer ? 'bg-success bg-opacity-25' : ''}`}>
                              <strong>{k}.</strong> {v} {k === eq.correct_answer && <i className="bi bi-check-circle-fill text-success ms-1"></i>}
                            </div>
                          ))}
                        </div>
                      )}
                      {eq.explanation && <Alert variant="info" className="small"><strong>Explanation:</strong> {eq.explanation}</Alert>}
                      {eq.source && <small className="text-secondary">Source: {eq.source}</small>}
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </div>
        )}

        {/* ── Files ── */}
        {activeSection === "files" && (
          <div className="files-section">
            {lesson.files?.length === 0 ? (
              <p className="text-secondary">No attached files.</p>
            ) : (
              lesson.files?.map((f) => (
                <Card key={f.id} className="file-card mb-2">
                  <Card.Body className="d-flex justify-content-between align-items-center">
                    <div>
                      <i className="bi bi-file-earmark me-2 text-info"></i>
                      <span className="text-light">{f.file_name}</span>
                      {f.description && <small className="text-secondary d-block ms-4">{f.description}</small>}
                    </div>
                    <a href={f.file_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success">
                      <i className="bi bi-download me-1"></i>Download
                    </a>
                  </Card.Body>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Navigation & Mark Complete */}
      <div className="lesson-footer">
        <div className="lesson-nav-buttons">
          {lesson.prev_lesson && (
            <Button variant="outline-light" size="sm" onClick={() => onNavigate(lesson.prev_lesson.id)}>
              <i className="bi bi-arrow-left me-1"></i>{lesson.prev_lesson.title}
            </Button>
          )}
          <div className="flex-grow-1"></div>
          {!isCompleted && (
            <Button variant="success" onClick={markComplete}>
              <i className="bi bi-check-circle me-2"></i>Mark as Completed
            </Button>
          )}
          {lesson.next_lesson && (
            <Button variant="outline-success" size="sm" onClick={() => onNavigate(lesson.next_lesson.id)} className="ms-2">
              {lesson.next_lesson.title}<i className="bi bi-arrow-right ms-1"></i>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Modal */}
      <Modal show={showSummaryModal} onHide={() => setShowSummaryModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-dark text-light border-secondary">
          <Modal.Title><i className="bi bi-magic me-2 text-info"></i>AI Summary</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-light">
          {lesson.summary?.content?.split("\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowSummaryModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Quiz Modal */}
      <Modal show={showQuizModal} onHide={() => setShowQuizModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-dark text-light border-secondary">
          <Modal.Title><i className="bi bi-patch-question me-2 text-warning"></i>AI Quiz</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-light">
          {(() => {
            const questions = lesson.quiz?.questions?.questions || lesson.quiz?.questions || [];
            if (questions.length === 0) return <p>No quiz available.</p>;

            if (showQuizResults) {
              const score = getQuizScore();
              return (
                <div className="text-center">
                  <h3 className={`text-${score.correct / score.total >= 0.7 ? "success" : score.correct / score.total >= 0.5 ? "warning" : "danger"}`}>
                    {Math.round((score.correct / score.total) * 100)}%
                  </h3>
                  <p>{score.correct} of {score.total} correct</p>
                  <ProgressBar
                    now={(score.correct / score.total) * 100}
                    variant={score.correct / score.total >= 0.7 ? "success" : "warning"}
                    className="mb-3"
                  />
                  {questions.map((q, i) => (
                    <div key={i} className="text-start p-3 mb-2 border rounded">
                      <p className="fw-bold">{q.question}</p>
                      <p className={quizAnswers[i] === q.correct_answer ? "text-success" : "text-danger"}>
                        Your answer: {quizAnswers[i] || "—"} {quizAnswers[i] === q.correct_answer ? "✓" : "✗"}
                      </p>
                      <p className="text-success small">Correct: {q.correct_answer}</p>
                      {q.explanation && <p className="text-info small">{q.explanation}</p>}
                    </div>
                  ))}
                </div>
              );
            }

            const q = questions[currentQuizQ];
            return (
              <div>
                <div className="d-flex justify-content-between mb-3">
                  <h6>Question {currentQuizQ + 1} of {questions.length}</h6>
                  <Badge bg="info">{Math.round(((currentQuizQ + 1) / questions.length) * 100)}%</Badge>
                </div>
                <h5 className="mb-3">{q.question}</h5>
                {q.options && Object.entries(q.options).map(([k, v]) => (
                  <Button
                    key={k}
                    variant={quizAnswers[currentQuizQ] === k ? "primary" : "outline-light"}
                    className="w-100 mb-2 text-start"
                    onClick={() => setQuizAnswers((p) => ({ ...p, [currentQuizQ]: k }))}
                  >
                    <strong>{k}.</strong> {v}
                  </Button>
                ))}
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary d-flex justify-content-between">
          {!showQuizResults ? (
            <>
              <Button variant="secondary" onClick={() => setCurrentQuizQ(Math.max(0, currentQuizQ - 1))} disabled={currentQuizQ === 0}>
                Previous
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const questions = lesson.quiz?.questions?.questions || lesson.quiz?.questions || [];
                  if (currentQuizQ === questions.length - 1) setShowQuizResults(true);
                  else setCurrentQuizQ(currentQuizQ + 1);
                }}
                disabled={!quizAnswers[currentQuizQ]}
              >
                {currentQuizQ === ((lesson.quiz?.questions?.questions || lesson.quiz?.questions || []).length - 1) ? "Finish" : "Next"}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setShowQuizModal(false)}>Close</Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default LessonReader;
