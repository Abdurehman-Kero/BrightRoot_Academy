const fs = require('fs');

const file = 'src/components/pages/UploadDocuments.jsx';
if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    const resultNew = `{quizQuestions.map((question, index) => (
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
                        
    if (content.includes("{quizQuestions.map((question, index) => (")) {
        const splitted = content.split("{quizQuestions.map((question, index) => (");
        if (splitted.length > 1) {
           const endIndex = splitted[1].indexOf("))}</div>");
           if (endIndex !== -1) {
              const chunkToReplace = splitted[1].substring(0, endIndex + 3);
              content = content.replace("{quizQuestions.map((question, index) => (" + chunkToReplace, resultNew);
              fs.writeFileSync(file, content);
              console.log('Update FE UploadDocuments quiz results completed.');
           }
        }
    }
}
