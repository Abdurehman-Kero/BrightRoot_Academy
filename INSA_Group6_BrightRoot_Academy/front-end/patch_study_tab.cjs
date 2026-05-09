const fs = require('fs');
const file = 'c:/Users/LEGION/Desktop/BrightRootAcademy/INSA_Group6_BrightRoot_Academy/front-end/src/components/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add view functions
const functionsToAdd = `
  const handleViewSummary = (summary) => {
    setCurrentSummary(summary.content);
    setShowSummaryModal(true);
  };

  const handleViewQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    // Handle both { questions: [...] } and [...] structures from DB vs generation
    const questionsList = Array.isArray(quiz.questions) ? quiz.questions : (quiz.questions?.questions || []);
    setQuizQuestions(questionsList);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setShowQuizResults(false);
    setShowQuizModal(true);
  };
`;

if (!content.includes('handleViewSummary')) {
  // Inject right before handleQuizAnswer
  content = content.replace('const handleQuizAnswer = (answer) => {', functionsToAdd + '\n  const handleQuizAnswer = (answer) => {');
}

// 2. Replace the AI Summaries render block
const newSummariesBlock = `
        {/* AI Summaries */}
        <Card className="mb-4 shadow-sm border-0 bg-white">
          <Card.Header className="bg-white border-bottom border-light pt-4 pb-3">
            <h5 className="mb-0 fw-bold text-primary">
              <i className="bi bi-journal-text me-3 fs-4 align-middle"></i>
              My Last-Minute Summaries
            </h5>
          </Card.Header>
          <Card.Body className="bg-light bg-opacity-50">
            {summaries.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-inbox fs-2 mb-2 d-block"></i>
                <p className="mb-0">No summaries yet. Generate one to prep for exams!</p>
              </div>
            ) : (
              <Row className="g-3">
                {summaries.map((summary) => (
                  <Col md={6} lg={4} key={summary.id}>
                    <Card className="h-100 border-0 shadow-sm hover-lift transition-all" style={{ cursor: 'pointer' }} onClick={() => handleViewSummary(summary)}>
                      <Card.Body className="d-flex flex-column">
                        <div className="d-flex align-items-start mb-2">
                          <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3 text-primary">
                            <i className="bi bi-lightbulb-fill fs-5"></i>
                          </div>
                          <div>
                            <h6 className="mb-1 fw-bold text-truncate" title={summary.file_title}>{summary.file_title}</h6>
                            <span className="badge bg-secondary bg-opacity-10 text-secondary border mr-2">{summary.subject}</span>
                          </div>
                        </div>
                        <p className="text-muted small mb-3 flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          Preview...
                        </p>
                        <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top border-light">
                          <small className="text-muted"><i className="bi bi-clock me-1"></i>{new Date(summary.created_at).toLocaleDateString()}</small>
                          <Button size="sm" variant="outline-primary" className="rounded-pill px-3" onClick={(e) => { e.stopPropagation(); handleViewSummary(summary); }}>
                            Review
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card.Body>
        </Card>
`;

const oldSummariesRegex = /\{\/\* AI Summaries \*\/\}.*?\{\/\* AI Quizzes \*\/\}/s;
content = content.replace(oldSummariesRegex, newSummariesBlock + '\n        {/* AI Quizzes */}');

// 3. Replace the AI Quizzes render block
const newQuizzesBlock = `
        {/* AI Quizzes */}
        <Card className="shadow-sm border-0 bg-white mb-4">
          <Card.Header className="bg-white border-bottom border-light pt-4 pb-3">
            <h5 className="mb-0 fw-bold text-success">
              <i className="bi bi-controller me-3 fs-4 align-middle"></i>
              My Practice Quizzes
            </h5>
          </Card.Header>
          <Card.Body className="bg-light bg-opacity-50">
            {quizzes.length === 0 ? (
               <div className="text-center py-4 text-muted">
                <i className="bi bi-inbox fs-2 mb-2 d-block"></i>
                <p className="mb-0">No quizzes generated yet. Test your knowledge!</p>
              </div>
            ) : (
               <Row className="g-3">
                {quizzes.map((quiz) => (
                  <Col md={6} lg={4} key={quiz.id}>
                    <Card className="h-100 border-0 shadow-sm hover-lift transition-all" style={{ cursor: 'pointer' }} onClick={() => handleViewQuiz(quiz)}>
                      <Card.Body className="d-flex flex-column">
                        <div className="d-flex align-items-start mb-3">
                          <div className="bg-success bg-opacity-10 p-2 rounded-3 me-3 text-success">
                            <i className="bi bi-patch-question-fill fs-5"></i>
                          </div>
                          <div>
                            <h6 className="mb-1 fw-bold text-truncate" title={quiz.file_title}>{quiz.file_title}</h6>
                            <span className="badge bg-secondary bg-opacity-10 text-secondary border">{quiz.subject}</span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center mb-3 text-dark small fw-bold">
                           <i className="bi bi-list-task text-success me-2"></i>
                           {Array.isArray(quiz.questions) ? quiz.questions.length : (quiz.questions?.questions?.length || 0)} Questions
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top border-light">
                          <small className="text-muted"><i className="bi bi-clock me-1"></i>{new Date(quiz.created_at).toLocaleDateString()}</small>
                          <Button size="sm" variant="outline-success" className="rounded-pill px-3" onClick={(e) => { e.stopPropagation(); handleViewQuiz(quiz); }}>
                            Practice
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card.Body>
        </Card>
`;

const oldQuizzesRegex = /\{\/\* AI Quizzes \*\/\}.*?<\/div>\s*\)\;/s;
content = content.replace(oldQuizzesRegex, newQuizzesBlock + '\n      </div>\n    );');

fs.writeFileSync(file, content);
console.log('UI updated for Study Material tab');
