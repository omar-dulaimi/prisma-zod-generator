# Contributing to Prisma Zod Generator

Thank you for your interest in contributing to PZG! This guide will help you get started.

## Code of Conduct

Be respectful, collaborative, and constructive. We're all here to build great tools together.

## Repository Structure

This project uses a **hybrid architecture** with public core and private pro features:

```
prisma-zod-generator/ (PUBLIC)
├── src/
│   ├── index.ts              # Core generator (public, MIT)
│   ├── transformer.ts        # Core logic (public, MIT)
│   ├── license.ts            # License validation (public)
│   └── pro/                  # Pro features (PRIVATE SUBMODULE)
├── tests/                    # Tests (public)
├── docs/                     # Documentation (public)
└── README.md                 # Main docs (public)
```

**Pro Features Repository** (PRIVATE):
- `prisma-zod-generator-pro` - Private submodule at `src/pro/`
- Access restricted to core team members
- Commercial license

## For Core Contributors (Public Features)

### Setup

```bash
# Clone the repository
git clone https://github.com/omar-dulaimi/prisma-zod-generator.git
cd prisma-zod-generator

# Install dependencies
pnpm install

# Build
pnpm build
```

**Note:** You won't have access to the `src/pro/` submodule. That's expected! You can contribute to core features without it.

### Development Workflow

1. **Create a branch**
   ```bash
   git checkout -b feat/your-feature
   ```

2. **Make changes** to core files (anything except `src/pro/`)

3. **Test your changes**
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

4. **Commit with conventional commits**
   ```bash
   git add .
   git commit -m "feat(core): add new Zod helper"
   ```

5. **Push and create PR**
   ```bash
   git push origin feat/your-feature
   gh pr create --base master --head feat/your-feature
   ```

### Areas to Contribute

- 🐛 **Bug fixes** - Fix issues in core generator
- ✨ **Core features** - New schema types, Zod helpers
- 📚 **Documentation** - Improve docs, add examples
- 🧪 **Tests** - Add test coverage
- 🎨 **Examples** - Create usage examples

## For Pro Developers (Team Members)

### Setup with Pro Submodule

```bash
# Clone the repository
git clone https://github.com/omar-dulaimi/prisma-zod-generator.git
cd prisma-zod-generator

# Initialize submodules (requires private repo access)
pnpm setup
# Or manually:
# git submodule update --init --recursive

# Install dependencies
pnpm install

# Build (includes pro features)
pnpm build
```

### Pro Development Workflow

1. **Update pro submodule** (get latest changes)
   ```bash
   pnpm sync:pro
   ```

2. **Create feature branch in pro repo**
   ```bash
   cd src/pro
   git checkout -b feat/new-pro-feature
   cd ../..
   ```

3. **Make changes** to pro features

4. **Test changes**
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

5. **Commit to pro repo**
   ```bash
   cd src/pro
   git add .
   git commit -m "feat(policies): add new policy type"
   git push origin feat/new-pro-feature
   cd ../..
   ```

6. **Create PR in private repo**
   - Go to `https://github.com/omar-dulaimi/prisma-zod-generator-pro`
   - Create PR for your branch
   - Get review and merge

7. **Update main repo with new submodule commit**
   ```bash
   git add src/pro
   git commit -m "chore(pro): update pro submodule to latest"
   git push
   ```

### Pro Feature Guidelines

- All pro features must have license checks
- Add comprehensive tests
- Update pro documentation
- Consider backward compatibility
- Performance matters (pro features run in prod)

## Commit Conventions

We use **Conventional Commits** format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Scopes
- `core`: Core generator features
- `pro`: Pro features (team members only)
- `policies`: Policy feature
- `server-actions`: Server Actions feature
- `drift-guard`: Drift Guard feature
- etc.

### Examples
```bash
feat(core): add support for BigInt fields
fix(policies): resolve PII redaction edge case
docs(readme): update installation instructions
chore(deps): update Prisma to v6.18.0
```

## Testing Requirements

All PRs must include tests:

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test:features:config

# Run with coverage
pnpm test:coverage

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Before Submitting PR

✅ **Checklist:**
- [ ] Tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Formatted code (`pnpm format`)
- [ ] Conventional commit messages
- [ ] Updated documentation (if needed)
- [ ] Added tests for new features
- [ ] No breaking changes (or clearly documented)

## PR Review Process

1. **Automated checks** run on every PR
2. **Core team review** (usually within 1-2 days)
3. **Revisions** if requested
4. **Merge** to master once approved

## Release Process

Releases are automated using **semantic-release**:

1. Commits to `master` trigger release workflow
2. Version bump based on commit types
3. Changelog generated automatically
4. Package published to npm

## Questions?

- **Discussions:** Use GitHub Discussions for questions
- **Issues:** Report bugs via GitHub Issues
- **Discord:** Join our Discord for real-time chat (pro members get priority support)

## License

By contributing, you agree that your contributions will be licensed under the MIT License for core features.

Pro features are proprietary and require separate contributor agreement.

---

**Thank you for contributing to Prisma Zod Generator!** 🎉
