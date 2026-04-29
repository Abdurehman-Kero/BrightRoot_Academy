import React, { useState, useEffect } from "react";
import { Accordion, Badge, Spinner } from "react-bootstrap";
import axios from "axios";
import "./CurriculumSidebar.css";

const CurriculumSidebar = ({
  subjectId,
  gradeId,
  activeLessonId,
  onLessonSelect,
  token,
}) => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUnits, setExpandedUnits] = useState([]);
  const [expandedChapters, setExpandedChapters] = useState([]);

  useEffect(() => {
    if (subjectId && gradeId) {
      loadSidebar();
    }
  }, [subjectId, gradeId]);

  const loadSidebar = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(
        `http://localhost:8000/api/curriculum/sidebar/?subject_id=${subjectId}&grade_id=${gradeId}`,
        { headers }
      );
      setTree(response.data);
      // Auto-expand first unit
      if (response.data.length > 0) {
        setExpandedUnits([response.data[0].id.toString()]);
        if (response.data[0].chapters?.length > 0) {
          setExpandedChapters([response.data[0].chapters[0].id.toString()]);
        }
      }
    } catch (error) {
      console.error("Failed to load sidebar:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="sidebar-loading">
        <Spinner animation="border" variant="success" size="sm" />
        <span className="ms-2">Loading curriculum...</span>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="sidebar-empty">
        <i className="bi bi-journal-x"></i>
        <p>No content available yet.</p>
      </div>
    );
  }

  return (
    <div className="curriculum-sidebar">
      <div className="sidebar-header">
        <h6>
          <i className="bi bi-list-nested me-2"></i>
          Course Content
        </h6>
      </div>

      <Accordion
        activeKey={expandedUnits}
        onSelect={(keys) => setExpandedUnits(keys || [])}
        alwaysOpen
      >
        {tree.map((unit) => (
          <Accordion.Item key={unit.id} eventKey={unit.id.toString()}>
            <Accordion.Header>
              <div className="unit-header">
                <span className="unit-title">{unit.title}</span>
                <Badge bg="secondary" className="ms-2">
                  {unit.chapters?.reduce(
                    (sum, ch) => sum + (ch.lessons?.length || 0),
                    0
                  )}{" "}
                  lessons
                </Badge>
              </div>
            </Accordion.Header>
            <Accordion.Body className="p-0">
              <Accordion
                activeKey={expandedChapters}
                onSelect={(keys) => setExpandedChapters(keys || [])}
                alwaysOpen
              >
                {unit.chapters?.map((chapter) => (
                  <Accordion.Item
                    key={chapter.id}
                    eventKey={chapter.id.toString()}
                  >
                    <Accordion.Header>
                      <span className="chapter-title">{chapter.title}</span>
                    </Accordion.Header>
                    <Accordion.Body className="p-0">
                      <div className="lesson-list">
                        {chapter.lessons?.map((lesson) => (
                          <div
                            key={lesson.id}
                            className={`lesson-item ${
                              activeLessonId === lesson.id ? "active" : ""
                            } ${lesson.is_completed ? "completed" : ""}`}
                            onClick={() => onLessonSelect(lesson.id)}
                          >
                            <div className="lesson-status">
                              {lesson.is_completed ? (
                                <i className="bi bi-check-circle-fill text-success"></i>
                              ) : (
                                <i className="bi bi-circle"></i>
                              )}
                            </div>
                            <div className="lesson-info">
                              <span className="lesson-name">
                                {lesson.title}
                              </span>
                              <span className="lesson-duration">
                                <i className="bi bi-clock me-1"></i>
                                {lesson.duration_minutes} min
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  );
};

export default CurriculumSidebar;
