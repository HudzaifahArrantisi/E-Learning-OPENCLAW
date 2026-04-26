# ============================================================
# Backend Dockerfile — Go (Gin) Multi-stage Build
# Stage 1: Compile Go binary
# Stage 2: Minimal Alpine runtime
# ============================================================

# --- Stage 1: Build ---
FROM golang:1.25-alpine AS builder

# Install git and ca-certificates (needed for HTTPS calls to Supabase)
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Download dependencies first (better Docker cache)
COPY go.mod go.sum ./
RUN go mod download

# Copy all source code
COPY . .

# Build static binary (no CGO = smaller, fully static)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -a -installsuffix cgo \
    -ldflags="-s -w" \
    -o server main.go

# --- Stage 2: Runtime ---
FROM alpine:3.20

# Install ca-certificates (for HTTPS to Supabase) and wget (for healthcheck)
RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/server .

# Create upload directories (even though we use DB BYTEA, some legacy paths may exist)
RUN mkdir -p uploads/posts uploads/materi uploads/tugas uploads/tugasdosen uploads/profile logs

# Non-root user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["./server"]
