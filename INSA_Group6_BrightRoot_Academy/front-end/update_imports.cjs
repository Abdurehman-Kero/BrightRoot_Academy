const fs = require('fs');
const file = 'c:/Users/LEGION/Desktop/BrightRootAcademy/INSA_Group6_BrightRoot_Academy/front-end/src/components/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import ReactMarkdown')) {
    content = content.replace(
        'import "./Dashboard.css";',
        `import "./Dashboard.css";\nimport ReactMarkdown from "react-markdown";\nimport remarkMath from "remark-math";\nimport rehypeKatex from "rehype-katex";\nimport "katex/dist/katex.min.css";`
    );
    fs.writeFileSync(file, content);
    console.log('Imports added successfully.');
} else {
    console.log('Imports already exist.');
}
