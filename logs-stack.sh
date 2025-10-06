#!/bin/bash

# Universal Data Stack - Logs Script
# Zeigt Logs aller Services

# Farben für bessere Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Universal Data Stack Logs${NC}"
echo ""

# Funktion zum Anzeigen von Logs
show_logs() {
    local service=$1
    local name=$2
    
    if sudo docker ps | grep -q "$service"; then
        echo -e "${GREEN}📊 $name Logs:${NC}"
        echo "----------------------------------------"
        sudo docker logs --tail=20 "$service"
        echo ""
    else
        echo -e "${RED}❌ $name is not running${NC}"
        echo ""
    fi
}

# Logs für alle Services anzeigen
show_logs "universal-mongo" "MongoDB"
show_logs "universal-node-app" "Backend API"
show_logs "universal-frontend" "Frontend"
show_logs "universal-mongo-express" "Mongo Express"

echo -e "${YELLOW}💡 To follow logs in real-time, run:${NC}"
echo -e "   sudo docker logs -f universal-frontend"
echo -e "   sudo docker logs -f universal-node-app"
echo -e "   sudo docker logs -f universal-mongo"
