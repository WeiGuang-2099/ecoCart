# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine
WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY server/ ./server/
COPY config/ ./config/
COPY data/ ./data/
COPY public/ ./public/
COPY privacy-policy.html ./
COPY server.js ./

# Copy frontend build output to public/
COPY --from=frontend-build /app/client/dist ./public

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server.js"]
