const fs = require('fs');
const html = fs.readFileSync('fandom-page.html', 'utf8');
const patterns = ['Publisher', 'Issues', 'volume debut', 'Volume Debut', 'Volume End', 'Language', 'Fantastic Four', 'Marvel Comics'];
patterns.forEach(p => {
  const idx = html.indexOf(p);
  if (idx >= 0) {
    console.log('PATTERN', p, 'at', idx);
    console.log(html.slice(Math.max(0, idx - 80), idx + 160).replace(/\n/g, ' '));
    console.log('---');
  }
});
