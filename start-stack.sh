#!/bin/bash

# Universal Data Stack - Quick Start Script
# Startet alle Services des Universal Data Stack

echo "🚀 Starting Universal Data Stack..."

# Farben für bessere Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktion zum Anzeigen von Status
show_status() {
    echo -e "${BLUE}📊 Container Status:${NC}"
    sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

# Prüfen ob Docker läuft
if ! sudo docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker ist nicht gestartet. Starte Docker...${NC}"
    sudo systemctl start docker
    sleep 3
fi

# Netzwerk erstellen falls nicht vorhanden
echo -e "${YELLOW}🔧 Creating network...${NC}"
sudo docker network create universal-network 2>/dev/null || echo "Network already exists"

# MongoDB starten
echo -e "${YELLOW}🍃 Starting MongoDB...${NC}"
sudo docker run -d --name universal-mongo \
    --network universal-network \
    -p 27017:27017 \
    -e MONGO_INITDB_ROOT_USERNAME=admin \
    -e MONGO_INITDB_ROOT_PASSWORD=password123 \
    -e MONGO_INITDB_DATABASE=universal_data \
    mongo:7.0 2>/dev/null || echo "MongoDB already running"

# Warten bis MongoDB bereit ist
echo -e "${YELLOW}⏳ Waiting for MongoDB to be ready...${NC}"
sleep 10

# Backend Image bauen falls nicht vorhanden
if ! sudo docker images | grep -q universal-data-stack-api; then
    echo -e "${YELLOW}🔨 Building Backend...${NC}"
    cd node-app
    sudo docker build -t universal-data-stack-api .
    cd ..
fi

# Backend starten
echo -e "${YELLOW}⚙️ Starting Backend API...${NC}"
sudo docker run -d --name universal-node-app \
    --network universal-network \
    -p 3000:3000 \
    -e NODE_ENV=development \
    -e MONGODB_URI=mongodb://admin:password123@universal-mongo:27017/universal_data?authSource=admin \
    -e FRONTEND_URL=http://localhost:8080 \
    universal-data-stack-api 2>/dev/null || echo "Backend already running"

# Frontend Image bauen falls nicht vorhanden
if ! sudo docker images | grep -q universal-data-stack-frontend; then
    echo -e "${YELLOW}🎨 Building Frontend...${NC}"
    cd frontend
    sudo docker build -t universal-data-stack-frontend .
    cd ..
fi

# Frontend starten
echo -e "${YELLOW}🎨 Starting Frontend...${NC}"
sudo docker run -d --name universal-frontend \
    --network universal-network \
    -p 8080:8080 \
    -e VITE_API_URL=http://localhost:3000 \
    universal-data-stack-frontend 2>/dev/null || echo "Frontend already running"

# Mongo Express starten
echo -e "${YELLOW}🔍 Starting Mongo Express...${NC}"
sudo docker run -d --name universal-mongo-express \
    --network universal-network \
    -p 8081:8081 \
    -e ME_CONFIG_MONGODB_ADMINUSERNAME=admin \
    -e ME_CONFIG_MONGODB_ADMINPASSWORD=password123 \
    -e ME_CONFIG_MONGODB_URL=mongodb://admin:password123@universal-mongo:27017/ \
    -e ME_CONFIG_BASICAUTH_USERNAME=admin \
    -e ME_CONFIG_BASICAUTH_PASSWORD=admin123 \
    mongo-express:1.0.2 2>/dev/null || echo "Mongo Express already running"

# Warten bis alle Services bereit sind
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 15

# Status anzeigen
show_status

# URLs anzeigen
echo -e "${GREEN}✅ Universal Data Stack is running!${NC}"
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo -e "   Frontend:     ${GREEN}http://localhost:8080${NC}"
echo -e "   API:          ${GREEN}http://localhost:3000${NC}"
echo -e "   Health Check: ${GREEN}http://localhost:3000/health${NC}"
echo -e "   Mongo Express: ${GREEN}http://localhost:8081${NC} (admin/admin123)"
echo ""
echo -e "${YELLOW}💡 To stop the stack, run: ./stop-stack.sh${NC}"
echo -e "${YELLOW}💡 To view logs, run: ./logs-stack.sh${NC}"
