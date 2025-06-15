const fs = require('fs');

const quotesPath = 'app/src/quotes.ts';
const readmePath = 'README.md';

const tsContent = fs.readFileSync(quotesPath, 'utf8');

// Extract array portion from the TypeScript file
const start = tsContent.indexOf('[');
const end = tsContent.lastIndexOf(']') + 1;
if (start === -1 || end === -1) {
  throw new Error('Could not locate quotes array in quotes.ts');
}
const jsonContent = tsContent.slice(start, end);
const quotes = JSON.parse(jsonContent);

const readme = fs.readFileSync(readmePath, 'utf8');
const lines = readme.split(/\r?\n/);

const headerLines = lines.slice(0, 2); // keep title and tagline
const outLines = [...headerLines, '', ''];

for (const q of quotes) {
  outLines.push(...q.text.split('\n'));
  if (q.author) {
    outLines.push(`  ${q.author}`);
  }
  outLines.push('', '');
}

fs.writeFileSync(readmePath, outLines.join('\n'));
