const fs = require('fs');

const file = 'src/components/pages/SmartQuizzes.jsx';
if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Make sure we have ReactMarkdown for quiz feedback if needed.
    if (!content.includes('import ReactMarkdown from "react-markdown"')) {
      content = content.replace("import api from \"../../services/api\";", "import api from \"../../services/api\";\nimport ReactMarkdown from \"react-markdown\";\nimport remarkMath from \"remark-math\";\nimport rehypeKatex from \"rehype-katex\";\nimport \"katex/dist/katex.min.css\";");
    }

    // Usually quiz feedback is just a string, let's look for how quiz explanations are rendered:
    // we want to ensure feedback looks good.
    const explOld = `<p className="mt-2 mb-0">
                          <strong>Explanation:</strong>{" "}
                          {currentQuiz.questions[currentQuestionIndex].explanation}
                        </p>`;
    const explNew = `<div className="mt-3 p-3 bg-light rounded shadow-sm border border-info">
                          <h6 className="text-info fw-bold mb-2">💡 Explanation</h6>
                          <div style={{ fontSize: '0.95rem' }}>
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {currentQuiz.questions[currentQuestionIndex].explanation}
                            </ReactMarkdown>
                          </div>
                      </div>`;
                      
    if (content.includes(explOld) || content.includes("<strong>Explanation:</strong>")) {
        // Let's replace the whole tag.
        content = content.replace(explOld, explNew);
        fs.writeFileSync(file, content);
        console.log('Update SmartQuizzes.jsx component done.');
    } else {
        console.log('summary html not found or already changed in SmartQuizzes.jsx. Will try regex.');
        const updated = content.replace(/<p[^>]*>\s*<strong>Explanation:<\/strong>[\s\S]*?<\/p>/g, explNew);
        if (updated !== content) {
          fs.writeFileSync(file, updated);
          console.log('Replaced custom regex in SmartQuizzes.jsx');
        }
    }
} else {
    console.log('SmartQuizzes.jsx does not exist.');
}
