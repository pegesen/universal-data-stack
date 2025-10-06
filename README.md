# 🚀 Universal Data Stack

[![CI/CD Pipeline](https://github.com/yourusername/universal-data-stack/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/universal-data-stack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)

> **Eine komplette Docker-basierte Umgebung für dynamische JSON-Dokumentenverwaltung mit MongoDB, React Frontend und Cursor MCP Integration.**

## ✨ Features

### 🔧 **Backend API**
- ✅ **Dynamische Collections** - Erstelle beliebige Collections zur Laufzeit
- ✅ **Vollständige CRUD-Operationen** - GET, POST, PUT, DELETE für alle Collections
- ✅ **Sicherheit** - Rate Limiting, Input Validation, Helmet Security
- ✅ **Pagination** - Effiziente Datenverwaltung großer Datensätze
- ✅ **Error Handling** - Umfassende Fehlerbehandlung und Logging
- ✅ **Health Checks** - Automatische Überwachung der Services

### 🎨 **Frontend**
- ✅ **Modern React UI** - Vite-basiert mit schönem Design
- ✅ **JSON-Editor** - Intuitive Eingabe mit Validierung
- ✅ **Real-time Updates** - Automatische Aktualisierung der Daten
- ✅ **Responsive Design** - Funktioniert auf allen Geräten
- ✅ **Error Handling** - Benutzerfreundliche Fehlermeldungen

### 🐳 **Docker & DevOps**
- ✅ **Multi-Service Setup** - MongoDB, API, Frontend, MCP Server
- ✅ **Health Checks** - Automatische Überwachung
- ✅ **Volume Persistence** - Daten bleiben erhalten
- ✅ **Network Isolation** - Sicher getrennte Services
- ✅ **CI/CD Pipeline** - Automatische Tests und Deployment

### 🔌 **Integration**
- ✅ **Cursor MCP** - Direkte MongoDB-Befehle in Cursor
- ✅ **Mongo Express** - Web-Admin-Interface
- ✅ **REST API** - Für eigene Anwendungen
- ✅ **CORS Support** - Cross-Origin Requests

## 🚀 Services

- **MongoDB** (Port 27017) - Datenbank mit Authentifizierung
- **Mongo Express** (Port 8081) - Web-Admin-Interface
- **Node.js API** (Port 3000) - Express + Mongoose mit dynamischen Collections
- **React Frontend** (Port 8080) - Vite-basierte JSON-Verwaltung
- **MongoDB MCP Server** (Port 5000) - Cursor Integration

## 📁 Projektstruktur

```
universal-data-stack/
├── docker-compose.yml
├── env.example
├── README.md
├── node-app/
│   ├── package.json
│   ├── server.js
│   └── Dockerfile
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── Dockerfile
    └── src/
        ├── main.jsx
        └── App.jsx
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- 4GB RAM minimum
- Ports 27017, 3000, 5000, 8080, 8081 available

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/universal-data-stack.git
cd universal-data-stack
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env with your preferred settings
```

### 3. Start All Services
```bash
docker compose up -d --build
```

### 4. Access Applications
- **Frontend:** http://localhost:8080
- **Mongo Express:** http://localhost:8081
- **API:** http://localhost:3000
- **API Health:** http://localhost:3000/health

## 🛠️ Development

### Local Development Setup
```bash
# Backend
cd node-app
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
# API Tests
cd node-app
npm test

# Frontend Tests
cd frontend
npm test

# All Tests
npm run test:all
```

### Code Quality
```bash
# Lint and format code
npm run lint
npm run format

# Security audit
npm audit
```

## 🌐 Zugriff

- **Frontend:** http://umbrel.local:8080
- **Mongo Express:** http://umbrel.local:8081
- **API:** http://umbrel.local:3000
- **API Health:** http://umbrel.local:3000/health

## 📊 API Endpoints

- `GET /api/collections` - Alle Collections auflisten
- `GET /api/:collection` - Alle Dokumente einer Collection
- `POST /api/:collection` - Neues Dokument erstellen
- `GET /api/:collection/:id` - Dokument nach ID abrufen
- `PUT /api/:collection/:id` - Dokument aktualisieren
- `DELETE /api/:collection/:id` - Dokument löschen

## 🔧 Cursor MCP Integration

Der MongoDB MCP-Server ist automatisch in der Cursor-Konfiguration eingetragen. Du kannst direkt in Cursor MongoDB-Befehle verwenden:

```
@mongodb find users
@mongodb insert users {"name": "John", "email": "john@example.com"}
@mongodb list collections
```

## 🎯 Features

### Frontend
- ✅ Collection-Auswahl
- ✅ JSON-Eingabe mit Validierung
- ✅ Dokumentenliste mit Löschfunktion
- ✅ Responsive Design
- ✅ Real-time Updates

### API
- ✅ Dynamische Collections
- ✅ Vollständige CRUD-Operationen
- ✅ Pagination
- ✅ Fehlerbehandlung
- ✅ CORS-Unterstützung

### Docker
- ✅ Multi-Service Setup
- ✅ Health Checks
- ✅ Volume Persistence
- ✅ Network Isolation

## 🛑 Stoppen

```bash
docker compose down
```

## 🗑️ Komplett löschen

```bash
docker compose down -v
docker system prune -f
```

## 🔍 Troubleshooting

1. **Port-Konflikte:** Prüfe ob Ports 27017, 3000, 5000, 8080, 8081 frei sind
2. **MongoDB-Verbindung:** Warte bis MongoDB vollständig gestartet ist
3. **Frontend lädt nicht:** Prüfe ob API-Service läuft
4. **MCP funktioniert nicht:** Starte Cursor nach der Konfiguration neu

## 📝 Beispiel-Nutzung

1. Öffne http://umbrel.local:8080
2. Wähle eine Collection (z.B. "users")
3. Gib JSON ein: `{"name": "Max Mustermann", "age": 30}`
4. Klicke "Save Document"
5. Dokument erscheint in der Liste
6. Verwende @mongodb in Cursor für erweiterte Abfragen
