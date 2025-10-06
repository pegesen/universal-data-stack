#!/bin/bash

# Universal Data Stack - Cleanup Script
# Entfernt alle Container, Images und Volumes

echo "🧹 Cleaning up Universal Data Stack..."

# Farben für bessere Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Bestätigung einholen
read -p "Are you sure you want to remove all containers, images and volumes? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
    exit 1
fi

# Container stoppen und entfernen
echo -e "${YELLOW}🛑 Stopping and removing containers...${NC}"
sudo docker stop universal-frontend universal-node-app universal-mongo universal-mongo-express 2>/dev/null
sudo docker rm universal-frontend universal-node-app universal-mongo universal-mongo-express 2>/dev/null

# Images entfernen
echo -e "${YELLOW}🗑️ Removing images...${NC}"
sudo docker rmi universal-data-stack-api universal-data-stack-frontend 2>/dev/null

# Netzwerk entfernen
echo -e "${YELLOW}🌐 Removing network...${NC}"
sudo docker network rm universal-network 2>/dev/null

# Unused Docker Ressourcen aufräumen
echo -e "${YELLOW}🧹 Cleaning up unused Docker resources...${NC}"
sudo docker system prune -f

echo -e "${GREEN}✅ Cleanup completed!${NC}"
echo ""
echo -e "${YELLOW}💡 To start fresh, run: ./start-stack.sh${NC}"
