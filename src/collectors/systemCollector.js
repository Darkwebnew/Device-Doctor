/**
 * systemCollector.js — Hardware & OS Data Collector
 *
 * Strategy:
 *   - Primary: `systeminformation` npm package (cross-platform, reliable)
 *   - Fallback: Native OS commands (PowerShell/WMIC on Windows, etc.)
 *   - Each collector runs independently; failures are caught and marked
 */

const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

// Try to load systeminformation — optional dependency
let si;
try { si = require('systeminformation'); } catch { si = null; }

class SystemCollector {
  constructor() {
    this.platform = process.platform; // 'win32' | 'darwin' | 'linux'
    this.errors = [];
  }

  // ── Public entry point ────────────────────────────────────────────────────

  async collectAll() {
    console.log(`[Collector] Starting full system scan on ${this.platform}…`);
    const startTime = Date.now();

    const [cpu, gpu, ram, storage, battery, os_, temps, processes, drivers] =
      await Promise.allSettled([
        this.getCPU(),
        this.getGPU(),
        this.getRAM(),
        this.getStorage(),
        this.getBattery(),
        this.getOS(),
        this.getTemperatures(),
        this.getTopProcesses(),
        this.getDrivers(),
      ]);

    const result = {
      collectedAt: new Date().toISOString(),
      scanDuration: Date.now() - startTime,
      platform: this.platform,
      cpu: this._unwrap(cpu, 'cpu'),
      gpu: this._unwrap(gpu, 'gpu'),
      ram: this._unwrap(ram, 'ram'),
      storage: this._unwrap(storage, 'storage'),
      battery: this._unwrap(battery, 'battery'),
      os: this._unwrap(os_, 'os'),
      temperatures: this._unwrap(temps, 'temperatures'),
      processes: this._unwrap(processes, 'processes'),
      drivers: this._unwrap(drivers, 'drivers'),
      errors: this.errors,
    };

    console.log(`[Collector] Scan complete in ${result.scanDuration}ms`);
    return result;
  }

  _unwrap(settled, key) {
    if (settled.status === 'fulfilled') return settled.value;
    const msg = settled.reason?.message || 'Unknown error';
    this.errors.push({ component: key, error: msg });
    console.error(`[Collector] ${key} failed:`, msg);
    return null;
  }

  // ── CPU ───────────────────────────────────────────────────────────────────

  async getCPU() {
    if (si) {
      const [cpu, cpuSpeed, cpuLoad] = await Promise.all([
        si.cpu(),
        si.cpuCurrentSpeed(),
        si.currentLoad(),
      ]);
      return {
        model: `${cpu.manufacturer} ${cpu.brand}`.trim(),
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        physicalCores: cpu.physicalCores,
        cores: cpu.cores,
        threads: cpu.cores,
        baseSpeed: cpu.speed,            // GHz
        maxSpeed: cpu.speedMax,
        currentSpeed: cpuSpeed.avg,
        socket: cpu.socket,
        cache: {
          l1d: cpu.cache?.l1d,
          l1i: cpu.cache?.l1i,
          l2: cpu.cache?.l2,
          l3: cpu.cache?.l3,
        },
        load: Math.round(cpuLoad.currentLoad),
        architecture: os.arch(),
      };
    }

    // Fallback: Windows PowerShell
    if (this.platform === 'win32') return this._getCPUWindows();
    if (this.platform === 'linux')  return this._getCPULinux();
    if (this.platform === 'darwin') return this._getCPUMac();
    throw new Error('Unsupported platform for CPU collection');
  }

  async _getCPUWindows() {
    const ps = `Get-WmiObject Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,CurrentClockSpeed | ConvertTo-Json`;
    const { stdout } = await execAsync(`powershell -Command "${ps}"`);
    const raw = JSON.parse(stdout);
    const d = Array.isArray(raw) ? raw[0] : raw;
    return {
      model: d.Name?.trim(),
      physicalCores: d.NumberOfCores,
      threads: d.NumberOfLogicalProcessors,
      baseSpeed: +(d.MaxClockSpeed / 1000).toFixed(2),
      currentSpeed: +(d.CurrentClockSpeed / 1000).toFixed(2),
      load: null,
    };
  }

