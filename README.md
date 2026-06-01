<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,18,24&height=200&section=header&text=Device%20Doctor&fontSize=72&fontColor=fff&animation=twinkling&fontAlignY=35&desc=Cross-Platform%20System%20Diagnostics%20%26%20Hardware%20Health%20Monitor%20%E2%80%94%20Electron%20%2B%20Node.js&descAlignY=55&descSize=15" width="100%"/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=20&pause=1000&color=22D3A5&center=true&vCenter=true&multiline=true&width=1600&height=60&lines=Real-Time+Hardware+Monitoring+%7C+SMART+Storage+%7C+Driver+Audit+%7C+0%E2%80%93100+Health+Scoring)](https://git.io/typing-svg)

<br/>

[![Electron](https://img.shields.io/badge/Electron-Latest-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![macOS](https://img.shields.io/badge/macOS-Supported-000000?style=for-the-badge&logo=apple&logoColor=white)]()

<br/>

[![Panels](https://img.shields.io/badge/UI%20Panels-9%20Views-22D3A5?style=for-the-badge)]()
[![Scoring](https://img.shields.io/badge/Health%20Score-0--100%20System-10B981?style=for-the-badge)]()
[![Tiers](https://img.shields.io/badge/Performance%20Tiers-4%20Levels-6366F1?style=for-the-badge)]()
[![SMART](https://img.shields.io/badge/Storage-SMART%20Diagnostics-F59E0B?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Cross--Platform-0EA5E9?style=for-the-badge)]()

<br/>

> **🔬 One-click system analysis, real-time hardware monitoring, SMART storage diagnostics, and driver auditing — all inside a sleek frameless dark desktop app that scores your machine from 0 to 100 and tells you exactly what to fix.**

<br/>

[🚀 Quick Start](#-quick-start) &nbsp;•&nbsp; [✨ Features](#-features) &nbsp;•&nbsp; [🏗️ Architecture](#%EF%B8%8F-architecture) &nbsp;•&nbsp; [🛠️ How It Works](#%EF%B8%8F-how-it-works) &nbsp;•&nbsp; [📦 Build](#-build-distributable) &nbsp;•&nbsp; [🔧 Extending](#-extending) &nbsp;•&nbsp; [🖥️ Platform Support](#%EF%B8%8F-platform-support)

</div>

---

<div align="center">

## 🏆 Why Device Doctor?

</div>

```
Manual System Checks  →  Task Manager only · Scattered tools · No scoring · No recommendations
Device Doctor         →  One app · 9 panels · 0-100 health score · Upgrade paths · Driver alerts
```

<table align="center">
<tr>
<td align="center" width="200">
<img src="https://img.icons8.com/fluency/64/processor.png"/>
<br/><b>Full Hardware Map</b>
<br/><sub>CPU · GPU · RAM · Storage · Battery · OS — all in one scan</sub>
</td>
<td align="center" width="200">
<img src="https://img.icons8.com/fluency/64/combo-chart.png"/>
<br/><b>0–100 Health Score</b>
<br/><sub>Weighted composite scoring across every component</sub>
</td>
<td align="center" width="200">
<img src="https://img.icons8.com/fluency/64/temperature.png"/>
<br/><b>Live Monitoring</b>
<br/><sub>Real-time temps, RAM/CPU usage, top process list</sub>
</td>
<td align="center" width="200">
<img src="https://img.icons8.com/fluency/64/maintenance.png"/>
<br/><b>Smart Recommendations</b>
<br/><sub>Prioritised upgrade paths, replace alerts, driver reminders</sub>
</td>
</tr>
</table>

---

## 🌟 Project Overview

**Device Doctor** is a cross-platform desktop application for comprehensive system analysis, hardware diagnostics, and real-time health monitoring. Built on **Electron + Node.js**, it collects data from every major hardware subsystem, runs a multi-factor diagnostic engine, and presents everything inside a clean, frameless dark-themed dashboard with 9 navigation panels.

No command line. No scattered tools. One app — complete picture.

### 🎯 Problem Statement

Power users and IT professionals have always needed to jump between a dozen different utilities — Task Manager, GPU-Z, CrystalDiskInfo, DriverBooster, HWiNFO — just to get a full picture of a machine's health. Device Doctor consolidates all of this into a single Electron app with a unified scoring model, prioritised recommendations, and a clean UI anyone can read in under a minute.

---

## ✨ Features

<details>
<summary><b>🖥️ Hardware Detection</b></summary>

- **CPU** — Model, cores, threads, clock speed, architecture
- **GPU** — Model, VRAM, vendor detection, nvidia-smi integration
- **RAM** — Capacity, speed, layout per slot, usage percentage
- **Storage** — Drive model, type detection (SSD / HDD / NVMe), capacity
- **Battery** — Charge level, wear percentage, cycle estimation
- **OS** — Build, version, uptime, platform details

</details>

<details>
<summary><b>📊 Live Monitoring Dashboard</b></summary>

- Real-time CPU and RAM usage with animated progress bars
- Temperature gauges for CPU and available sensors
- Top processes list sorted by resource consumption
- Automatic refresh cycle — no manual polling needed

</details>

<details>
<summary><b>💾 SMART Storage Diagnostics</b></summary>

- Drive health status via S.M.A.R.T. attribute reading
- Automatic drive type classification — SSD / HDD / NVMe
- Per-drive health scoring integrated into the composite system score
- Replacement alerts triggered on SMART failure indicators

</details>

<details>
<summary><b>🔌 Driver Audit (Windows)</b></summary>

- Full signed/unsigned driver enumeration via `Win32_PnPSignedDriver`
- Driver age analysis — flags outdated drivers with update reminders
- Unsigned driver detection surfaced as security-level issues
- Prioritised driver recommendation cards on the diagnostics report

</details>

<details>
<summary><b>🔬 Diagnostics Engine & Scoring</b></summary>

- Multi-factor issue detection across CPU, GPU, RAM, storage, battery, thermals, and drivers
- Per-component health scores on a **0–100** scale
- Weighted composite score → **Performance Tier** classification
- Severity-ranked issues list (critical / warning / info)
- Actionable recommendations: upgrade · replace · optimize · update driver

</details>

<details>
<summary><b>🏅 Performance Tier System</b></summary>

| Tier | Score Range | Profile |
|---|---|---|
| 🔵 Basic | 0–39 | Entry-level · Everyday tasks only |
| 🟡 Mid | 40–64 | General productivity · Light gaming |
| 🟢 High | 65–84 | Gaming · Content creation |
| 🟣 Workstation | 85–100 | Professional · Heavy workloads |

</details>

<details>
<summary><b>🎨 Custom Frameless Dark UI</b></summary>

- Fully frameless window with custom titlebar and system controls
- 9-panel navigation: Overview · CPU · GPU · RAM · Storage · Battery · Thermals · Processes · Diagnostics
- Responsive layout with hardware cards, progress bars, and health ring
- Interactive diagnostics report with score grid and issues breakdown

</details>

---

## 🏗️ Architecture

### 🗂️ Project Structure

```plaintext
Device-Doctor/
│
├── 📁 src/
│   ├── 📄 main.js                        # Electron main process — window, IPC handlers
│   ├── 📄 preload.js                     # Secure context bridge — whitelisted API surface
│   │
│   ├── 📁 collectors/
│   │   └── 📄 systemCollector.js         # Hardware data collection (si + OS fallbacks)
│   │
│   ├── 📁 analyzer/
│   │   └── 📄 analyzer.js                # Diagnostics engine — scoring, issues, recommendations
│   │
│   └── 📁 renderer/
│       ├── 📄 index.html                 # Dashboard UI — 9-panel frameless layout
│       └── 📄 uiRenderer.js             # Frontend logic — view routing, data visualisation
│
├── 📁 assets/
│   └── 📁 icons/                         # App icons (.ico · .icns · .png)
│
├── 📄 package.json
└── 📄 README.md
```

### 🔄 Process Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                     │
│              index.html + uiRenderer.js                 │
│                                                         │
│   9 Navigation Panels · Hardware Cards · Health Ring    │
│   Progress Bars · Score Grid · Issues + Recs List       │
└───────────────────┬─────────────────────────────────────┘
                    │  IPC via contextBridge (preload.js)
                    │  nodeIntegration: false
                    │  contextIsolation: true
┌───────────────────▼─────────────────────────────────────┐
│                     Main Process                        │
│                       main.js                           │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │  systemCollector.js  │  │      analyzer.js         │ │
│  │                      │  │                          │ │
│  │  CPU · GPU · RAM     │  │  Issue Detection         │ │
│  │  Storage · Battery   │  │  Component Scoring 0-100 │ │
│  │  OS · Temps          │  │  Performance Tier        │ │
│  │  Processes · Drivers │  │  Recommendations         │ │
│  └──────────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 📋 Prerequisites

```
✓ Node.js 18+
✓ npm 8+
✓ Windows 10 / 11   (primary — full feature support)
✓ macOS / Linux     (in progress — core features available)
```

### 1️⃣ Clone

```bash
git clone https://github.com/your-username/Device-Doctor.git
cd Device-Doctor
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Start the App

```bash
# Production mode
npm start

# Development mode (with DevTools open)
npm run dev
```

---

## 📦 Build Distributable

```bash
# Windows — installer + portable .exe
npm run build:win

# macOS — .dmg
npm run build:mac

# Linux — .AppImage
npm run build:linux
```

> Built with `electron-builder`. Output in the `dist/` directory.

---

## 🛠️ How It Works

### 1️⃣ System Collector (`systemCollector.js`)

Uses the `systeminformation` npm package as the primary cross-platform data source, with OS-native fallbacks for Windows PowerShell / WMI queries.

| Component | Primary Source | Windows Fallback |
|---|---|---|
| CPU | `si.cpu()` | PowerShell `Win32_Processor` |
| GPU | `si.graphics()` | `nvidia-smi` · WMI |
| RAM | `si.memLayout()` | PowerShell `Win32_PhysicalMemory` |
| Storage | `si.diskLayout()` | WMI `Win32_DiskDrive` |
| Battery | `si.battery()` | PowerShell `Win32_Battery` |
| OS | `si.osInfo()` | `os` module |
| Temperatures | `si.cpuTemperature()` | — |
| Processes | `si.processes()` | PowerShell `Get-Process` |
| Drivers | — | PowerShell `Win32_PnPSignedDriver` |

### 2️⃣ Diagnostics Analyzer (`analyzer.js`)

Runs a multi-factor analysis pass on all collected hardware data:

```
Collected Hardware Data
        │
        ▼
Issue Detection
  CPU  → core count · load · clock
  GPU  → VRAM threshold · driver age
  RAM  → capacity · speed · usage %
  Storage → SMART status · wear level
  Battery → wear % · cycle count
  Thermals → critical temp thresholds
  Drivers → unsigned · outdated
        │
        ▼
Per-Component Scoring  (0 – 100)
        │
        ▼
Weighted Composite Score
        │
        ▼
Performance Tier  →  Basic / Mid / High / Workstation
        │
        ▼
Prioritised Recommendations
  upgrade · replace · optimize · update driver
```

### 3️⃣ UI Renderer (`uiRenderer.js`)

- Manages view routing across all **9 panels**
- Renders hardware cards with animated progress bars and status indicators
- Displays interactive diagnostics report: health ring · score grid · severity-ranked issues list · recommendation cards

---

## 🖥️ Platform Support

| Feature | Windows | macOS | Linux |
|---|---|---|---|
| CPU info | ✅ | ✅ | ✅ |
| GPU info | ✅ | ✅ | ✅ |
| nvidia-smi | ✅ | ✅ | ✅ |
| RAM layout | ✅ | ✅ | ✅ |
| Storage SMART | ✅ | ✅ | ✅ |
| Battery | ✅ | ✅ | ✅ |
| Temperatures | ✅* | ✅* | ✅* |
| Driver audit | ✅ | ❌ | ❌ |

> \* Temperature support depends on hardware and driver permissions.

---

## 🔧 Extending

### Add a New Diagnostic Check

In `analyzer.js`, extend the `analyze()` method:

```js
if (data.cpu && data.cpu.someNewProperty < threshold) {
  issues.push({
    component: 'CPU',
    severity: 'warning',      // 'critical' | 'warning' | 'info'
    code: 'MY_NEW_CHECK',
    message: 'Explanation of the issue shown in the UI.',
  });

  recommendations.push({
    component: 'CPU',
    type: 'upgrade',          // 'upgrade' | 'replace' | 'optimize' | 'driver'
    priority: 'medium',       // 'high' | 'medium' | 'low'
    title: 'Action title',
    detail: 'Detailed recommendation text shown on the diagnostics card.',
  });
}
```

### Add a New Data Collector

In `systemCollector.js`, add a method and register it in `collectAll()`:

```js
async getMyComponent() {
  if (si) {
    const data = await si.someMethod();
    return { /* structured result */ };
  }
  return this._getMyComponentFallback();
}

async collectAll() {
  const [cpu, gpu, /* ... */, myComponent] = await Promise.all([
    this.getCPU(),
    this.getGPU(),
    // ...
    this.getMyComponent(),
  ]);
  return { cpu, gpu, /* ... */, myComponent };
}
```

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `electron` | Cross-platform desktop app runtime |
| `systeminformation` | Cross-platform hardware data APIs |
| `electron-builder` | Packaging · installers · distribution |

---

## 🔐 Security Model

Device Doctor follows Electron security best practices throughout:

| Practice | Implementation |
|---|---|
| `nodeIntegration: false` | Renderer process has zero direct Node.js access |
| `contextIsolation: true` | Strict API surface enforced via `contextBridge` |
| Whitelisted APIs | Only explicitly defined methods exposed to renderer in `preload.js` |
| Safe external links | All external URLs opened via `shell.openExternal` through the system browser |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get involved:

1. **Open an Issue first** — discuss your idea before coding
2. **Fork** the repository
3. **Create a branch** — `git checkout -b feature/YourFeature`
4. **Commit your changes** — `git commit -m 'feat: Add YourFeature'`
5. **Push & open a Pull Request** with a clear description

### Contribution Areas

| Area | Difficulty | Skills Needed |
|---|---|---|
| 🐧 Linux driver support | Advanced | Node.js · Linux sysfs |
| 🍎 macOS driver audit | Advanced | Node.js · macOS `system_profiler` |
| 📊 New diagnostic checks | Medium | JavaScript · Hardware knowledge |
| 🎨 UI/UX improvements | Medium | HTML · CSS · Electron renderer |
| 🧪 Unit tests for analyzer | Medium | JavaScript · Jest |
| 📚 Documentation | Beginner | Markdown |

---

## 📄 License

<div align="center">

```
╔══════════════════════════════════════════════════════════════════╗
║                         MIT LICENSE                              ║
║                   Copyright (c) 2025 Device Doctor               ║
╚══════════════════════════════════════════════════════════════════╝
```

</div>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is provided to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

See [`LICENSE`](LICENSE) for full terms.

---

## 🙏 Acknowledgments

<div align="center">

| Technology | Purpose |
|---|---|
| **Electron** | Cross-platform desktop runtime |
| **Node.js** | Backend systems access and IPC |
| **systeminformation** | Hardware data APIs across all platforms |
| **electron-builder** | Packaging and distribution |
| **PowerShell / WMI** | Windows-native hardware fallback queries |
| **nvidia-smi** | GPU telemetry for NVIDIA hardware |

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,18,24&height=120&section=footer&animation=twinkling" width="100%"/>

**⭐ Star this repository if Device Doctor helped diagnose your machine!**

[![GitHub stars](https://img.shields.io/github/stars/your-username/Device-Doctor?style=social)](https://github.com/your-username/Device-Doctor/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/your-username/Device-Doctor?style=social)](https://github.com/your-username/Device-Doctor/network/members)
[![GitHub issues](https://img.shields.io/github/issues/your-username/Device-Doctor?style=social)](https://github.com/your-username/Device-Doctor/issues)

<br/>

*Built with ❤️ for developers, power users, and IT professionals everywhere*

[🐛 Report Bug](https://github.com/your-username/Device-Doctor/issues) &nbsp;·&nbsp; [💡 Request Feature](https://github.com/your-username/Device-Doctor/issues) &nbsp;·&nbsp; [📖 Documentation](https://github.com/your-username/Device-Doctor/wiki)

</div>
