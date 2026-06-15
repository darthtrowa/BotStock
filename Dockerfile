# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the app (runs tsc and vite build)
RUN npm run build

# Stage 2: Run the production server
FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy static assets built in the builder stage
COPY --from=builder /app/dist ./dist

# Copy the server entry point
COPY server.mjs ./

# Set Environment Variables
ENV PORT=3001
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Command to run the application
CMD ["node", "server.mjs"]
