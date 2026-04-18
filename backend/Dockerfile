# Tahap 1: Build Image
FROM golang:1.24-alpine AS builder

# Set direktori kerja
WORKDIR /app

# Install dependensi
COPY go.mod go.sum ./
RUN go mod download

# Copy source code backend
COPY . .

# Build aplikasi Go
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server main.go

# Tahap 2: Runtime Image (Kecil)
FROM alpine:latest

WORKDIR /app

# Copy binary dari builder
COPY --from=builder /app/server .
# Copy konfigurasi email/aset (jika ada template html) dan environment example
COPY --from=builder /app/.env.example .

# Siapkan direktori upload minimal
RUN mkdir -p uploads/posts uploads/materi uploads/tugas uploads/tugasdosen uploads/profile

# Eksekusi port
EXPOSE 8080

CMD ["./server"]
