const http = require('http');

// Create an HTTP server
const server = http.createServer((req, res) => {
    // Set the response header to indicate the content type
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    
    // Send the response body
    res.end('Hello, Worllld! I MADE A CHANGE : )\n');
});

// Define the port the server will listen on
const port = 3000;

// Start the server and listen on the defined port
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
