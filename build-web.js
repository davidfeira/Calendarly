const fs = require('fs');
const path = require('path');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Copy files
const filesToCopy = ['index.html', 'app.js', 'styles.css'];

filesToCopy.forEach(file => {
    const srcPath = path.join(__dirname, 'src', file);
    const destPath = path.join(distDir, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to dist/`);
});

console.log('Build complete! Files are in /dist');
