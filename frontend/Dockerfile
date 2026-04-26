# ============================================================
# Frontend Dockerfile — React/Vite Multi-stage Build + Nginx
# Stage 1: Build React app with Vite
# Stage 2: Serve static files with Nginx
# ============================================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better Docker cache)
COPY package*.json ./
RUN npm ci --silent

# Copy source code
COPY . .

# Build-time environment variables (passed from docker-compose args)
ARG VITE_API_URL=http://localhost:8080
ARG VITE_API_BASE_URL=http://localhost:8080

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the React app
RUN npm run build

# --- Stage 2: Nginx Runtime ---
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --spider -q http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
