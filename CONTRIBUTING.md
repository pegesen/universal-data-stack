# Contributing to Universal Data Stack

Thank you for your interest in contributing to Universal Data Stack! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs
- Search existing issues before creating a new one
- Provide detailed information about the bug, including:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Environment details (OS, Node.js version, etc.)

### Suggesting Features

- Use the GitHub issue tracker with the "enhancement" label
- Describe the feature in detail
- Explain why it would be useful
- Consider the impact on existing functionality

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run tests** to ensure everything passes
   ```bash
   # Backend tests
   cd node-app
   npm test
   
   # Frontend tests
   cd frontend
   npm test
   ```
6. **Run linting and formatting**
   ```bash
   npm run lint
   npm run format
   ```
7. **Commit your changes** with a clear message
8. **Push to your fork**
9. **Create a Pull Request**

## 📋 Development Setup

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Git

### Local Development

1. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/universal-data-stack.git
   cd universal-data-stack
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd node-app
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Start services**
   ```bash
   # Start all services with Docker
   docker compose up -d
   
   # Or run locally for development
   # Backend (terminal 1)
   cd node-app
   npm run dev
   
   # Frontend (terminal 2)
   cd frontend
   npm run dev
   ```

## 🧪 Testing

### Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Guidelines

- Write tests for new features
- Maintain or improve test coverage
- Use descriptive test names
- Test both success and error cases

## 📝 Code Style

### JavaScript/Node.js

- Use ESLint configuration
- Follow existing code patterns
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused

### React/JSX

- Use functional components with hooks
- Follow React best practices
- Use meaningful component names
- Keep components small and focused
- Use proper prop types

### Git Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(api): add pagination to collections endpoint
fix(frontend): resolve JSON validation error
docs(readme): update installation instructions
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment**
   - OS and version
   - Node.js version
   - Docker version
   - Browser (for frontend issues)

2. **Steps to Reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior
   - Screenshots if applicable

3. **Error Messages**
   - Full error messages
   - Stack traces
   - Console logs

## 💡 Feature Requests

When suggesting features:

1. **Describe the feature** in detail
2. **Explain the use case** and benefits
3. **Consider alternatives** and trade-offs
4. **Provide examples** if possible

## 🔍 Code Review Process

### For Contributors

- Address review feedback promptly
- Keep PRs focused and small
- Update documentation as needed
- Ensure all tests pass

### For Maintainers

- Review code thoroughly
- Test changes locally
- Provide constructive feedback
- Merge when ready

## 📚 Documentation

- Update README.md for significant changes
- Add JSDoc comments for new functions
- Update API documentation
- Include examples in code

## 🚀 Release Process

1. Update version numbers
2. Update CHANGELOG.md
3. Create release tag
4. Deploy to production

## ❓ Questions?

- Open a GitHub issue
- Check existing documentation
- Review closed issues for similar questions

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Universal Data Stack! 🎉
