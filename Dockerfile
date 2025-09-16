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

# Build the React app
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE $PORT

# Start the application
CMD ["sh", "-c", "serve -s build -p $PORT"]
