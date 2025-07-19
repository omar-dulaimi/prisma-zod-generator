# CI/CD Workflow Usage Guide

This guide explains how to use the automated CI/CD workflows for the Prisma Zod Generator project.

## 🚀 Quick Start

### 1. **Initial Setup** (One-time)

First, you need to configure the required secrets in your GitHub repository:

#### Required Secrets:
1. **Go to your GitHub repository** → Settings → Secrets and variables → Actions
2. **Click on "Repository secrets" tab** (not Environment secrets)
3. **Click "New repository secret"**
4. **Add these secrets:**

```bash
# Secret Name: NPM_TOKEN
# Secret Value: npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# (Your NPM automation token)

# Secret Name: CODECOV_TOKEN  
# Secret Value: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# (Optional, for coverage reporting)
```

**Important:** 
- ✅ Use **"Repository secrets"** (available to all workflows)
- ❌ Don't use **"Environment secrets"** (requires environment setup)
- The secrets will be available as `${{ secrets.NPM_TOKEN }}` in workflows

**Step-by-step:**
```
GitHub Repository 
→ Settings 
→ Secrets and variables 
→ Actions 
→ Repository secrets tab
→ New repository secret
→ Name: NPM_TOKEN
→ Value: npm_your_token_here
→ Add secret
```

#### Get NPM Token:

