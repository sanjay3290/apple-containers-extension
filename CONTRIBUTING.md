# Contributing to Apple Containers Extension

Thanks for your interest in contributing! This project is open to everyone.

## How to Contribute

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/apple-containers-extension.git
cd apple-containers-extension
npm install
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add tests if applicable
- Update documentation if needed

### 4. Test Your Changes

```bash
# Compile TypeScript
npm run compile

# Run linting
npm run lint

# Run tests
npm test

# Test in VS Code
# Press F5 to launch Extension Development Host
```

### 5. Submit a Pull Request

- Push your branch to your fork
- Open a PR against `main`
- Describe what your changes do
- Link any related issues

## What Can You Contribute?

- Bug fixes
- New features
- Documentation improvements
- Test coverage
- Performance improvements
- UI/UX enhancements

## Development Setup

### Prerequisites

- Node.js 20+
- macOS (for testing with Apple Containers)
- VS Code or compatible IDE

### Project Structure

```
src/
├── extension.ts      # Entry point
├── cli.ts            # CLI wrapper
├── types.ts          # TypeScript types
├── providers/        # Tree view providers
├── commands/         # Command handlers
└── test/             # Test suites
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile TypeScript |
| `npm run watch` | Watch mode |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix lint issues |
| `npm test` | Run tests |
| `npm run package` | Create .vsix package |

## Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Keep functions focused and small
- Add JSDoc comments for public APIs

## Questions?

Open an issue if you have questions or need help getting started.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
