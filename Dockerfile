# ==============================================================================
# MiniGuard Bot — Fast Production Dockerfile (Prebuilt Dist)
# ==============================================================================
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install tsx to execute backend directly
RUN npm install -g tsx

# Copy prebuilt frontend assets
COPY dist ./dist

# Copy backend server and core modules
COPY package.json ./
COPY backend ./backend
COPY src/shared/lib/bot-commands-engine.ts ./src/shared/lib/bot-commands-engine.ts
COPY src/shared/lib/firewall-engine.ts ./src/shared/lib/firewall-engine.ts

# Create data directory for persistence
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["tsx", "backend/server.ts"]
