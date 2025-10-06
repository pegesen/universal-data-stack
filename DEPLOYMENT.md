# 🚀 Deployment Guide

Verschiedene Deployment-Optionen für Universal Data Stack.

## 🐳 Docker Compose (Lokal)

### Einfaches Deployment
```bash
# Repository klonen
git clone https://github.com/YOUR_USERNAME/universal-data-stack.git
cd universal-data-stack

# Environment konfigurieren
cp env.example .env
# Bearbeite .env nach Bedarf

# Services starten
docker compose up -d --build

# Logs anzeigen
docker compose logs -f
```

### Services verwalten
```bash
# Services stoppen
docker compose down

# Services neu starten
docker compose restart

# Services mit Volumes löschen
docker compose down -v

# Einzelne Services
docker compose up -d mongo
docker compose up -d node-app
docker compose up -d frontend
```

## 🌐 Umbrel + Portainer

### 1. Umbrel vorbereiten
```bash
# SSH zu Umbrel
ssh umbrel@umbrel.local

# Projektverzeichnis erstellen
mkdir -p /home/umbrel/projects/universal-data-stack
cd /home/umbrel/projects/universal-data-stack

# Repository klonen
git clone https://github.com/YOUR_USERNAME/universal-data-stack.git .
```

### 2. Portainer Stack erstellen
1. Öffne Portainer: `http://umbrel.local:9000`
2. Gehe zu **Stacks** → **Add stack**
3. Name: `universal-data-stack`
4. Kopiere Inhalt von `portainer-stack.yml`
5. Environment Variables hinzufügen:
   ```
   MONGO_USERNAME=admin
   MONGO_PASSWORD=password123
   MONGO_DATABASE=universal_data
   MONGO_EXPRESS_USER=admin
   MONGO_EXPRESS_PASS=admin123
   ```
6. **Deploy the stack**

### 3. Traefik Integration (optional)
Falls Traefik läuft, werden automatisch Subdomains erstellt:
- `https://data.umbrel.local` - Frontend
- `https://mongo-express.umbrel.local` - Mongo Express
- `https://api.umbrel.local` - API

## ☁️ Cloud Deployment

### DigitalOcean App Platform

#### 1. Repository vorbereiten
```bash
# .do/app.yaml erstellen
cat > .do/app.yaml << 'EOF'
name: universal-data-stack
services:
- name: api
  source_dir: /node-app
  github:
    repo: YOUR_USERNAME/universal-data-stack
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: MONGODB_URI
    value: ${db.MONGODB_URI}
  - key: PORT
    value: "8080"
  http_port: 8080
  routes:
  - path: /api

- name: frontend
  source_dir: /frontend
  github:
    repo: YOUR_USERNAME/universal-data-stack
    branch: main
  run_command: npm run build && npm run preview
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: VITE_API_URL
    value: ${api.PUBLIC_URL}
  routes:
  - path: /

databases:
- name: db
  engine: MONGODB
  version: "7"
  size: db-s-1vcpu-1gb
  num_nodes: 1
EOF
```

#### 2. Deploy
```bash
# DigitalOcean CLI installieren
# https://docs.digitalocean.com/reference/doctl/how-to/install/

# Authentifizierung
doctl auth init

# App erstellen
doctl apps create --spec .do/app.yaml
```

### Railway

#### 1. Railway Setup
```bash
# Railway CLI installieren
npm install -g @railway/cli

# Login
railway login

# Projekt erstellen
railway init

# Services hinzufügen
railway add mongodb
railway add node
```

#### 2. Railway.toml konfigurieren
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "cd node-app && npm start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"

[env]
NODE_ENV = "production"
PORT = "3000"
```

### Heroku

#### 1. Heroku Setup
```bash
# Heroku CLI installieren
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# App erstellen
heroku create universal-data-stack

# MongoDB Atlas hinzufügen
heroku addons:create mongolab:sandbox
```

#### 2. Procfile erstellen
```bash
# Procfile
echo "web: cd node-app && npm start" > Procfile

# package.json im Root erstellen
cat > package.json << 'EOF'
{
  "name": "universal-data-stack",
  "version": "1.0.0",
  "scripts": {
    "start": "cd node-app && npm start",
    "build": "cd frontend && npm run build",
    "heroku-postbuild": "cd node-app && npm install && cd ../frontend && npm install && npm run build"
  },
  "engines": {
    "node": "18.x"
  }
}
EOF
```

#### 3. Deploy
```bash
# Git remote hinzufügen
heroku git:remote -a universal-data-stack

# Deploy
git push heroku main
```

## 🐳 Docker Swarm

### 1. Swarm initialisieren
```bash
# Swarm erstellen
docker swarm init

# Stack deployen
docker stack deploy -c docker-compose.yml universal-data-stack

