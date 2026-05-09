const fs = require('fs');

const file = 'controllers/aiController.js';
let content = fs.readFileSync(file, 'utf8');

const summaryPromptOld = `    const prompt = \`\n      Please provide a comprehensive summary of the attached educational document:\n      \n      Subject: \${fileObj.subject}\n      Grade: \${fileObj.grade}\n      Title: \${fileObj.title}\n      \n      Please provide:\n      1. A concise summary (2-3 paragraphs)\n      2. Key concepts and main points\n      3. Important definitions or formulas\n      4. Study recommendations\n      \n      Format the response in a clear, educational manner suitable for students.\n    \`;`;

const summaryPromptNew = `    const prompt = \`
      Please provide a comprehensive summary of the attached educational document:
      
      Subject: \${fileObj.subject}
      Grade: \${fileObj.grade}
      Title: \${fileObj.title}
      
      Please provide the response fully formatted in Markdown, using bullet points, bold text for emphasis, and proper headings (e.g., ### Key Concepts). Use Markdown tables if helpful.
      Include:
      1. A concise summary (2-3 short paragraphs)
      2. Key concepts and main points (as bullet points)
      3. Important definitions or formulas
      4. Study recommendations
      
      Make it highly visual and easy to scan for a student.
    \`;`;

content = content.replace(summaryPromptOld, summaryPromptNew);

fs.writeFileSync(file, content);
console.log('Update prompt completed.');
