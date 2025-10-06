# Universal Data Stack

[![CI/CD Pipeline](https://github.com/pegesen/universal-data-stack/actions/workflows/ci.yml/badge.svg)](https://github.com/pegesen/universal-data-stack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)

> A complete Docker-based environment for dynamic JSON document management with MongoDB, React frontend, and Cursor MCP integration.

## ✨ Features

### 🔧 **Backend API**
- ✅ **Dynamic Collections** - Create arbitrary collections at runtime
- ✅ **Full CRUD Operations** - GET, POST, PUT, DELETE for all collections
- ✅ **Security** - Rate limiting, input validation, Helmet security
- ✅ **Pagination** - Efficient handling of large datasets
- ✅ **Error Handling** - Comprehensive error handling and logging
- ✅ **Health Checks** - Automatic service monitoring

### 🎨 **Frontend**
- ✅ **Modern React UI** - Vite-based with beautiful design
- ✅ **JSON Editor** - Intuitive input with validation
- ✅ **Real-time Updates** - Automatic data refresh
- ✅ **Responsive Design** - Works on all devices
- ✅ **Error Handling** - User-friendly error messages

### 🐳 **Docker & DevOps**
- ✅ **Multi-Service Setup** - MongoDB, API, Frontend, MCP Server
- ✅ **Health Checks** - Automatic monitoring
- ✅ **Volume Persistence** - Data persistence
- ✅ **Network Isolation** - Secure service separation
- ✅ **CI/CD Pipeline** - Automated testing and deployment

### 🔌 **Integration**
- ✅ **Cursor MCP** - Direct MongoDB commands in Cursor
- ✅ **Mongo Express** - Web admin interface
- ✅ **REST API** - For custom applications
- ✅ **CORS Support** - Cross-origin requests

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- 4GB RAM minimum
- Ports 27017, 3000, 5000, 8080, 8081 available

### 1. Clone Repository
```bash
git clone https://github.com/pegesen/universal-data-stack.git
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

## 📁 Project Structure

```
universal-data-stack/
├── docker-compose.yml
├── env.example
├── README.md
├── LICENSE
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml
├── node-app/
│   ├── package.json
│   ├── server.js
│   ├── Dockerfile
│   └── tests/
│       └── server.test.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── Dockerfile
    └── src/
        ├── main.jsx
        └── App.jsx
```

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

## 📊 API Endpoints

- `GET /api/collections` - List all collections
- `GET /api/:collection` - Get all documents from collection
- `POST /api/:collection` - Create new document
- `GET /api/:collection/:id` - Get document by ID
- `PUT /api/:collection/:id` - Update document by ID
- `DELETE /api/:collection/:id` - Delete document by ID

## 🔧 Cursor MCP Integration

The MongoDB MCP server is automatically configured in Cursor. You can use MongoDB commands directly in Cursor:

```
@mongodb find users
@mongodb insert users {"name": "John", "email": "john@example.com"}
@mongodb list collections
```

## 🛑 Stop Services

```bash
docker compose down
```

## 🗑️ Complete Cleanup

```bash
docker compose down -v
docker system prune -f
```

## 🔍 Troubleshooting

1. **Port Conflicts:** Check if ports 27017, 3000, 5000, 8080, 8081 are available
2. **MongoDB Connection:** Wait for MongoDB to fully start
3. **Frontend not loading:** Check if API service is running
4. **MCP not working:** Restart Cursor after configuration

## 📝 Example Usage

1. Open http://localhost:8080
2. Select a collection (e.g., "users")
3. Enter JSON: `{"name": "John Doe", "age": 30}`
4. Click "Save Document"
5. Document appears in the list
6. Use @mongodb in Cursor for advanced queries

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- MongoDB for the excellent database
- React team for the amazing frontend framework
- Docker for containerization
- Cursor for the MCP integration