# Services anzeigen
docker service ls
```

### 2. Scaling
```bash
# API skalieren
docker service scale universal-data-stack_node-app=3

# Frontend skalieren
docker service scale universal-data-stack_frontend=2
```

## ☸️ Kubernetes

### 1. Kubernetes Manifests
```bash
# Namespace erstellen
kubectl create namespace universal-data-stack

# MongoDB Secret
kubectl create secret generic mongodb-secret \
  --from-literal=username=admin \
  --from-literal=password=password123 \
  --namespace=universal-data-stack

# ConfigMap
kubectl create configmap app-config \
  --from-literal=mongodb-database=universal_data \
  --namespace=universal-data-stack
```

### 2. Deploy Services
```bash
# MongoDB
kubectl apply -f k8s/mongodb.yaml

# API
kubectl apply -f k8s/api.yaml

# Frontend
kubectl apply -f k8s/frontend.yaml

# Ingress
kubectl apply -f k8s/ingress.yaml
```

## 🔧 Environment Variables

### Produktion
```bash
# .env.production
NODE_ENV=production
MONGODB_URI=mongodb://admin:securepassword@mongodb:27017/universal_data?authSource=admin
MONGO_USERNAME=admin
MONGO_PASSWORD=securepassword
MONGO_DATABASE=universal_data
FRONTEND_URL=https://yourdomain.com
```

### Staging
```bash
# .env.staging
NODE_ENV=staging
MONGODB_URI=mongodb://admin:stagingpassword@mongodb:27017/universal_data_staging?authSource=admin
MONGO_USERNAME=admin
MONGO_PASSWORD=stagingpassword
MONGO_DATABASE=universal_data_staging
FRONTEND_URL=https://staging.yourdomain.com
```

## 📊 Monitoring

### Health Checks
```bash
# API Health
curl http://localhost:3000/health

# MongoDB Status
docker exec universal-mongo mongosh --eval "db.adminCommand('ping')"

# Service Status
docker compose ps
```

### Logs
```bash
# Alle Services
docker compose logs -f

# Einzelne Services
docker compose logs -f node-app
docker compose logs -f frontend
docker compose logs -f mongo
```

### Metrics
```bash
# Container Stats
docker stats

# Disk Usage
docker system df

# Volume Usage
docker volume ls
```

## 🔒 Sicherheit

### SSL/TLS
```bash
# Let's Encrypt mit Traefik
# Traefik Labels in docker-compose.yml:
labels:
  - "traefik.http.routers.api.tls=true"
  - "traefik.http.routers.api.tls.certresolver=letsencrypt"
```

### Firewall
```bash
# UFW (Ubuntu)
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable

# iptables
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### Secrets Management
```bash
# Docker Secrets
echo "securepassword" | docker secret create mongodb_password -
echo "admin" | docker secret create mongodb_username -
```

## 🚨 Troubleshooting

### Häufige Probleme

#### Port bereits belegt
```bash
# Ports prüfen
sudo netstat -tulpn | grep :8080
sudo netstat -tulpn | grep :3000

# Services stoppen die Ports blockieren
sudo systemctl stop apache2
sudo systemctl stop nginx
```

#### MongoDB Verbindung fehlgeschlagen
```bash
# MongoDB Logs
docker logs universal-mongo

# Verbindung testen
docker exec universal-mongo mongosh --eval "db.adminCommand('ping')"

# Netzwerk prüfen
docker network ls
docker network inspect universal-data-stack_universal-network
```

#### Frontend lädt nicht
```bash
# API Status prüfen
curl http://localhost:3000/health

# Frontend Logs
docker logs universal-frontend

# Environment Variables prüfen
docker exec universal-frontend env | grep VITE
```

## 📈 Performance Tuning

### MongoDB
```yaml
# docker-compose.yml
mongo:
  command: mongod --wiredTigerCacheSizeGB 1
  ulimits:
    memlock:
      soft: -1
      hard: -1
```

### Node.js
```yaml
# docker-compose.yml
node-app:
  environment:
    NODE_OPTIONS: "--max-old-space-size=512"
```

### Nginx (optional)
```nginx
# nginx.conf
upstream api {
    server node-app:3000;
}

upstream frontend {
    server frontend:8080;
}

server {
    listen 80;
    
    location /api/ {
        proxy_pass http://api;
    }
    
    location / {
        proxy_pass http://frontend;
    }
}
```

## 🎉 Deployment erfolgreich!

Nach dem Deployment solltest du folgende URLs erreichen können:

- **Frontend:** `http://your-domain:8080`
- **API:** `http://your-domain:3000`
- **Mongo Express:** `http://your-domain:8081`
- **Health Check:** `http://your-domain:3000/health`

**Viel Erfolg mit deinem Universal Data Stack! 🚀**
