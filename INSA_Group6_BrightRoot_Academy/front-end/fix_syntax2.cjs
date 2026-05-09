const fs = require('fs');
const file = 'c:/Users/LEGION/Desktop/BrightRootAcademy/INSA_Group6_BrightRoot_Academy/front-end/src/components/pages/Dashboard.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

// Remove lines from 721 to 734
lines.splice(720, 14, '                        ))}');
fs.writeFileSync(file, lines.join('\n'));
console.log('Lines replaced.');
