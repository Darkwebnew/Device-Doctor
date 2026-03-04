# 🔬 Device Doctor

A cross-platform desktop application for one-click system analysis, diagnostics, and hardware health monitoring — built with Electron + Node.js.

---

## ✨ Features

- **Hardware Detection** — CPU, GPU, RAM, Storage, Battery, OS
- **Live Monitoring** — Temperature gauges, RAM/CPU usage, top processes
- **SMART Storage** — Drive health, type detection (SSD/HDD/NVMe)
- **Driver Audit** — Signed/unsigned driver status (Windows)
- **Diagnostics Engine** — Bottleneck detection, health scoring, performance tier
- **Recommendations** — Upgrade paths, replacement alerts, driver update reminders
- **Performance Tier** — Rates system as Basic / Mid / High / Workstation
- **Custom Titlebar** — Frameless dark UI with system controls

---

## 🗂️ Project Structure

```
device-doctor/
├── src/
│   ├── main.js                        # Electron main process
│   ├── preload.js                     # Secure context bridge
│   ├── collectors/
│   │   └── systemCollector.js         # Hardware data collection
│   ├── analyzer/
│   │   └── analyzer.js                # Diagnostics & scoring engine
│   └── renderer/
│       ├── index.html                 # Dashboard UI
│       └── uiRenderer.js             # Frontend logic
├── assets/
│   └── icons/                         # App icons (.ico, .icns, .png)
├── package.json
└── README.md
```

### Architecture

```
┌─────────────────────────────────────────────┐
│              Renderer Process               │
│  index.html + uiRenderer.js                │
│  - Dashboard UI                             │
│  - View routing                             │
│  - Data visualization                       │
└───────────┬─────────────────────────────────┘
            │ IPC (contextBridge)
┌───────────▼─────────────────────────────────┐
│               Main Process                  │
│  main.js                                    │
│  ┌────────────────┐  ┌────────────────────┐ │
│  │ systemCollector│  │     analyzer.js    │ │
│  │ .js            │  │                    │ │
│  │ - CPU/GPU/RAM  │  │ - Issue detection  │ │
│  │ - Storage      │  │ - Scoring (0-100)  │ │
│  │ - Battery/OS   │  │ - Tier rating      │ │
│  │ - Temps/Procs  │  │ - Recommendations  │ │
│  │ - Drivers      │  │                    │ │
│  └────────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- Windows 10/11 (primary support; macOS/Linux in progress)

### Install & Run

```bash
# Clone or download the project
cd device-doctor

# Install dependencies
npm install

# Start the app
npm start

# Development mode (with DevTools)
npm run dev
```

### Build Distributable

```bash
# Windows installer + portable
npm run build:win

# macOS DMG
npm run build:mac

# Linux AppImage
npm run build:linux
```

---

## 🛠️ How It Works

### 1. System Collector (`systemCollector.js`)

Uses `systeminformation` npm package as the primary data source (cross-platform), with fallbacks to native OS commands:

| Component   | Primary          | Fallback (Windows)           |
|-------------|------------------|------------------------------|
| CPU         | `si.cpu()`       | PowerShell Win32_Processor   |
| GPU         | `si.graphics()`  | `nvidia-smi`, WMI            |
| RAM         | `si.memLayout()` | PowerShell Win32_PhysicalMemory |
| Storage     | `si.diskLayout()`| WMI Win32_DiskDrive          |
| Battery     | `si.battery()`   | PowerShell Win32_Battery     |
| OS          | `si.osInfo()`    | `os` module                  |
| Temps       | `si.cpuTemperature()` | —                       |
| Processes   | `si.processes()` | PowerShell Get-Process       |
| Drivers     | PowerShell Win32_PnPSignedDriver | —           |

### 2. Analyzer (`analyzer.js`)

Runs diagnostics on collected data:

- **Issue Detection**: Checks CPU cores, load, GPU VRAM, driver age, RAM size/speed/usage, storage SMART, battery wear, temps
- **Scoring**: Scores each component 0–100
- **Performance Tier**: Weighted composite → Basic / Mid / High / Workstation
- **Recommendations**: Prioritised upgrade/replace/optimize/driver suggestions

### 3. UI Renderer (`uiRenderer.js`)

- Manages view routing across 9 panels
- Renders hardware cards with progress bars
- Displays interactive diagnostics report with health ring, score grid, issues list

---

## 🖥️ Platform Support

| Feature              | Windows | macOS | Linux |
|----------------------|---------|-------|-------|
| CPU info             | ✅      | ✅    | ✅    |
| GPU info             | ✅      | ✅    | ✅    |
| nvidia-smi           | ✅      | ✅    | ✅    |
| RAM layout           | ✅      | ✅    | ✅    |
| Storage SMART        | ✅      | ✅    | ✅    |
| Battery              | ✅      | ✅    | ✅    |
| Temperatures         | ✅*     | ✅*   | ✅*   |
| Driver list          | ✅      | ❌    | ❌    |

*Temperature support depends on hardware and driver permissions.

---

## 🔧 Extending

### Add a new diagnostic check

In `analyzer.js`, add to the `analyze()` method:

```js
if (data.cpu && data.cpu.someNewProperty < threshold) {
  issues.push({
    component: 'CPU',
    severity: 'warning',
    code: 'MY_NEW_CHECK',
    message: 'Explanation of the issue.',
  });
  recommendations.push({
    component: 'CPU',
    type: 'upgrade',
    priority: 'medium',
    title: 'Action title',
    detail: 'Detailed recommendation text.',
  });
}
```

### Add a new data collector

In `systemCollector.js`, add a method:

```js
async getMyComponent() {
  if (si) {
    const data = await si.someMethod();
    return { /* structured data */ };
  }
  return this._getMyComponentFallback();
}
```

Then add it to `collectAll()`.

---

## 📦 Dependencies

| Package             | Purpose                        |
|---------------------|-------------------------------|
| `electron`          | Desktop app runtime            |
| `systeminformation` | Cross-platform hardware APIs   |
| `electron-builder`  | Packaging & distribution       |

---

## 🔐 Security

- `nodeIntegration: false` — renderer has no direct Node.js access
- `contextIsolation: true` — strict API surface via `contextBridge`
- Only whitelisted APIs exposed to renderer via `preload.js`
- External URLs open via `shell.openExternal` (safe system browser)
