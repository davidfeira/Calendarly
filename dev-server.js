// Simple HTTP server for testing Dropbox OAuth locally
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 1420;
const SRC_DIR = path.join(__dirname, 'src');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Parse URL to handle query params
    const urlPath = req.url.split('?')[0];

    let filePath;
    if (urlPath === '/') {
        filePath = path.join(SRC_DIR, 'index.html');
    } else if (urlPath === '/oauth-callback') {
        // Redirect to the callback page with hash preserved
        filePath = path.join(SRC_DIR, 'oauth-callback.html');
    } else {
        filePath = path.join(SRC_DIR, urlPath);
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end(`Server error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Dev server running at http://localhost:${PORT}`);
    console.log(`📂 Serving files from: ${SRC_DIR}`);
    console.log(`\n✨ Open http://localhost:${PORT} in your browser to test Dropbox OAuth\n`);
});
