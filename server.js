// const http = require('http');
// const fs = require('fs');
// const path = require('path');

// const server = http.createServer((req, res) => {
//   let filePath = req.url === '/' ? '/index.html' : req.url;
//   filePath = path.join(__dirname, filePath);

//   fs.readFile(filePath, (err, data) => {
//     if (err) {
//       res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
//       res.end('Not Found');
//       return;
//     }

//     const ext = path.extname(filePath);
//     const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'text/plain';
//     res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
//     res.end(data);
//   });
// });

// server.listen(3000, () => {
//   console.log('Server running at ...3000/');
// });