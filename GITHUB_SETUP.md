# 🐙 GitHub Setup Guide

Anleitung zum Erstellen und Konfigurieren des GitHub-Repositories für Universal Data Stack.

## 📋 Schritt 1: Repository erstellen

### Option A: Über GitHub Web Interface
1. Gehe zu [GitHub.com](https://github.com)
2. Klicke auf **"New repository"** (grüner Button)
3. Fülle die Details aus:
   - **Repository name:** `universal-data-stack`
   - **Description:** `A complete Docker-based environment for dynamic JSON document management with MongoDB, React frontend, and Cursor MCP integration`
   - **Visibility:** Public (empfohlen) oder Private
   - **Initialize with:** ❌ Keine Haken setzen (wir haben bereits Dateien)

### Option B: Über GitHub CLI
```bash
# Installiere GitHub CLI falls noch nicht vorhanden
# https://cli.github.com/

# Erstelle Repository
gh repo create universal-data-stack --public --description "A complete Docker-based environment for dynamic JSON document management with MongoDB, React frontend, and Cursor MCP integration"

# Klone das Repository
git clone https://github.com/YOUR_USERNAME/universal-data-stack.git
cd universal-data-stack
```

## 📁 Schritt 2: Projekt hochladen

### Lokales Repository initialisieren
```bash
# Im Projektverzeichnis
cd universal-data-stack

# Git initialisieren
git init

# Remote hinzufügen (ersetze YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/universal-data-stack.git

# Alle Dateien hinzufügen
git add .

# Ersten Commit erstellen
git commit -m "🚀 Initial commit: Universal Data Stack

- Complete Docker-based environment
- MongoDB with dynamic collections
- React + Vite frontend
- Express.js API with security features
- Cursor MCP integration
- Comprehensive testing setup
- CI/CD pipeline with GitHub Actions"

# Auf GitHub pushen
git push -u origin main
```

## ⚙️ Schritt 3: Repository konfigurieren

### GitHub Actions aktivieren
1. Gehe zu **Settings** → **Actions** → **General**
2. Stelle sicher, dass **"Allow all actions and reusable workflows"** aktiviert ist
3. Speichere die Einstellungen

### Branch Protection Rules (empfohlen)
1. Gehe zu **Settings** → **Branches**
2. Klicke **"Add rule"**
3. Konfiguriere:
   - **Branch name pattern:** `main`
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Require linear history**

### Secrets konfigurieren (falls nötig)
1. Gehe zu **Settings** → **Secrets and variables** → **Actions**
2. Füge folgende Secrets hinzu (falls du sie brauchst):
   - `DOCKER_USERNAME` - Docker Hub Username
   - `DOCKER_PASSWORD` - Docker Hub Password
   - `MONGODB_URI` - Externe MongoDB URI (optional)

## 🏷️ Schritt 4: Repository optimieren

### Topics hinzufügen
1. Gehe zur Repository-Hauptseite
2. Klicke auf das **Zahnrad-Symbol** neben "About"
3. Füge Topics hinzu:
   ```
   mongodb
   react
   nodejs
   docker
   express
   vite
   json
   api
   fullstack
   cursor
   mcp
   ```

### README Badges aktualisieren
```markdown
# In der README.md, ersetze:
[![CI/CD Pipeline](https://github.com/yourusername/universal-data-stack/actions/workflows/ci.yml/badge.svg)]

# Mit deinem tatsächlichen Username:
[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/universal-data-stack/actions/workflows/ci.yml/badge.svg)]
```

## 🔄 Schritt 5: Workflow optimieren

### Automatische Releases (optional)
Erstelle `.github/workflows/release.yml`:
```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

### Dependabot aktivieren
1. Gehe zu **Settings** → **Security** → **Code security and analysis**
2. Aktiviere **"Dependabot alerts"**
3. Erstelle `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/node-app"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
```

## 📊 Schritt 6: Repository Insights

### GitHub Pages (optional)
1. Gehe zu **Settings** → **Pages**
2. Wähle **"Deploy from a branch"**
3. Branch: `gh-pages`
4. Folder: `/ (root)`

### Community Standards
1. Gehe zu **Insights** → **Community**
2. Aktiviere alle Community Standards:
   - ✅ Code of Conduct
   - ✅ Contributing Guidelines
   - ✅ Issue Templates
   - ✅ Pull Request Template
   - ✅ License

## 🚀 Schritt 7: Erste Issues und PRs

### Erste Issues erstellen
```bash
# Beispiel-Issues
gh issue create --title "Add user authentication" --body "Implement JWT-based authentication for the API"
gh issue create --title "Add data export feature" --body "Allow users to export collections as JSON/CSV"
gh issue create --title "Improve mobile responsiveness" --body "Enhance mobile UI/UX for better mobile experience"
```

### Erste Pull Request
```bash
# Erstelle einen Feature-Branch
git checkout -b feature/improve-documentation

# Mache Änderungen
echo "# Contributing" > CONTRIBUTING.md

# Commit und Push
git add .
git commit -m "docs: add contributing guidelines"
git push origin feature/improve-documentation

# Erstelle PR über GitHub Web Interface
```

## 🎉 Fertig!

Dein Repository ist jetzt vollständig konfiguriert und bereit für:

- ✅ **Kollaboration** - Andere können Issues erstellen und PRs senden
- ✅ **CI/CD** - Automatische Tests bei jedem Push
- ✅ **Security** - Dependabot überwacht Sicherheitslücken
- ✅ **Community** - Professionelle Präsentation für andere Entwickler
- ✅ **Deployment** - Einfaches Deployment auf verschiedenen Plattformen

## 🔗 Nützliche Links

- **Repository:** `https://github.com/YOUR_USERNAME/universal-data-stack`
- **Issues:** `https://github.com/YOUR_USERNAME/universal-data-stack/issues`
- **Actions:** `https://github.com/YOUR_USERNAME/universal-data-stack/actions`
- **Releases:** `https://github.com/YOUR_USERNAME/universal-data-stack/releases`

**Viel Erfolg mit deinem Universal Data Stack Repository! 🚀**
