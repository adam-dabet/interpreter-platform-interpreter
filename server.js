const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the React app build directory
app.use(express.static('build'));

// Handle React routing, return all requests to React app
// Using named parameter for catch-all route (required for Express 4.20.0+)
app.get('/:path*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Also handle the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