**Option 1: Via NPM Website (Recommended)**
1. Go to [npmjs.com](https://npmjs.com) and sign in
2. Click your profile avatar → **Access Tokens**
3. Click **"Generate New Token"**
4. Choose **"Automation"** (for CI/CD)
5. Copy the token and add it as `NPM_TOKEN` secret in GitHub

**Option 2: Via Command Line**
```bash
# Login to NPM (will prompt for username/password)
npm login

# Create an automation token (will prompt for password again)
npm token create --type=automation

# Copy the token and add it as NPM_TOKEN secret
```

**Important Notes:**
- If you have 2FA enabled, you'll need to enter your 2FA code when prompted
- Choose **"Automation"** token type (not "Publish" or "Read-only") for CI/CD
- The token will start with `npm_` and should be kept secure
- You can revoke/regenerate tokens anytime from the NPM website

**Token Permissions:**
- ✅ **Automation**: Can publish packages (recommended for CI/CD)
- ❌ **Publish**: Limited publish permissions  
- ❌ **Read-only**: Cannot publish packages

#### Get Codecov Token:
1. Visit [codecov.io](https://codecov.io)
2. Sign in with GitHub
3. Add your repository
4. Copy the repository token

### 2. **Enable Branch Protection** (Recommended)
- Go to Settings → Branches
- Add protection rule for `master`:
  - ✅ Require status checks before merging
  - ✅ Require branches to be up to date
  - ✅ Require status checks: `test`, `package-test`
  - ✅ Restrict pushes that create files larger than 100MB

---

## 📝 Daily Development Workflow

### **Making Changes**

1. **Create a feature branch:**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

2. **Make your changes and commit using conventional commits:**
```bash
# Feature additions (minor version bump)
git commit -m "feat: add new schema validation feature"
git commit -m "feat(mongodb): add native ObjectId support"

# Bug fixes (patch version bump)
git commit -m "fix: resolve schema generation for optional fields"
git commit -m "fix(types): correct TypeScript inference for nullable fields"

# Breaking changes (major version bump)
git commit -m "feat!: change API for schema configuration"
# or
git commit -m "feat: change API for schema configuration

BREAKING CHANGE: The configuration object structure has changed.
Migration guide: https://..."

# Other changes (no version bump)
git commit -m "docs: update installation instructions"
git commit -m "test: add tests for new validation logic"
git commit -m "chore: update dependencies"
```

3. **Push and create PR:**
```bash
git push origin feature/your-feature-name
# Then create PR on GitHub targeting 'master'
```

### **Pull Request Process**

When you create a PR → **Automatic CI runs:**
- ✅ Tests on Node.js 18.x, 20.x, 22.x
- ✅ TypeScript compilation and type checking
- ✅ ESLint code quality checks
- ✅ Package build verification
- ✅ Coverage reporting

**PR gets auto-merged when:**
- All CI checks pass ✅
- Approved by maintainer ✅
- No merge conflicts ✅

---

## 🚀 Release Process

### **Automatic Releases** (Recommended)

When you merge to `master` → **Automatic release happens:**

1. **Conventional commits determine version:**
   - `feat:` commits → **minor** version (0.8.13 → 0.9.0)
   - `fix:` commits → **patch** version (0.8.13 → 0.8.14)
   - `BREAKING CHANGE:` → **major** version (0.8.13 → 1.0.0)

2. **Release process automatically:**
   - 🏷️ Creates git tag (e.g., `v0.9.0`)
   - 📝 Generates changelog from commits
   - 📦 Publishes to NPM
   - 🎉 Creates GitHub release
   - 📊 Updates package.json versions

### **Manual Releases** (When needed)

If you need to trigger a release manually:

1. **Go to GitHub Actions tab**
2. **Click "Release" workflow**
3. **Click "Run workflow"**
4. **Choose release type:**
   - `patch` → 0.8.13 → 0.8.14
   - `minor` → 0.8.13 → 0.9.0  
   - `major` → 0.8.13 → 1.0.0
5. **Click "Run workflow"**

---

## 📊 Monitoring & Maintenance

### **Workflow Status**

Monitor your workflows in the **Actions** tab:
- 🟢 **Green** = All good
- 🔴 **Red** = Something failed (check logs)
- 🟡 **Yellow** = In progress

### **Dependabot Updates**

**Automatic dependency updates happen weekly:**
- 📅 **Every Monday at 9 AM**
- 🔄 **Auto-merges** patch/minor updates after tests pass
- 👀 **Manual review** required for major updates
- 🏷️ **Labeled** with `dependencies` and `automated`

**To manually trigger dependency updates:**
- Go to Insights → Dependency graph → Dependabot
- Click "Check for updates"

---

## 🛠️ Advanced Usage

### **Running Tests Locally**

Before pushing, run tests locally:
```bash
# Quick verification
npm run test:basic
npm run test:type-check
npm run lint

# Full test suite (takes longer)
npm run test:comprehensive
npm run test:multi:sequential

# Test package build
./package.sh
```

### **Testing Release Process**

Test the release process without publishing:
```bash
# Dry run semantic release
npm run release:dry

# Check what version would be released
npx semantic-release --dry-run
```

### **Manual Commands**

```bash
# Build project
npm run gen-example

# Run all tests with coverage
npm run test:ci

# Format code
npm run format

# Check for uncommitted changes (used by release)
npm run check-uncommitted
```

---

## 🚨 Troubleshooting

### **Common Issues**

#### 1. **Release fails with "No release published"**
- **Cause:** No releasable commits since last release
- **Solution:** Make sure you have `feat:`, `fix:`, or breaking change commits

#### 2. **NPM publish fails**
- **Cause:** Invalid, expired, or insufficient permissions on NPM_TOKEN
- **Solutions:** 
  - Regenerate NPM token with "Automation" type
  - Verify you have publish permissions for the package
  - Check if package name is available/not taken
  - Ensure you're logged into the correct NPM account

#### 3. **Tests fail in CI but pass locally**
- **Cause:** Environment differences
- **Solutions:**
  - Check Node.js version compatibility
  - Verify all dependencies are in package.json
  - Check for hardcoded paths

#### 4. **NPM authentication issues**
- **Cause:** 2FA, expired session, or login problems
- **Solutions:**
  ```bash
  # Check if you're logged in
  npm whoami
  
  # Logout and login again
  npm logout
  npm login
  
  # If using 2FA, make sure to enter the code correctly
  # Use website method if CLI continues to fail
  ```

#### 5. **Secrets not found in workflows**
- **Cause:** Added secrets to wrong location (Environment vs Repository)
- **Solutions:**
  - Verify secrets are in **"Repository secrets"** tab
  - Delete any secrets from **"Environment secrets"** 
  - Re-add secrets to **"Repository secrets"**
  - Check secret names match exactly (case-sensitive)

#### 6. **Dependabot PRs fail**
- **Cause:** Breaking changes in dependencies
- **Solution:** Review dependency changelog and update code

### **Getting Help**

1. **Check workflow logs** in Actions tab
2. **Review error messages** in failed steps
3. **Compare with successful runs** to identify differences
4. **Test locally** to reproduce issues

---

## 📋 Commit Message Examples

### ✅ Good Examples:
```bash
feat: add support for Prisma 5.0
fix: resolve memory leak in schema generation
feat(mongodb): add support for aggregation pipelines
fix(types): correct TypeScript inference for relations
docs: add MongoDB setup instructions
test: add comprehensive schema validation tests
chore: update ESLint configuration
feat!: change schema configuration API
```

### ❌ Bad Examples:
```bash
update stuff                    # Too vague
Fixed a bug                     # Not conventional format
WIP: working on feature         # Work in progress (use draft PR instead)
Merge branch 'feature'          # Merge commits (use squash merge)
```

---

## 🎯 Best Practices

1. **Use conventional commits** for automatic versioning
2. **Create feature branches** for all changes
3. **Write descriptive commit messages** 
4. **Test locally** before pushing
5. **Use draft PRs** for work in progress
6. **Keep PRs focused** on single features/fixes
7. **Review dependency updates** carefully
8. **Monitor CI/CD status** regularly

---

## 📈 Workflow Benefits

- ✅ **Automatic testing** on multiple Node.js versions
- ✅ **Automatic releases** with semantic versioning
- ✅ **Automatic dependency updates** with safety checks
- ✅ **Code quality enforcement** with linting and type checking
- ✅ **Cross-platform compatibility** testing
- ✅ **Database compatibility** testing with real databases
- ✅ **Performance monitoring** with benchmark tests
- ✅ **Comprehensive documentation** generation

The CI/CD system handles all the repetitive tasks so you can focus on building features! 🚀