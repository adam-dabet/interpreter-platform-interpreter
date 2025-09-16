const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the React app build directory
app.use(express.static('build'));

// Handle React routing using middleware instead of routes
app.use((req, res, next) => {
  // Skip API routes and static files
  if (req.path.startsWith('/api') || req.path.startsWith('/static')) {
    return next();
  }
  // Serve the React app for all other routes
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
