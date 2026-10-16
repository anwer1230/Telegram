# Stage 1: Build application
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies with legacy-peer-deps
COPY package*.json .npmrc* ./
RUN npm install --legacy-peer-deps

# Copy source and build client + server bundle
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Install production dependencies only
COPY package*.json .npmrc* ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built assets and static files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose port (Render overrides with its own PORT env)
EXPOSE 10000

# Start server
CMD ["node", "dist/server.cjs"]
