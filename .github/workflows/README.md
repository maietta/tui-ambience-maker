# GitHub Actions Workflows

This repository uses GitHub Actions to automatically build and release binaries.

## Workflow Overview

### 1. **CI Workflow** (`ci.yml`)
**Triggers:** Every push/PR to `main` branch
**Purpose:** Build and test, no releases

- Runs on: Ubuntu Latest
- Jobs:
  - Lint and TypeScript type checking
  - Build TypeScript
  - Test CLI commands
- Artifacts retained for 1 day

### 2. **Nightly Build** (`nightly.yml`)
**Triggers:** 
- Every push to `main`
- Manual trigger (`workflow_dispatch`)
- Scheduled: Daily at 2 AM UTC

**Purpose:** Create development builds with latest features

- Builds for: Linux x64, Windows x64, macOS ARM64, macOS x64
- Creates a **single "nightly" release** that's continuously updated
- Tagged as `prerelease: true`
- Artifacts retained for 7 days
- ⚠️ Warning: Unstable, may contain bugs

### 3. **Stable Release** (`release.yml`)
**Triggers:** 
- Version tags: `v1.2.3` or `v1.2.3-beta`
- Manual trigger

**Purpose:** Create production-ready releases

- Builds for all platforms
- Creates a **new release** for each tag
- Tagged as `prerelease: false` (unless tag contains `-` like `v1.0.0-beta`)
- Kept forever (GitHub releases)

## How to Create Releases

### Creating a Nightly Build
Nightly builds happen automatically! Just push to `main`:

```bash
git add .
git commit -m "Add new feature"
git push origin main
```

The workflow will:
1. Build the app
2. Create/update the "nightly" release
3. Upload new binaries

### Creating a Stable Release

#### Method 1: Using git tags (recommended)

```bash
# Update version in package.json first
npm version 1.2.3

# Or manually
git tag v1.2.3
git push origin v1.2.3
```

The workflow will:
1. Build for all platforms
2. Create a new release "v1.2.3"
3. Upload binaries as release assets

#### Method 2: Using GitHub web UI

1. Go to Releases page
2. Click "Draft a new release"
3. Create a new tag: `v1.2.3`
4. Publish release

#### Method 3: Manual workflow trigger

1. Go to Actions tab
2. Select "Stable Release" workflow
3. Click "Run workflow"
4. The workflow will build and create a release

## Versioning

We follow [Semantic Versioning](https://semver.org/):
- `v1.0.0` - Major release
- `v1.1.0` - Minor release (new features)
- `v1.1.1` - Patch release (bug fixes)
- `v1.2.0-beta` - Pre-release

## Build Artifacts

### Nightly
- Download: GitHub Releases → "🌙 Nightly Build"
- URL: `https://github.com/maietta/tui-ambience-maker/releases/tag/nightly`
- Updated: Continuously on every push to main

### Stable
- Download: GitHub Releases → Latest
- URL: `https://github.com/maietta/tui-ambience-maker/releases/latest`
- Permanent: Never deleted

## Cross-Platform Builds

The workflows build for:
- ✅ Linux x64 (modern & baseline)
- ✅ Windows x64
- ✅ macOS ARM64 (Apple Silicon)
- ✅ macOS x64 (Intel)

All binaries are created using Bun's cross-compilation feature.

## Secrets Required

None! The workflows use `GITHUB_TOKEN` which is automatically provided.

## Troubleshooting

### Workflow not running?
- Check if workflows are enabled in repo settings
- Check branch protection rules
- Ensure `.github/workflows/*.yml` files are valid YAML

### Build fails?
- Check the Actions logs for errors
- Verify `package.json` has correct scripts
- Ensure `npm ci` works (lockfile up to date)

### Release not created?
- Check that tag format is correct (`v1.2.3`)
- Check Actions logs for upload errors
- Verify GITHUB_TOKEN has write permissions
