module.exports = function setupProxy(app) {
  app.get('/runtime-config.js', (req, res) => {
    const config = {
      REACT_APP_API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
      REACT_APP_GOOGLE_MAPS_API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
      REACT_APP_SANDBOX_MODE: process.env.REACT_APP_SANDBOX_MODE || '',
    };
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(`window.__RAILWAY_ENV__=${JSON.stringify(config)};`);
  });
};
