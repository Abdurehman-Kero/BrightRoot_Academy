const fs = require('fs');
const pdf = require('pdf-parse');

async function extractText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  
  if (typeof pdf === 'function') {
    const data = await pdf(dataBuffer);
    console.log("Success with function pdf():", data.text.substring(0, 100));
  } else if (pdf.PDFParse) {
    try {
      const data = await pdf.PDFParse(dataBuffer);
      console.log("Success with PDFParse function:", data.text.substring(0, 100));
    } catch (e1) {
      try {
        const parser = new pdf.PDFParse();
        const data = await parser.parse(dataBuffer);
        console.log("Success with PDFParse class:", data.text.substring(0, 100));
      } catch (e2) {
        console.error("Failed to parse using PDFParse:", e1, e2);
      }
    }
  }
}

// We need a dummy pdf file to test. Let's create one.
fs.writeFileSync('dummy.pdf', '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \n0000000304 00000 n \ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n397\n%%EOF\n');

extractText('dummy.pdf');
