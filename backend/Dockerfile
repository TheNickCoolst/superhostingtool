FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install --workspace=shared --workspace=backend

# Copy source code
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY tsconfig.json ./

# Build
RUN npm run build --workspace=shared
RUN npm run build --workspace=backend

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies only
RUN npm install --workspace=backend --production

# Copy built files
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/prisma ./backend/prisma

# Expose ports
EXPOSE 3000 3001

# Start application
CMD ["node", "backend/dist/index.js"]
