# Device Doctor — Distribution & Auto-Update Guide

Complete step-by-step guide to build, sign, and publish Device Doctor for Windows.

---

## 1. Prerequisites

```bash
# Node.js 18+ required
node --version    # must be ≥ 18.0.0
npm  --version

# Install project dependencies
npm install
```

---

## 2. Set Up GitHub Repository

### 2a. Create the repo

1. Go to https://github.com/new
2. Repository name: **device-doctor**
3. Set to **Public** (required for free auto-update hosting)
4. Click **Create repository**

### 2b. Push your code

```bash
cd device-doctor
git init
git add .
git commit -m "feat: initial release v1.0.0"
git remote add origin https://github.com/YOUR_USERNAME/device-doctor.git
git push -u origin main
```

### 2c. Update package.json

Replace `YOUR_GITHUB_USERNAME` in `package.json`:

```json
"repository": {
  "url": "https://github.com/YOUR_USERNAME/device-doctor.git"
},
"publish": {
  "provider": "github",
  "owner":    "YOUR_USERNAME",
  "repo":     "device-doctor"
}
```

---

## 3. Create GitHub Personal Access Token (PAT)

The PAT allows electron-builder to upload release assets to GitHub.

1. Go to: https://github.com/settings/tokens/new
2. Note: **Device Doctor Release Token**
3. Expiration: **No expiration** (or 1 year)
4. Scopes: Check **`repo`** (full control of private repositories)
5. Click **Generate token**
6. **Copy the token immediately** — you can't see it again

### Add token to GitHub Actions

1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `GH_TOKEN`
4. Value: paste your PAT
5. Click **Add secret**

### Add token for local builds (optional)

```bash
# Windows CMD
set GH_TOKEN=ghp_your_token_here

# Windows PowerShell
$env:GH_TOKEN = "ghp_your_token_here"

# macOS/Linux
export GH_TOKEN="ghp_your_token_here"
```

---

## 4. Add App Icons

Place icon files at these exact paths:

```
assets/
  icons/
    icon.ico    ← Windows (256x256 multi-size ICO)
    icon.icns   ← macOS (when ready)
    icon.png    ← Linux + fallback (512x512 PNG)
```

### Quick icon from PNG (using electron-icon-builder)

```bash
npm install -g electron-icon-builder

# Place a 1024x1024 PNG at assets/icons/source.png, then:
electron-icon-builder --input=assets/icons/source.png --output=assets/icons/

# This generates icon.ico, icon.icns, and multiple PNG sizes
```

### Free icon tools

- https://cloudconvert.com/png-to-ico
- https://www.icoconverter.com/
- https://convertio.co/

---

## 5. Build Locally (No Publishing)

```bash
# Build Windows installer + portable EXE (no upload)
npm run build:win

# Output will be in:
# dist/
#   Device Doctor Setup 1.0.0.exe    ← NSIS installer
#   Device Doctor Portable 1.0.0.exe ← Standalone portable
#   latest.yml                       ← Update manifest
#   Device Doctor Setup 1.0.0.exe.blockmap
```

---

## 6. Publish Your First Release

### Method A: Via Git tag (recommended — triggers GitHub Actions)

```bash
# Tag the release
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically:
# 1. Build the Windows installer
# 2. Create a GitHub Release named "Device Doctor v1.0.0"
# 3. Upload the .exe, .yml, and .blockmap files
# 4. Publish the release

# Monitor at: https://github.com/YOUR_USERNAME/device-doctor/actions
```

### Method B: Build and publish from local machine

```bash
# Set your token first (see step 3)
$env:GH_TOKEN = "ghp_your_token_here"

# Build + upload to GitHub Releases in one command
npm run publish
```

---

## 7. How Auto-Update Works

```
User machine (installed app)            GitHub Releases
─────────────────────────────────       ─────────────────
App starts
  │
  └─ 3 seconds later:
       autoUpdater.checkForUpdates()
          │
          └─ fetches: ─────────────────► latest.yml
                                          (contains new version + hash)
          │
          ◄── is new version? ──────────
          │
       If YES:
          autoUpdater.downloadUpdate()
          Progress events → renderer UI
          │
          ◄── download .exe blockmap ───
          │
       "Update downloaded" dialog
          │
       User clicks "Restart Now"
          │
       autoUpdater.quitAndInstall()
          → app restarts, NSIS applies update silently
```