  async _getCPULinux() {
    const { stdout } = await execAsync('lscpu');
    const parse = (key) => {
      const m = stdout.match(new RegExp(`${key}:\\s+(.+)`));
      return m ? m[1].trim() : null;
    };
    return {
      model: parse('Model name'),
      physicalCores: parseInt(parse('Core\\(s\\) per socket') || '0'),
      threads: parseInt(parse('CPU\\(s\\)') || '0'),
      baseSpeed: parseFloat(parse('CPU MHz') || '0') / 1000,
      architecture: parse('Architecture'),
      load: null,
    };
  }

  async _getCPUMac() {
    const { stdout } = await execAsync('sysctl -n machdep.cpu.brand_string');
    const cores = await execAsync('sysctl -n hw.physicalcpu');
    const threads = await execAsync('sysctl -n hw.logicalcpu');
    return {
      model: stdout.trim(),
      physicalCores: parseInt(cores.stdout),
      threads: parseInt(threads.stdout),
      load: null,
    };
  }

  // ── GPU ───────────────────────────────────────────────────────────────────

  async getGPU() {
    const gpus = [];

    // systeminformation graphics
    if (si) {
      const graphics = await si.graphics();
      for (const c of graphics.controllers) {
        gpus.push({
          model: c.model,
          vendor: c.vendor,
          vram: c.vram,           // MB
          vramDynamic: c.vramDynamic,
          driverVersion: c.driverVersion,
          driverDate: c.driverDate,
          bus: c.bus,
        });
      }
    }

    // Augment with nvidia-smi if available
    const nvData = await this._getNvidiaSMI().catch(() => null);
    if (nvData) {
      // Merge nvidia data into matching GPU entry
      const nvIdx = gpus.findIndex(g => /nvidia/i.test(g.vendor || g.model));
      if (nvIdx >= 0) Object.assign(gpus[nvIdx], nvData);
      else gpus.push(nvData);
    }

    return gpus.length ? gpus : await this._getGPUFallback();
  }

  async _getNvidiaSMI() {
    const cmd = 'nvidia-smi --query-gpu=name,memory.total,driver_version,temperature.gpu,utilization.gpu --format=csv,noheader,nounits';
    const { stdout } = await execAsync(cmd);
    const [name, memMB, driver, temp, util] = stdout.trim().split(',').map(s => s.trim());
    return {
      model: name,
      vendor: 'NVIDIA',
      vram: parseInt(memMB),
      driverVersion: driver,
      temperature: parseInt(temp),
      utilization: parseInt(util),
      source: 'nvidia-smi',
    };
  }

  async _getGPUFallback() {
    if (this.platform !== 'win32') return [];
    const ps = `Get-WmiObject Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion,DriverDate | ConvertTo-Json`;
    const { stdout } = await execAsync(`powershell -Command "${ps}"`);
    const raw = JSON.parse(stdout);
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map(d => ({
      model: d.Name?.trim(),
      vram: d.AdapterRAM ? Math.round(d.AdapterRAM / 1024 / 1024) : null,
      driverVersion: d.DriverVersion,
      driverDate: d.DriverDate,
    }));
  }

  // ── RAM ───────────────────────────────────────────────────────────────────

  async getRAM() {
    if (si) {
      const [mem, memLayout] = await Promise.all([si.mem(), si.memLayout()]);
      const sticks = memLayout.filter(s => s.size > 0);
      const totalGB = +(mem.total / 1073741824).toFixed(1);
      const usedGB  = +(mem.used  / 1073741824).toFixed(1);
      const freeGB  = +(mem.free  / 1073741824).toFixed(1);

      // Dual-channel heuristic: even number of sticks, matching size/type
      const dualChannel = sticks.length >= 2 &&
        sticks.length % 2 === 0 &&
        sticks.every(s => s.size === sticks[0].size);

      return {
        totalGB,
        usedGB,
        freeGB,
        usagePercent: Math.round((usedGB / totalGB) * 100),
        sticks: sticks.map(s => ({
          bank: s.bank,
          type: s.type,
          sizeGB: +(s.size / 1073741824).toFixed(0),
          speed: s.clockSpeed,    // MHz
          manufacturer: s.manufacturer,
          partNumber: s.partNum?.trim(),
          formFactor: s.formFactor,
        })),
        dualChannel,
        totalSticks: sticks.length,
        speed: sticks[0]?.clockSpeed || null,
        type: sticks[0]?.type || null,
      };
    }

    // Fallback Windows
    if (this.platform === 'win32') return this._getRAMWindows();
    return { totalGB: +(os.totalmem() / 1073741824).toFixed(1) };
  }

