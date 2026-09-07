const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace(/src="\/_expo\//g, 'src="./_expo/');
  html = html.replace(/href="\/_expo\//g, 'href="./_expo/');
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('[fix-dist] Updated index.html paths to relative for Electron file:// protocol.');
} else {
  console.warn('[fix-dist] index.html not found at', indexPath);
}
