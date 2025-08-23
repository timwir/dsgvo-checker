# --- Frontend build stage ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- Backend stage ---
FROM node:20-alpine AS backend
# Chromium deps for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev --no-audit --no-fund
COPY backend/ ./
# Static assets aus Frontend-Build an erwarteten Ort kopieren
# Wir legen sie in /app/backend/public und setzen STATIC_DIR darauf
RUN mkdir -p /app/backend/public
COPY --from=frontend-build /app/frontend/dist/ /app/backend/public/
ENV NODE_ENV=production STATIC_DIR=/app/backend/public PORT=5174
EXPOSE 5174
CMD ["node", "src/index.js"]
