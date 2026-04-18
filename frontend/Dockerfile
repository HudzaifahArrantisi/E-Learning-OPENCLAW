# Tahap 1: Build Image
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Konfigurasi ENV untuk build time (opsional bisa dilempar saat docker build)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Tahap 2: Runtime Image (Nginx)
FROM nginx:alpine

# Menyalin hasil build React/Vite ke folder publik HTML Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Menyalin konfigurasi fallback React Router (jika diperlukan custom config)
# Namun secara default kita override lewat sed di bawah
RUN rm /etc/nginx/conf.d/default.conf

# Membuat konfigurasi Nginx untuk React Router (Single Page Application fallback)
RUN echo "server { \
    listen       80; \
    server_name  localhost; \
    location / { \
        root   /usr/share/nginx/html; \
        index  index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
    error_page   500 502 503 504  /50x.html; \
    location = /50x.html { \
        root   /usr/share/nginx/html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
