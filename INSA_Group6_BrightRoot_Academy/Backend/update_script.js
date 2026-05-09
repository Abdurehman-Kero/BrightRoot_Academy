const fs = require('fs');

const file = 'controllers/aiController.js';
let content = fs.readFileSync(file, 'utf8');

// Add fs and path if not present
if (!content.includes("const fs = require('fs')")) {
  content = content.replace("const { pool } = require('../config/database');", "const { pool } = require('../config/database');\nconst fs = require('fs');\nconst path = require('path');");
}

// Function to replace dummy content in generateSummary
const summaryOld = `    const fileObj = files[0];\n\n    // For now, use placeholder content (same as Django version)\n    const fileContent = \`Content from \${fileObj.title} - \${fileObj.subject} for \${fileObj.grade}\`;\n\n    // Generate summary using Gemini\n    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });\n    const prompt = \`\n      Please provide a comprehensive summary of the following educational content:\n      \n      Subject: \${fileObj.subject}\n      Grade: \${fileObj.grade}\n      Title: \${fileObj.title}\n      \n      Content: \${fileContent}\n      \n      Please provide:\n      1. A concise summary (2-3 paragraphs)\n      2. Key concepts and main points\n      3. Important definitions or formulas\n      4. Study recommendations\n      \n      Format the response in a clear, educational manner suitable for students.\n    \`;\n\n    const result = await model.generateContent(prompt);\n    const summaryContent = result.response.text();\n\n    // Save summary to database`;

const summaryNew = `    const fileObj = files[0];

    // Generate summary using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Check if real file exists
    let filePart = null;
    let fileContent = \`Content from \${fileObj.title} - \${fileObj.subject} for \${fileObj.grade}\`;
    
    if (fileObj.file_path && fs.existsSync(fileObj.file_path)) {
      try {
        const ext = path.extname(fileObj.file_name).toLowerCase();
        let mimeType = 'application/pdf';
        if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.txt') mimeType = 'text/plain';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else mimeType = 'application/pdf'; // Default fallback
        
        const fileData = fs.readFileSync(fileObj.file_path).toString('base64');
        filePart = {
          inlineData: {
            data: fileData,
            mimeType: mimeType
          }
        };
        fileContent = '[File Content Attached]';
      } catch (err) {
        console.error('Error reading file for Gemini:', err);
      }
    }

    const prompt = \`
      Please provide a comprehensive summary of the attached educational document:
      
      Subject: \${fileObj.subject}
      Grade: \${fileObj.grade}
      Title: \${fileObj.title}
      
      Please provide:
      1. A concise summary (2-3 paragraphs)
      2. Key concepts and main points
      3. Important definitions or formulas
      4. Study recommendations
      
      Format the response in a clear, educational manner suitable for students.
    \`;

    const contents = filePart 
      ? [{ role: 'user', parts: [{ text: prompt }, filePart] }]
      : [{ role: 'user', parts: [{ text: prompt + "\\n\\nFallback description: " + fileContent }] }];

    const result = await model.generateContent({ contents });
    const summaryContent = result.response.text();

    // Save summary to database`;

// Replace in summary
content = content.replace(summaryOld, summaryNew);

// Generate Quiz replacement
const quizOld = `    const fileObj = files[0];\n    const fileContent = \`Content from \${fileObj.title} - \${fileObj.subject} for \${fileObj.grade}\`;\n\n    // Generate quiz using Gemini\n    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });\n    const prompt = \`\n      Please create a \${num_questions}-question quiz based on the following educational content:\n      \n      Subject: \${fileObj.subject}\n      Grade: \${fileObj.grade}\n      Title: \${fileObj.title}\n      \n      Content: \${fileContent}\n      \n      Please provide:\n      1. \${num_questions} multiple choice questions\n      2. 4 answer choices for each question (A, B, C, D)\n      3. The correct answer for each question\n      4. A brief explanation for each correct answer\n      \n      Format the response as a JSON object with this structure:\n      {\n          "questions": [\n              {\n                  "question": "Question text here?",\n                  "options": {\n                      "A": "Option A",\n                      "B": "Option B",\n                      "C": "Option C",\n                      "D": "Option D"\n                  },\n                  "correct_answer": "A",\n                  "explanation": "Explanation of why this is correct"\n              }\n          ]\n      }\n      \n      Make sure the questions are appropriate for the grade level and subject.\n      Return ONLY the JSON object, no additional text.\n    \`;\n\n    const result = await model.generateContent(prompt);\n    const quizContent = result.response.text();\n\n    // Try to parse the response as JSON`;

const quizNew = `    const fileObj = files[0];

    // Generate quiz using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    let filePart = null;
    let fileContent = \`Content from \${fileObj.title} - \${fileObj.subject} for \${fileObj.grade}\`;
    
    if (fileObj.file_path && fs.existsSync(fileObj.file_path)) {
      try {
        const ext = path.extname(fileObj.file_name).toLowerCase();
        let mimeType = 'application/pdf';
        if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.txt') mimeType = 'text/plain';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else mimeType = 'application/pdf';
        
        const fileData = fs.readFileSync(fileObj.file_path).toString('base64');
        filePart = {
          inlineData: {
            data: fileData,
            mimeType: mimeType
          }
        };
        fileContent = '[File Content Attached]';
      } catch (err) {
        console.error('Error reading file for Gemini:', err);
      }
    }

    const prompt = \`
      Please create a \${num_questions}-question quiz based on the attached educational document:
      
      Subject: \${fileObj.subject}
      Grade: \${fileObj.grade}
      Title: \${fileObj.title}
      
      Please provide:
      1. \${num_questions} multiple choice questions
      2. 4 answer choices for each question (A, B, C, D)
      3. The correct answer for each question
      4. A brief explanation for each correct answer
      
      Format the response as a JSON object with this structure:
      {
          "questions": [
              {
                  "question": "Question text here?",
                  "options": {
                      "A": "Option A",
                      "B": "Option B",
                      "C": "Option C",
                      "D": "Option D"
                  },
                  "correct_answer": "A",
                  "explanation": "Explanation of why this is correct"
              }
          ]
      }
      
      Make sure the questions are appropriate for the grade level and subject.
      Return ONLY the JSON object, no additional text.
    \`;

    const contents = filePart 
      ? [{ role: 'user', parts: [{ text: prompt }, filePart] }]
      : [{ role: 'user', parts: [{ text: prompt + "\\n\\nFallback content: " + fileContent }] }];

    const result = await model.generateContent({ contents });
    const quizContent = result.response.text();

    // Try to parse the response as JSON`;

content = content.replace(quizOld, quizNew);

fs.writeFileSync(file, content);
console.log('Update script completed.');
