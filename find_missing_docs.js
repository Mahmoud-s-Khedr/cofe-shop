const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.controller.ts');
let totalMethods = 0;
let missingDocs = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\s*@(Get|Post|Patch|Delete|Put)\b/)) {
      totalMethods++;
      // Check previous lines for Api tags
      let hasApiRes = false;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        if (lines[j].includes('@ApiResponse') || lines[j].includes('@ApiOkResponse') || lines[j].includes('@ApiCreatedResponse')) {
          hasApiRes = true;
          break;
        }
      }
      if (!hasApiRes) {
        // Find method name
        const methodLine = lines[i+1];
        const methodName = methodLine ? methodLine.trim().split('(')[0] : 'unknown';
        console.log(`Missing docs in ${file}: ${line.trim()} -> ${methodName}`);
        missingDocs++;
      }
    }
  }
}

console.log(`Total missing: ${missingDocs}/${totalMethods}`);
