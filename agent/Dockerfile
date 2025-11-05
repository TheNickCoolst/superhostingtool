FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY agent/package*.json ./agent/

# Install dependencies
RUN npm install --workspace=shared --workspace=agent

# Copy source code
COPY shared/ ./shared/
COPY agent/ ./agent/
COPY tsconfig.json ./

# Build
RUN npm run build --workspace=shared
RUN npm run build --workspace=agent

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install Docker CLI (for Docker-in-Docker support)
RUN apk add --no-cache docker-cli

# Copy package files
COPY package*.json ./
COPY agent/package*.json ./agent/

# Install production dependencies only
RUN npm install --workspace=agent --production

# Copy built files
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/agent/dist ./agent/dist

# Create directories
RUN mkdir -p /opt/minecraft-servers /opt/minecraft-servers/backups

# Expose port
EXPOSE 4000

# Start application
CMD ["node", "agent/dist/index.js"]
