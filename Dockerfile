# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies using npm install (not npm ci)
RUN npm install

# Copy source code
COPY . .

# Set environment variables for build
ENV REACT_APP_API_URL=https://interpreter-platform-backend-production.up.railway.app/api
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

# Build the React app with verbose output
RUN npm run build

# Create a simple server script
RUN echo 'const express = require("express"); const path = require("path"); const app = express(); const port = process.env.PORT || 3000; app.use(express.static("build")); app.get("*", (req, res) => { res.sendFile(path.join(__dirname, "build", "index.html")); }); app.listen(port, "0.0.0.0", () => { console.log(`Server running on port ${port}`); });' > server.js

# Install express for the server
RUN npm install express

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
