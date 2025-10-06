#!/bin/bash

# Universal Data Stack - Stop Script
# Stoppt alle Services des Universal Data Stack

echo "🛑 Stopping Universal Data Stack..."

# Farben für bessere Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Container stoppen
echo -e "${YELLOW}🛑 Stopping containers...${NC}"
sudo docker stop universal-frontend universal-node-app universal-mongo universal-mongo-express 2>/dev/null

# Container entfernen
echo -e "${YELLOW}🗑️ Removing containers...${NC}"
sudo docker rm universal-frontend universal-node-app universal-mongo universal-mongo-express 2>/dev/null

# Status anzeigen
echo -e "${BLUE}📊 Remaining containers:${NC}"
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "${GREEN}✅ Universal Data Stack stopped successfully!${NC}"
echo ""
echo -e "${YELLOW}💡 To start again, run: ./start-stack.sh${NC}"
echo -e "${YELLOW}💡 To clean up images, run: ./cleanup-stack.sh${NC}"
