const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

function defaultApiUrl() {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN || '';
  if (domain.includes('sandbox-providers')) {
    return 'https://sandbox-backend.theintegritycompanyinc.com/api';
  }
  return 'https://backend.theintegritycompanyinc.com/api';
}

// Runtime env for CRA: Railway vars are available to Node here, not inside the
// pre-built JS bundle. This route must stay ahead of express.static.
app.get('/runtime-config.js', (req, res) => {
  const config = {
    REACT_APP_API_URL: defaultApiUrl(),
    REACT_APP_GOOGLE_MAPS_API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    REACT_APP_SANDBOX_MODE: process.env.REACT_APP_SANDBOX_MODE || '',
  };
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`window.__RAILWAY_ENV__=${JSON.stringify(config)};`);
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});