### Files uploaded to each GitHub Release

| File | Purpose |
|------|---------|
| `Device Doctor Setup 1.x.x.exe` | Full installer for new users |
| `Device Doctor Portable 1.x.x.exe` | Portable version |
| `latest.yml` | **Critical** — updater reads this to detect new version |
| `*.blockmap` | Enables delta (differential) updates |

> ⚠️ **Never delete `latest.yml`** from a release — existing installs use it to detect updates.

---

## 8. Releasing Updates

```bash
# 1. Update version in package.json
#    Change: "version": "1.0.0" → "version": "1.1.0"

# 2. Commit the change
git add package.json
git commit -m "chore: bump version to 1.1.0"
git push

# 3. Tag and push — GitHub Actions handles the rest
git tag v1.1.0
git push origin v1.1.0

# Installed copies of 1.0.0 will auto-update to 1.1.0 within a few minutes
# (or on next app launch, whichever comes first)
```

---

## 9. Code Signing (Optional but Recommended)

Without code signing, Windows SmartScreen will show a warning on first install.
To remove the warning, sign with an EV (Extended Validation) certificate.

```json
// package.json — add to "win" section:
"win": {
  "certificateFile": "cert.pfx",
  "certificatePassword": "YOUR_CERT_PASSWORD",
  "signingHashAlgorithms": ["sha256"],
  "signDlls": true
}
```

### Certificate providers
- DigiCert (~$500/yr) — industry standard
- Sectigo (~$200/yr) — cheaper option
- SSL.com — budget option

For CI/CD, store as GitHub Secret:
```yaml
env:
  WIN_CSC_LINK:     ${{ secrets.WIN_CSC_LINK }}       # base64-encoded .pfx
  WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_PASSWORD }}
```

---

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| `GH_TOKEN is not set` | Set the env variable (see Step 3) |
| `Cannot publish: 422 Unprocessable Entity` | Release with this tag already exists — delete it on GitHub first |
| `Update check fails silently` | Check `%APPDATA%\device-doctor\logs\main.log` on Windows |
| SmartScreen warning on install | Normal without code signing — click "More info → Run anyway" |
| `NSIS` not found | Install on Windows or use the GitHub Actions workflow instead |
| `icon.ico` missing error | Create the icon file at `assets/icons/icon.ico` (see Step 4) |
| Update not detected | Ensure `latest.yml` is attached to the GitHub Release |

### Log file locations

- **Windows:** `%APPDATA%\device-doctor\logs\main.log`
- **macOS:** `~/Library/Logs/device-doctor/main.log`
- **Linux:** `~/.config/device-doctor/logs/main.log`

---

## 11. Project File Reference

```
device-doctor/
├── src/
│   ├── main.js                    ← Main process + autoUpdater setup
│   ├── preload.js                 ← Secure IPC bridge (updater + system APIs)
│   ├── collectors/
│   │   └── systemCollector.js     ← Hardware data collection
│   ├── analyzer/
│   │   └── analyzer.js            ← Diagnostics engine
│   └── renderer/
│       ├── index.html             ← Dashboard UI
│       ├── uiRenderer.js          ← Frontend logic
│       └── updater.js             ← Update bar UI
├── assets/
│   └── icons/
│       ├── icon.ico               ← Windows icon (REQUIRED for build)
│       ├── icon.icns              ← macOS icon
│       └── icon.png               ← Linux + fallback
├── .github/
│   └── workflows/
│       └── release.yml            ← CI/CD: auto-build on git tag
├── package.json                   ← electron-builder + publish config
└── DISTRIBUTION.md                ← This file
```

---

## Quick Reference Commands

```bash
npm start              # Run in development (no packaging)
npm run dev            # Run with DevTools open
npm run build:win      # Build Windows installer locally (no publish)
npm run publish        # Build + upload to GitHub Releases
npm run publish:dry    # Build only, skip upload (dry run)
```
