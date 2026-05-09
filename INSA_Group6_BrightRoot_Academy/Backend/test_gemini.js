require('dotenv').config();
async function run() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await response.json();
  if (data.models) {
     console.log("AVAILABLE MODELS:");
     data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).forEach(m => console.log(m.name, m.version));
  } else {
     console.log("ERROR FETCHING MODELS:", data);
  }
}
run();