  async _getRAMWindows() {
    const ps = `Get-WmiObject Win32_PhysicalMemory | Select-Object Capacity,Speed,Manufacturer,MemoryType,BankLabel | ConvertTo-Json`;
    const { stdout } = await execAsync(`powershell -Command "${ps}"`);
    const raw = JSON.parse(stdout);
    const arr = Array.isArray(raw) ? raw : [raw];
    const totalGB = arr.reduce((sum, s) => sum + (s.Capacity || 0), 0) / 1073741824;
    return {
      totalGB: +totalGB.toFixed(1),
      sticks: arr.map(s => ({
        sizeGB: +(s.Capacity / 1073741824).toFixed(0),
        speed: s.Speed,
        manufacturer: s.Manufacturer?.trim(),
        bank: s.BankLabel,
      })),
      dualChannel: arr.length >= 2 && arr.length % 2 === 0,
    };
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  async getStorage() {
    const drives = [];

    if (si) {
      const [diskLayout, fsSize] = await Promise.all([
        si.diskLayout(),
        si.fsSize(),
      ]);

      for (const disk of diskLayout) {
        const sizeGB = +(disk.size / 1073741824).toFixed(0);
        drives.push({
          name: disk.name,
          vendor: disk.vendor,
          type: disk.type,        // SSD | HDD | NVMe
          interfaceType: disk.interfaceType,
          sizeGB,
          serialNum: disk.serialNum,
          firmwareRevision: disk.firmwareRevision,
          smartStatus: disk.smartStatus,  // OK | Predicted Failure | Unknown
          temperature: disk.temperature,
        });
      }

      // Add filesystem usage
      const partitions = fsSize.map(f => ({
        fs: f.fs,
        type: f.type,
        sizeGB: +(f.size / 1073741824).toFixed(1),
        usedGB: +(f.used / 1073741824).toFixed(1),
        usePercent: f.use,
        mount: f.mount,
      }));

      return { drives, partitions };
    }

    // Fallback Windows
    return this._getStorageWindows();
  }

  async _getStorageWindows() {
    const ps = `Get-WmiObject Win32_DiskDrive | Select-Object Model,MediaType,Size,Status | ConvertTo-Json`;
    const { stdout } = await execAsync(`powershell -Command "${ps}"`);
    const raw = JSON.parse(stdout);
    const arr = Array.isArray(raw) ? raw : [raw];
    return {
      drives: arr.map(d => ({
        name: d.Model?.trim(),
        type: d.MediaType?.includes('SSD') ? 'SSD' : 'HDD',
        sizeGB: d.Size ? +(d.Size / 1073741824).toFixed(0) : null,
        smartStatus: d.Status,
      })),
    };
  }

  // ── Battery ───────────────────────────────────────────────────────────────

  async getBattery() {
    if (si) {
      const b = await si.battery();
      if (!b.hasBattery) return { hasBattery: false };

      const wearPercent = b.designedCapacity > 0
        ? Math.round((1 - b.maxCapacity / b.designedCapacity) * 100)
        : null;

      return {
        hasBattery: true,
        percent: b.percent,
        isCharging: b.isCharging,
        maxCapacityWh: b.maxCapacity,
        designCapacityWh: b.designedCapacity,
        currentCapacityWh: b.currentCapacity,
        wearPercent,
        healthPercent: wearPercent !== null ? 100 - wearPercent : null,
        voltage: b.voltage,
        manufacturer: b.manufacturer,
        model: b.model,
        type: b.type,
        timeRemaining: b.timeRemaining,   // minutes
        cycleCount: b.cycleCount,
      };
    }

    // Fallback Windows PowerShell
    if (this.platform === 'win32') return this._getBatteryWindows();
    return { hasBattery: false };
  }

  async _getBatteryWindows() {
    try {
      const ps = `(Get-WmiObject -Class Win32_Battery) | Select-Object EstimatedChargeRemaining,BatteryStatus,DesignCapacity,FullChargeCapacity | ConvertTo-Json`;
      const { stdout } = await execAsync(`powershell -Command "${ps}"`);
      if (!stdout.trim()) return { hasBattery: false };
      const d = JSON.parse(stdout);
      const wear = d.DesignCapacity > 0
        ? Math.round((1 - d.FullChargeCapacity / d.DesignCapacity) * 100) : null;
      return {
        hasBattery: true,
        percent: d.EstimatedChargeRemaining,
        isCharging: d.BatteryStatus === 2,
        wearPercent: wear,
        healthPercent: wear !== null ? 100 - wear : null,
      };
    } catch {
      return { hasBattery: false };
    }
  }

  // ── Operating System ──────────────────────────────────────────────────────

  async getOS() {
    if (si) {
      const [osInfo, versions] = await Promise.all([si.osInfo(), si.versions()]);
      return {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        build: osInfo.build,
        arch: osInfo.arch,
        hostname: osInfo.hostname,
        kernel: osInfo.kernel,
        uefi: osInfo.uefi,
        nodeVersion: versions.node,
      };
    }

    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
    };
  }

