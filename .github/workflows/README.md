# CI/CD Workflows

This repository uses GitHub Actions for automated testing, building, and releasing. Here's an overview of the workflows:

## Core Workflows

### 1. CI (`ci.yml`)
**Trigger**: Push/PR to master branch

**Jobs**:
- **test**: Runs on Node.js 18.x, 20.x, 22.x
  - Builds project with `npm run gen-example`
  - Type checking with `npm run test:type-check`
  - Linting with `npm run lint`
  - Basic tests with `npm run test:basic`
  - Comprehensive tests with coverage
  - MongoDB-specific tests
  - Multi-provider tests (sequential)
  - Uploads coverage to Codecov
- **package-test**: Tests package integrity
  - Builds and packages the project
  - Verifies package can be created successfully

### 2. Release (`release.yml`)
**Trigger**: Push to master branch, manual dispatch

**Features**:
- Automatic version bumping based on commit messages
- Manual release type selection (patch/minor/major)
- Automated Git tagging and GitHub releases
- NPM package publishing
- Package artifact uploading

**Version Determination**:
- `BREAKING CHANGE` in commit → major version
- `feat:` or `feature:` → minor version
- Everything else → patch version

### 3. Semantic Release (`semantic-release.yml`)
**Trigger**: Push to master branch

**Features**:
- Uses conventional commits for automated releases
- Generates changelogs automatically
- Publishes to NPM with proper versioning
- Creates GitHub releases with release notes

### 4. Extended Test Matrix (`test-matrix.yml`)
**Trigger**: Nightly schedule (2 AM UTC), manual dispatch, pushes to master

**Features**:
- Cross-platform testing (Ubuntu, Windows, macOS)
- Extended Node.js version matrix (16.x, 18.x, 20.x, 22.x)
- Database compatibility testing with real databases
- Performance and compatibility tests
- Comprehensive test reporting

### 5. Dependabot Auto-merge (`dependabot-auto-merge.yml`)
**Trigger**: Dependabot PRs

**Features**:
- Automatically tests dependabot PRs
- Auto-approves and merges patch/minor updates
- Skips major version updates for manual review

## Configuration Files

### Dependabot (`.github/dependabot.yml`)
- Weekly dependency updates on Mondays
- Grouped updates for related packages (Prisma, testing, ESLint, etc.)
- Ignores major updates for critical dependencies
- Automatic labeling and assignment

### Semantic Release (`.releaserc.json`)
- Conventional commits configuration
- Automatic changelog generation
- Branch-based release strategy (master = stable releases)
- NPM publishing from `package/` directory

## Required Secrets

To use these workflows, configure the following secrets in your repository:

### Required
- `GITHUB_TOKEN`: Automatically provided by GitHub
- `NPM_TOKEN`: NPM registry access token for publishing

### Optional
- `CODECOV_TOKEN`: For code coverage reporting

## Setup Instructions

1. **NPM Token**: 
   ```bash
   npm login
   npm token create --read-only
   ```
   Add this token as `NPM_TOKEN` in repository secrets.

2. **Codecov Token**:
   - Visit [codecov.io](https://codecov.io)
   - Connect your repository
   - Copy the token and add as `CODECOV_TOKEN`

3. **Branch Protection**:
   - Enable branch protection for `master`
   - Require status checks: "test", "package-test"
   - Require up-to-date branches
   - Require review from code owners

## Commit Message Format

Use conventional commits for automatic release management:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types**:
- `feat`: New features (minor version)
- `fix`: Bug fixes (patch version)
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring (patch version)
- `perf`: Performance improvements (patch version)
- `test`: Test changes
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

**Breaking Changes**:
Add `BREAKING CHANGE:` in footer or `!` after type for major version bumps.

**Examples**:
```
feat: add MongoDB native type support
fix: resolve schema generation for optional fields
docs: update installation instructions
feat!: change API for schema configuration
```

## Manual Release

To trigger a manual release:

1. Go to Actions → Release workflow
2. Click "Run workflow"
3. Select release type (patch/minor/major)
4. Click "Run workflow"

## Testing Locally

```bash
# Run basic tests
npm run test:basic

# Run with coverage
npm run test:coverage

# Run multi-provider tests
npm run test:multi:sequential

# Test release process (dry run)
npm run release:dry

# Type check
npm run test:type-check

# Lint code
npm run lint
```

## Monitoring

- **GitHub Actions**: View workflow runs in the Actions tab
- **NPM**: Monitor package downloads and versions
- **Codecov**: Track code coverage trends
- **Dependabot**: Review dependency update PRs

## Troubleshooting

### Common Issues

1. **Tests failing on Windows**: 
   - Check file path separators
   - Verify line ending settings

2. **Release workflow fails**:
   - Verify NPM_TOKEN is valid
   - Check conventional commit format
   - Ensure all tests pass

3. **Coverage upload fails**:
   - Verify CODECOV_TOKEN
   - Check coverage file generation

4. **Dependabot PRs fail**:
   - Review breaking changes in dependencies
   - Check test compatibility

### Getting Help

- Review workflow logs in GitHub Actions
- Check the project's issue tracker
- Verify all required secrets are configured
- Test changes in a fork first