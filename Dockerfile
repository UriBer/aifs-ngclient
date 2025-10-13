# Multi-stage build for Linux distribution
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/tui/package*.json ./src/tui/

# Install dependencies
RUN npm ci
RUN cd src/tui && npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build:all

# Build Linux distribution
RUN npm run dist:linux

# Final stage - just the built application
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache nodejs npm

# Copy the built application
COPY --from=builder /app/dist-electron /app/dist-electron
COPY --from=builder /app/package.json /app/

# Set working directory
WORKDIR /app

# Expose port (if needed for web interface)
EXPOSE 3000

# Default command
CMD ["node", "dist-electron/linux-unpacked/aifs-client"]