  // ── Temperatures ──────────────────────────────────────────────────────────

  async getTemperatures() {
    if (si) {
      const temps = await si.cpuTemperature();
      return {
        cpuMain: temps.main,
        cpuCores: temps.cores,
        cpuMax: temps.max,
        chipset: temps.chipset,
        socket: temps.socket,
      };
    }
    return { cpuMain: null, note: 'Temperature data unavailable without systeminformation' };
  }

  // ── Top Processes ─────────────────────────────────────────────────────────

  async getTopProcesses() {
    if (si) {
      const procs = await si.processes();
      const top = procs.list
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 10)
        .map(p => ({
          name: p.name,
          pid: p.pid,
          cpu: +p.cpu.toFixed(1),
          memMB: +(p.memVsz / 1024).toFixed(0),
          state: p.state,
          command: p.command?.slice(0, 60),
        }));
      return {
        total: procs.all,
        running: procs.running,
        sleeping: procs.sleeping,
        top,
      };
    }

    if (this.platform === 'win32') {
      const ps = `Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name,Id,CPU,WorkingSet | ConvertTo-Json`;
      const { stdout } = await execAsync(`powershell -Command "${ps}"`);
      const arr = JSON.parse(stdout);
      return {
        top: arr.map(p => ({
          name: p.Name,
          pid: p.Id,
          cpu: p.CPU ? +p.CPU.toFixed(1) : 0,
          memMB: p.WorkingSet ? Math.round(p.WorkingSet / 1048576) : 0,
        })),
      };
    }

    return { top: [] };
  }

  // ── Drivers (Windows) ─────────────────────────────────────────────────────

  async getDrivers() {
    if (this.platform !== 'win32') return [];

    try {
      const ps = `Get-WmiObject Win32_PnPSignedDriver | Where-Object {$_.DeviceName -ne $null} | Select-Object DeviceName,DriverVersion,DriverDate,IsSigned,DeviceClass | Sort-Object DeviceClass | ConvertTo-Json -Compress`;
      const { stdout } = await execAsync(`powershell -Command "${ps}"`, { timeout: 15000 });
      const raw = JSON.parse(stdout);
      const arr = Array.isArray(raw) ? raw : [raw];
      return arr
        .filter(d => d.DeviceName)
        .map(d => ({
          name: d.DeviceName,
          version: d.DriverVersion,
          date: d.DriverDate,
          signed: d.IsSigned,
          class: d.DeviceClass,
        }));
    } catch {
      return [];
    }
  }
}

module.exports = SystemCollector;
