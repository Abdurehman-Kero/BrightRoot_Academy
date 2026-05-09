const fs = require('fs');

const file = 'src/components/pages/UploadDocuments.jsx';
if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add ReactMarkdown and dependencies if not present
    if (!content.includes('import ReactMarkdown from "react-markdown"')) {
      content = content.replace("import api, { fileApi } from \"../../services/api\";", "import api, { fileApi } from \"../../services/api\";\nimport ReactMarkdown from \"react-markdown\";\nimport remarkMath from \"remark-math\";\nimport rehypeKatex from \"rehype-katex\";\nimport \"katex/dist/katex.min.css\";");
    }

    // Replace basic p tag rendering with markdown if it exists
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
          
    if (content.includes(summaryRenderOld)) {
        content = content.replace(summaryRenderOld, summaryRenderNew);
        fs.writeFileSync(file, content);
        console.log('Update UploadDocuments.jsx component done.');
    } else {
        console.log('summary html not found or already changed in UploadDocuments.jsx.');
    }
} else {
    console.log('UploadDocuments.jsx does not exist.');
}
