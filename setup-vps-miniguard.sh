#!/bin/bash
# ==============================================================================
# MiniGuard Bot — VPS Co-Location Deployment Script (Ubuntu 22.04 / 24.04)
# Runs safely alongside iFragment on the same VPS in an isolated container
# ==============================================================================

set -e

echo "🚀 [1/4] Preparing isolated directory at /opt/miniguardbot..."
mkdir -p /opt/miniguardbot/data
cd /opt/miniguardbot

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found! Please ensure Docker is installed."
    exit 1
fi

echo "🔐 [2/4] Checking environment file (.env)..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "⚠️ Created /opt/miniguardbot/.env from .env.example."
        echo "👉 Please edit .env with your TELEGRAM_BOT_TOKEN before starting!"
    else
        echo "❌ .env file missing in /opt/miniguardbot/. Please create one."
        exit 1
    fi
fi

# Detect Server IP and configure Caddy
SERVER_IP=$(curl -s4 ifconfig.me || curl -s4 icanhazip.com || hostname -I | awk '{print $1}')
MINIGUARD_DOMAIN="${SERVER_IP//./-}-guard.sslip.io"

echo "🌐 [3/4] Checking Caddy Reverse Proxy for port 3001..."
if [ -f /etc/caddy/Caddyfile ]; then
    if ! grep -q "3001" /etc/caddy/Caddyfile; then
        echo "Adding MiniGuard block to /etc/caddy/Caddyfile..."
        cat << CADDYEOF >> /etc/caddy/Caddyfile

# --- MiniGuard Bot Reverse Proxy (Port 3001) ---
$MINIGUARD_DOMAIN {
    reverse_proxy localhost:3001
}
CADDYEOF
        systemctl reload caddy || systemctl restart caddy
        echo "✅ Caddy updated with domain: https://$MINIGUARD_DOMAIN"
    else
        echo "ℹ️ MiniGuard proxy already present in /etc/caddy/Caddyfile."
    fi
fi

echo "🐳 [4/4] Building and starting MiniGuard Docker container..."
docker compose -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for service readiness..."
sleep 4

if curl -s http://localhost:3001/health | grep -q "ok"; then
    echo "=============================================================================="
    echo "🎉 SUCCESS! MiniGuard Bot is running in an isolated environment!"
    echo "📡 Local Port: 3001 (Isolated from iFragment on 8080)"
    echo "🔗 Public HTTPS API: https://$MINIGUARD_DOMAIN"
    echo "👉 Health check: curl -i http://localhost:3001/health"
    echo "=============================================================================="
else
    echo "⚠️ Container started, but health endpoint is still initializing. Check logs:"
    docker compose -f docker-compose.prod.yml logs --tail=30
fi
