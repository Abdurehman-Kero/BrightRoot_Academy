const fs = require('fs');
const file = 'src/components/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const summaryRenderOld = `<div className="summary-content">
            {currentSummary.split("\\n").map((paragraph, index) => (
              <p key={index} className="mb-3">
                {paragraph}
              </p>
            ))};
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

if (content.includes('{currentSummary.split("\\n").map((paragraph, index) => (')) {
   const replaced = content.replace(/<div className="summary-content">[\s\S]*?<\/div>/, summaryRenderNew);
   fs.writeFileSync(file, replaced);
   console.log('Fixed Summary Markdown formatting in Dashboard.jsx');
}
