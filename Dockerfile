# Use Node.js 20
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build React app
RUN npm run build

# Copy server file
COPY server.js ./

# Expose port
EXPOSE $PORT

# Start server
CMD ["node", "server.js"]




