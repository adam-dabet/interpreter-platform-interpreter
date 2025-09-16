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

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application with proper port handling
CMD sh -c "serve -s build -l ${PORT:-3000}"
