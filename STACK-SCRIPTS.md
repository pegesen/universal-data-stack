# 🚀 Universal Data Stack - Management Scripts

Diese Skripte erleichtern das Starten, Stoppen und Verwalten des Universal Data Stack.

## 📋 Verfügbare Skripte

### 🚀 **start-stack.sh** - Stack starten
```bash
./start-stack.sh
```
- Startet alle Services (MongoDB, API, Frontend, Mongo Express)
- Erstellt das Docker-Netzwerk
- Baut Images falls nötig
- Zeigt Status und URLs

### 🛑 **stop-stack.sh** - Stack stoppen
```bash
./stop-stack.sh
```
- Stoppt alle Container
- Entfernt Container
- Zeigt verbleibende Container

### 📊 **status-stack.sh** - Status anzeigen
```bash
./status-stack.sh
```
- Zeigt Container-Status
- Prüft Port-Verfügbarkeit
- Führt Health Checks durch
- Zeigt Zugriffs-URLs

### 📋 **logs-stack.sh** - Logs anzeigen
```bash
./logs-stack.sh
```
- Zeigt Logs aller Services
- Letzte 20 Zeilen pro Service
- Zeigt auch nicht laufende Services

### 🧹 **cleanup-stack.sh** - Komplett aufräumen
```bash
./cleanup-stack.sh
```
- ⚠️ **ACHTUNG:** Entfernt ALLES (Container, Images, Volumes)
- Fragt vor Ausführung nach Bestätigung
- Führt Docker System Cleanup durch

## 🎯 **Schnellstart**

```bash
# 1. Stack starten
./start-stack.sh

# 2. Status prüfen
./status-stack.sh

# 3. Logs anzeigen (optional)
./logs-stack.sh

# 4. Stack stoppen
./stop-stack.sh
```

## 🌐 **Zugriffs-URLs**

Nach dem Start sind folgende URLs verfügbar:

- **Frontend:** http://localhost:8080
- **API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health
- **Mongo Express:** http://localhost:8081 (admin/admin123)

## 🔧 **Troubleshooting**

### Container starten nicht
```bash
# Docker Status prüfen
sudo systemctl status docker

# Docker starten
sudo systemctl start docker

# Logs anzeigen
./logs-stack.sh
```

### Ports bereits belegt
```bash
# Ports prüfen
netstat -tuln | grep :8080
netstat -tuln | grep :3000

# Andere Container stoppen
sudo docker ps
sudo docker stop <container-name>
```

### Komplett neu starten
```bash
# Alles stoppen und aufräumen
./stop-stack.sh
./cleanup-stack.sh

# Neu starten
./start-stack.sh
```

## 📝 **Hinweise**

- Alle Skripte benötigen `sudo` für Docker-Befehle
- Skripte sind idempotent (können mehrfach ausgeführt werden)
- Bei Problemen: `./logs-stack.sh` für Debugging
- Für Entwicklung: `./status-stack.sh` für schnelle Übersicht

## 🎨 **Features der Skripte**

- ✅ **Farbige Ausgabe** für bessere Lesbarkeit
- ✅ **Idempotent** - können mehrfach ausgeführt werden
- ✅ **Fehlerbehandlung** - zeigen hilfreiche Meldungen
- ✅ **Status-Übersicht** - zeigen laufende Services
- ✅ **URLs anzeigen** - direkte Links zu den Services
- ✅ **Health Checks** - prüfen ob Services erreichbar sind
