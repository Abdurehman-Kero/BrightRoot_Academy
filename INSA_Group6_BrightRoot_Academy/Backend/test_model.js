require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModel(modelName) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say exactly: "Test Successful"');
    console.log(`[${modelName}] SUCCESS:`, result.response.text());
  } catch (error) {
    console.error(`[${modelName}] ERROR MESSAGE:`, error.message.split('\n')[0]);
  }
}
async function runAll() {
  await testModel('gemini-2.5-flash');
  await testModel('gemini-flash-latest');
  await testModel('gemini-2.0-flash-lite-001');
}
runAll();
