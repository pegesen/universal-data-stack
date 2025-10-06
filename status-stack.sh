#!/bin/bash

# Universal Data Stack - Status Script
# Zeigt detaillierten Status aller Services

# Farben für bessere Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Universal Data Stack Status${NC}"
echo "=================================="
echo ""

# Container Status
echo -e "${PURPLE}🐳 Container Status:${NC}"
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" | grep universal || echo "No Universal Data Stack containers running"
echo ""

# Netzwerk Status
echo -e "${PURPLE}🌐 Network Status:${NC}"
sudo docker network ls | grep universal || echo "Universal network not found"
echo ""

# Port Status
echo -e "${PURPLE}🔌 Port Status:${NC}"
echo "Port 27017 (MongoDB):     $(netstat -tuln | grep :27017 > /dev/null && echo -e "${GREEN}✅ Open${NC}" || echo -e "${RED}❌ Closed${NC}")"
echo "Port 3000 (API):          $(netstat -tuln | grep :3000 > /dev/null && echo -e "${GREEN}✅ Open${NC}" || echo -e "${RED}❌ Closed${NC}")"
echo "Port 8080 (Frontend):     $(netstat -tuln | grep :8080 > /dev/null && echo -e "${GREEN}✅ Open${NC}" || echo -e "${RED}❌ Closed${NC}")"
echo "Port 8081 (Mongo Express): $(netstat -tuln | grep :8081 > /dev/null && echo -e "${GREEN}✅ Open${NC}" || echo -e "${RED}❌ Closed${NC}")"
echo ""

# Health Checks
echo -e "${PURPLE}🏥 Health Checks:${NC}"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "API Health: ${GREEN}✅ OK${NC}"
else
    echo -e "API Health: ${RED}❌ Failed${NC}"
fi

if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "Frontend:   ${GREEN}✅ OK${NC}"
else
    echo -e "Frontend:   ${RED}❌ Failed${NC}"
fi

if curl -s http://localhost:8081 > /dev/null 2>&1; then
    echo -e "Mongo Express: ${GREEN}✅ OK${NC}"
else
    echo -e "Mongo Express: ${RED}❌ Failed${NC}"
fi
echo ""

# URLs
echo -e "${PURPLE}🌐 Access URLs:${NC}"
echo -e "Frontend:     ${GREEN}http://localhost:8080${NC}"
echo -e "API:          ${GREEN}http://localhost:3000${NC}"
echo -e "Health Check: ${GREEN}http://localhost:3000/health${NC}"
echo -e "Mongo Express: ${GREEN}http://localhost:8081${NC} (admin/admin123)"
echo ""

# Docker Ressourcen
echo -e "${PURPLE}💾 Docker Resources:${NC}"
echo "Images:"
sudo docker images | grep universal || echo "No Universal Data Stack images found"
echo ""
echo "Volumes:"
sudo docker volume ls | grep universal || echo "No Universal Data Stack volumes found"
