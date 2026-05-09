const fs = require('fs');

const file = 'src/components/pages/Dashboard.jsx';
if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Make sure we have ReactMarkdown for quiz feedback if needed.
    const explOld = `<p className="mt-2 text-muted">
                        <strong>Explanation:</strong>{" "}
                        {currentQuiz.questions[currentQuestionIndex].explanation}
                      </p>`;
    const explNew = `<div className="mt-3 p-3 bg-light rounded border border-info">
                        <h6 className="text-info fw-bold mb-2">💡 Explanation</h6>
                        <div style={{ fontSize: '0.95rem' }}>
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {currentQuiz.questions[currentQuestionIndex].explanation}
                          </ReactMarkdown>
                        </div>
                    </div>`;

    let changes = false;
    let newContent = content;
    
    // Replace custom matched text for explanation in Dashboard.jsx
    if (newContent.includes('<strong>Explanation:</strong>')) {
        newContent = newContent.replace(/<p[^>]*>\s*<strong>Explanation:<\/strong>[\s\S]*?<\/p>/g, explNew);
        changes = true;
    }
    
    if (changes) {
        fs.writeFileSync(file, newContent);
        console.log('Update Dashboard quizzes component done.');
    } else {
        console.log('No explanation field found in Dashboard.jsx to replace.');
    }
}
