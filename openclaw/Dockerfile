# ============================================================
# OpenClaw Gateway — Dockerfile
# Runs: openclaw gateway --port 18788 (24/7)
# Base: Node.js 20 Alpine (lightweight ~180MB)
# ============================================================

FROM node:20-alpine

# Install openclaw CLI globally
RUN npm install -g openclaw

# Persistent state directory
WORKDIR /root/.openclaw

# Expose gateway port
EXPOSE 18788

# Run the gateway (always listening)
CMD ["openclaw", "gateway", "--port", "18788"]
