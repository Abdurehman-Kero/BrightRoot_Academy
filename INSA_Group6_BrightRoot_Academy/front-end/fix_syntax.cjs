const fs = require('fs');
const file = 'c:/Users/LEGION/Desktop/BrightRootAcademy/INSA_Group6_BrightRoot_Academy/front-end/src/components/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\}\)\)[ \t]*<div key=\{index\}[^>]*>[\s\S]*?className="  small">\{question\.explanation\}<\/p>\s*<\/div>\s*\)\)\}/m;

if (regex.test(content)) {
    content = content.replace(regex, '))}');
    fs.writeFileSync(file, content);
    console.log('Fixed overlapping components log.');
} else {
    console.log('Could not find the target string');
}
