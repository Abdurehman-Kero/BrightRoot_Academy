const fs = require('fs');
const file = 'src/components/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldSyntax = `{quizQuestions.map((question, index) => (
                          <div key={index} className="text-start mb-4 p-3 border rounded shadow-sm bg-white">
                            <h6 className="fw-bold mb-3">
                              {index + 1}. {question.question}
                            </h6>
                            <p
                              className={\`mb-2 \${
                                userAnswers[index] === question.correct_answer
                                  ? "text-success fw-bold"
                                  : "text-danger"
                              }\`}
                            >
                              <strong>Your Answer:</strong>{" "}
                              {userAnswers[index]
                                ? question.options[userAnswers[index]]
                                : "No answer"}
                            </p>
                            <p className="mb-2">
                              <strong>Correct Answer:</strong>{" "}
                              {question.correct_answer}
                            </p>
                            <p className="  small">{question.explanation}</p>
                          </div>
                        ))}`;

const newSyntax = `{quizQuestions.map((question, index) => (
                          <div key={index} className="text-start mb-4 p-3 bg-light rounded shadow-sm">
                            <p className="fw-bold mb-2">
                              {index + 1}. {question.question}
                            </p>
                            <p className={\`mb-1 \${userAnswers[index] === question.correct_answer ? 'text-success fw-bold' : 'text-danger'}\`}>
                              Your answer: {question.options[userAnswers[index]] || 'Not answered'}
                            </p>
                            {userAnswers[index] !== question.correct_answer && (
                              <p className="text-success mb-2 fw-bold">
                                Correct answer: {question.options[question.correct_answer]}
                              </p>
                            )}
                            {question.explanation && (
                              <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#e9f7fe', borderLeft: '4px solid #0dcaf0' }}>
                                <small className="fw-bold text-info"><i className="bi bi-lightbulb-fill me-1"></i>Explanation:</small>
                                <div className="mt-1 small text-dark">
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {question.explanation}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}`;

content = content.replace(oldSyntax, newSyntax);
fs.writeFileSync(file, content);
console.log('Fixed final Dashboard quiz display.');
