const fs = require('fs');
const file = 'src/components/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure ReactMarkdown is imported
if (!content.includes('import ReactMarkdown from "react-markdown"')) {
  // Insert exactly after the generic imports block, before container/modal imports if possible, or right under the last import
  content = content.replace("import api, { fileApi } from \"../../services/api\";", "import api, { fileApi } from \"../../services/api\";\nimport ReactMarkdown from \"react-markdown\";\nimport remarkMath from \"remark-math\";\nimport rehypeKatex from \"rehype-katex\";\nimport \"katex/dist/katex.min.css\";");
}

// Replace the summary render
const summaryRenderOld = `<div className="summary-content">
            {currentSummary.split("\\n").map((paragraph, index) => (
              <p key={index} className="mb-3">
                {paragraph}
              </p>
            ))}
          </div>`;
          
const summaryRenderNew = `<div className="summary-content">
            <ReactMarkdown 
               remarkPlugins={[remarkMath]} 
               rehypePlugins={[rehypeKatex]}
               components={{
                 h1: ({node, ...props}) => <h3 className="mt-3 mb-2 fw-bold text-primary" {...props} />,
                 h2: ({node, ...props}) => <h4 className="mt-3 mb-2 fw-bold text-secondary" {...props} />,
                 h3: ({node, ...props}) => <h5 className="mt-2 mb-2 fw-bold" {...props} />,
                 ul: ({node, ...props}) => <ul className="ps-4 mb-3" {...props} />,
                 li: ({node, ...props}) => <li className="mb-1" {...props} />,
                 p: ({node, ...props}) => <p className="mb-3" {...props} />
               }}
            >
              {currentSummary}
            </ReactMarkdown>
          </div>`;

content = content.replace(summaryRenderOld, summaryRenderNew);

fs.writeFileSync(file, content);
console.log('Update FE summary render completed.');
