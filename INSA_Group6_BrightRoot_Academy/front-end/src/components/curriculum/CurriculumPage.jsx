import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Button, Spinner, ProgressBar } from "react-bootstrap";
import axios from "axios";
import CurriculumSidebar from "./CurriculumSidebar";
import LessonReader from "./LessonReader";
import "./CurriculumPage.css";

const API = "http://localhost:8000/api";

const CurriculumPage = ({ onBack, token }) => {
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const apiHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    loadSubjectsAndGrades();
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedGrade) {
      loadProgress();
    }
  }, [selectedSubject, selectedGrade]);

  const loadSubjectsAndGrades = async () => {
    try {
      const [subRes, gradeRes] = await Promise.all([
        axios.get(`${API}/curriculum/subjects/`),
        axios.get(`${API}/curriculum/grades/`),
      ]);
      setSubjects(subRes.data);
      setGrades(gradeRes.data);
    } catch (error) {
      console.error("Failed to load subjects/grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const res = await axios.get(
        `${API}/curriculum/progress/?subject_id=${selectedSubject.id}&grade_id=${selectedGrade.id}`,
        { headers: apiHeaders }
      );
      setProgress(res.data.stats);
    } catch (error) {
      console.error("Failed to load progress:", error);
    }
  };

  // Subject + Grade selector view
  if (!selectedSubject || !selectedGrade) {
    return (
      <div className="curriculum-selector">
        <Container fluid className="py-5">
          <div className="text-center mb-5">
            <Button variant="outline-light" onClick={onBack} className="mb-4" size="sm">
              <i className="bi bi-arrow-left me-2"></i>Back to Dashboard
            </Button>
            <h2 className="text-light">
              <i className="bi bi-book-half me-2 text-success"></i>
              Curriculum Library
            </h2>
            <p className="text-secondary">
              Select your subject and grade to start learning
            </p>
          </div>

          {loading ? (
            <div className="text-center">
              <Spinner animation="border" variant="success" />
            </div>
          ) : (
            <>
              {/* Grade Selection */}
              {!selectedGrade && (
                <div className="mb-5">
                  <h5 className="text-center text-light mb-4">
                    {selectedSubject ? "Now select your grade" : "Select your grade"}
                  </h5>
                  <Row className="justify-content-center">
                    {grades.map((grade) => (
                      <Col key={grade.id} xs={6} md={3} className="mb-3">
                        <Card
                          className="grade-card text-center"
                          onClick={() => setSelectedGrade(grade)}
                          style={{ cursor: "pointer" }}
                        >
                          <Card.Body>
                            <h1 className="grade-number">{grade.grade_level}</h1>
                            <h6 className="text-light">{grade.label}</h6>
                            <small className="text-secondary">{grade.description}</small>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              {/* Subject Selection */}
              {selectedGrade && !selectedSubject && (
                <div>
                  <div className="text-center mb-3">
                    <Badge bg="success" className="px-3 py-2">
                      {selectedGrade.label}
                    </Badge>
                    <Button
                      variant="link"
                      className="text-secondary ms-2"
                      onClick={() => setSelectedGrade(null)}
                    >
                      Change
                    </Button>
                  </div>
                  <h5 className="text-center text-light mb-4">Choose a subject</h5>
                  <Row className="justify-content-center">
                    {subjects.map((subject) => (
                      <Col key={subject.id} xs={6} md={4} lg={3} className="mb-3">
                        <Card
                          className="subject-select-card text-center"
                          onClick={() => setSelectedSubject(subject)}
                          style={{
                            cursor: "pointer",
                            borderColor: subject.color,
                          }}
                        >
                          <Card.Body>
                            <i
                              className={`bi ${subject.icon}`}
                              style={{ fontSize: "2.5rem", color: subject.color }}
                            ></i>
                            <h6 className="text-light mt-2">{subject.name}</h6>
                            <small className="text-secondary">
                              {subject.description}
                            </small>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </>
          )}
        </Container>
      </div>
    );
  }

  // Main learning view with sidebar + reader
  return (
    <div className="curriculum-layout">
      {/* Top bar */}
      <div className="curriculum-topbar">
        <div className="topbar-left">
          <Button
            variant="link"
            className="text-secondary"
            onClick={() => {
              setSelectedSubject(null);
              setSelectedGrade(null);
              setActiveLessonId(null);
            }}
          >
            <i className="bi bi-arrow-left me-1"></i>Back
          </Button>
          <Badge
            style={{ backgroundColor: selectedSubject.color }}
            className="ms-2"
          >
            <i className={`bi ${selectedSubject.icon} me-1`}></i>
            {selectedSubject.name}
          </Badge>
          <Badge bg="dark" className="ms-1">
            {selectedGrade.label}
          </Badge>
        </div>
        {progress && (
          <div className="topbar-progress">
            <small className="text-secondary me-2">
              {progress.completed_lessons}/{progress.total_lessons} lessons
            </small>
            <ProgressBar
              now={progress.completion_percent}
              variant="success"
              style={{ width: "120px", height: "6px" }}
            />
            <small className="text-success ms-2">{progress.completion_percent}%</small>
          </div>
        )}
      </div>

      <div className="curriculum-body">
        {/* Sidebar */}
        <div className="curriculum-sidebar-container">
          <CurriculumSidebar
            subjectId={selectedSubject.id}
            gradeId={selectedGrade.id}
            activeLessonId={activeLessonId}
            onLessonSelect={(id) => setActiveLessonId(id)}
            token={token}
          />
        </div>

        {/* Main Content */}
        <div className="curriculum-content-container">
          {activeLessonId ? (
            <LessonReader
              lessonId={activeLessonId}
              token={token}
              onNavigate={(id) => setActiveLessonId(id)}
            />
          ) : (
            <div className="no-lesson-selected">
              <i className="bi bi-book-half"></i>
              <h4>Select a Lesson</h4>
              <p className="text-secondary">
                Choose a lesson from the sidebar to start learning
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurriculumPage;
