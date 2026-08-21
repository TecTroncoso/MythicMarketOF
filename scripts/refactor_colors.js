const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../app/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Convert camelCase to kebab-case
function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// Replace shadow-[0_0_15px_${colors.neonPink}] with var()
content = content.replace(/shadow-\[([^\]]+)\$\{colors\.([a-zA-Z0-9]+)\}([^\]]*)\]/g, (match, before, colorName, after) => {
  return `shadow-[${before}var(--color-${toKebabCase(colorName)})${after}]`;
});

// Replace remaining ${colors.X}
content = content.replace(/\$\{colors\.([a-zA-Z0-9]+)\}/g, (match, colorName) => {
  return toKebabCase(colorName);
});

fs.writeFileSync(file, content);
console.log('Refactored page.tsx');
