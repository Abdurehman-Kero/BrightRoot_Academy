const fs = require('fs');
const file = 'c:/Users/LEGION/Desktop/BrightRootAcademy/INSA_Group6_BrightRoot_Academy/Backend/controllers/aiController.js';
let content = fs.readFileSync(file, 'utf8');

const oldPromptBlock = `    const prompt = \`
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

const newPromptBlock = `    const prompt = \`
      Please provide a comprehensive, highly engaging summary of the attached educational document:
      
      Subject: \${fileObj.subject}
      Grade: \${fileObj.grade}
      Title: \${fileObj.title}
      
      Your goal is to create the ultimate last-minute Exam Preparation guide that is incredibly easy to memorize.
      DO NOT generate a boring wall of text. Use extremely visual Markdown formatting!
      
      Include the following sections with exact Markdown headings:
      
      ### 📝 The Core Idea
      Provide a concise, 1-2 paragraph intuitive summary of the main topic.
      
      ### 🎯 Key Bullet Points
      List the absolute most important facts using bullet points \`-\`. Use **bold text** to highlight keywords.
      
      ### 🧠 Memorization Hacks (Mnemonics)
      Provide clever memory hooks, acronyms, or analogies to help the student easily remember the core concepts for their exam.
      
      ### 📐 Formulas & Definitions
      Use Markdown tables or blockquotes for clear, scannable definitions and formulas. If there's math, use LaTeX ($$...).
      
      Make it fun to read, deeply relevant to \${fileObj.subject}, and visually perfectly structured!
    \`;`;

content = content.replace(oldPromptBlock, newPromptBlock);
fs.writeFileSync(file, content);
console.log('AI Controller prompt enhanced!');
