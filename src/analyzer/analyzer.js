/**
 * analyzer.js — Diagnostics, Bottleneck Detection & Scoring Engine
 *
 * Takes the raw JSON from systemCollector and produces:
 *  - Issues array (severity: critical | warning | info)
 *  - Recommendations array
 *  - Performance tier (Basic | Mid | High | Workstation)
 *  - Component scores (0–100)
 *  - Overall health score
 */

class Analyzer {

  analyze(data) {
    const issues = [];
    const recommendations = [];
    const scores = {};

    // ── CPU ─────────────────────────────────────────────────────────────────
    if (data.cpu) {
      scores.cpu = this._scoreCPU(data.cpu);

      if (data.cpu.physicalCores <= 2) {
        issues.push({
          component: 'CPU',
          severity: 'warning',
          code: 'CPU_LOW_CORES',
          message: `Only ${data.cpu.physicalCores} physical core(s) detected. Modern workloads benefit from 6+ cores.`,
        });
        recommendations.push({
          component: 'CPU',
          type: 'upgrade',
          priority: 'medium',
          title: 'Upgrade to a multi-core processor',
          detail: 'Consider a CPU with 6–12 cores for significantly better multitasking and performance.',
        });
      }

      if (data.cpu.load !== null && data.cpu.load > 85) {
        issues.push({
          component: 'CPU',
          severity: 'critical',
          code: 'CPU_HIGH_LOAD',
          message: `CPU is at ${data.cpu.load}% utilisation — this is a bottleneck right now.`,
        });
      }
    }

    // ── GPU ─────────────────────────────────────────────────────────────────
    if (data.gpu && data.gpu.length > 0) {
      const mainGPU = data.gpu[0];
      scores.gpu = this._scoreGPU(mainGPU);

      if (mainGPU.vram && mainGPU.vram < 2048) {
        issues.push({
          component: 'GPU',
          severity: 'warning',
          code: 'GPU_LOW_VRAM',
          message: `GPU VRAM is only ${mainGPU.vram}MB. Modern apps and games typically need 4GB+.`,
        });
        recommendations.push({
          component: 'GPU',
          type: 'upgrade',
          priority: 'high',
          title: 'GPU upgrade recommended',
          detail: `Your current GPU (${mainGPU.model}) has ${mainGPU.vram}MB VRAM. Consider a card with 8GB+ for smooth performance.`,
        });
      }

      if (mainGPU.driverVersion) {
        const driverAge = this._estimateDriverAge(mainGPU.driverDate);
        if (driverAge > 180) {
          issues.push({
            component: 'GPU',
            severity: 'warning',
            code: 'GPU_OUTDATED_DRIVER',
            message: `GPU driver appears to be ${Math.floor(driverAge / 30)} months old. Outdated drivers can cause crashes and poor performance.`,
          });
          recommendations.push({
            component: 'GPU',
            type: 'driver',
            priority: 'medium',
            title: 'Update GPU drivers',
            detail: `Current version: ${mainGPU.driverVersion}. Visit your GPU manufacturer's website to download the latest drivers.`,
          });
        }
      }

      if (mainGPU.temperature && mainGPU.temperature > 85) {
        issues.push({
          component: 'GPU',
          severity: 'critical',
          code: 'GPU_HIGH_TEMP',
          message: `GPU temperature is ${mainGPU.temperature}°C — above safe limits. Check cooling.`,
        });
      }
    }

    // ── RAM ─────────────────────────────────────────────────────────────────
    if (data.ram) {
      scores.ram = this._scoreRAM(data.ram);

      if (data.ram.totalGB < 8) {
        issues.push({
          component: 'RAM',
          severity: 'critical',
          code: 'RAM_LOW',
          message: `Only ${data.ram.totalGB}GB RAM installed. 8GB is the modern minimum; 16GB recommended.`,
        });
        recommendations.push({
          component: 'RAM',
          type: 'upgrade',
          priority: 'high',
          title: 'Upgrade RAM to at least 16GB',
          detail: `${data.ram.totalGB}GB is insufficient for modern OS, browser, and productivity workloads. Upgrading to 16–32GB will noticeably improve responsiveness.`,
        });
      } else if (data.ram.totalGB < 16) {
        issues.push({
          component: 'RAM',
          severity: 'warning',
          code: 'RAM_MARGINAL',
          message: `${data.ram.totalGB}GB RAM is functional but tight for power users. 16GB+ recommended.`,
        });
      }

      if (data.ram.usagePercent > 85) {
        issues.push({
          component: 'RAM',
          severity: 'warning',
          code: 'RAM_HIGH_USAGE',
          message: `RAM usage is at ${data.ram.usagePercent}%. System may be swapping to disk, reducing performance.`,
        });
      }

      if (data.ram.totalSticks >= 2 && !data.ram.dualChannel) {
        issues.push({
          component: 'RAM',
          severity: 'info',
          code: 'RAM_NOT_DUAL_CHANNEL',
          message: 'RAM sticks may not be in dual-channel configuration, leaving bandwidth on the table.',
        });
        recommendations.push({
          component: 'RAM',
          type: 'optimize',
          priority: 'low',
          title: 'Enable dual-channel RAM',
          detail: 'Ensure RAM sticks are seated in the correct slots (usually A2/B2) for dual-channel mode, which improves memory bandwidth by up to 30%.',
        });
      }

      if (data.ram.speed && data.ram.speed < 2400) {
        issues.push({
          component: 'RAM',
          severity: 'info',
          code: 'RAM_SLOW_SPEED',
          message: `RAM speed is ${data.ram.speed}MHz. Modern DDR4/DDR5 runs at 3200–6000MHz+.`,
        });
      }
    }

    // ── Storage ──────────────────────────────────────────────────────────────
    if (data.storage && data.storage.drives) {
      scores.storage = this._scoreStorage(data.storage);

      for (const drive of data.storage.drives) {
        if (drive.smartStatus && drive.smartStatus.toLowerCase() !== 'ok') {
          issues.push({
            component: 'Storage',
            severity: 'critical',
            code: 'STORAGE_SMART_FAIL',
            message: `Drive "${drive.name}" has a failing SMART status: "${drive.smartStatus}". Back up data immediately.`,
          });
          recommendations.push({
            component: 'Storage',
            type: 'replace',
            priority: 'critical',
            title: `Replace drive: ${drive.name}`,
            detail: 'SMART failure indicates imminent drive failure. Back up all data immediately and replace the drive.',
          });
        }

        // Fake health score from temperature (real SMART health needs smartmontools)
        if (drive.temperature && drive.temperature > 55) {
          issues.push({
            component: 'Storage',
            severity: 'warning',
            code: 'STORAGE_HIGH_TEMP',
            message: `Drive "${drive.name}" temperature is ${drive.temperature}°C. Normal is <45°C.`,
          });
        }

        if (drive.type === 'HDD') {
          issues.push({
            component: 'Storage',
            severity: 'info',
            code: 'STORAGE_HDD',
            message: `"${drive.name}" is an HDD. Upgrading to an SSD would dramatically improve boot and load times.`,
          });
          recommendations.push({
            component: 'Storage',
            type: 'upgrade',
            priority: 'high',
            title: 'Replace HDD with SSD',
            detail: `SSDs are 5–10× faster than HDDs for daily tasks. A 500GB–1TB NVMe SSD costs under $70 and transforms system responsiveness.`,
          });
        }
      }

      // Check disk partitions for near-full volumes
      if (data.storage.partitions) {
        for (const p of data.storage.partitions) {
          if (p.usePercent > 90) {
            issues.push({
              component: 'Storage',
              severity: 'critical',
              code: 'STORAGE_ALMOST_FULL',
              message: `Volume "${p.fs}" is ${p.usePercent}% full (${p.usedGB}GB / ${p.sizeGB}GB). This can severely slow the system.`,
            });
            recommendations.push({
              component: 'Storage',
              type: 'maintenance',
              priority: 'high',
              title: `Free up space on ${p.fs}`,
              detail: 'Delete unnecessary files, uninstall unused programs, or move data to external storage.',
            });
          }
        }
      }
    }

    // ── Battery ──────────────────────────────────────────────────────────────
    if (data.battery && data.battery.hasBattery) {
      scores.battery = this._scoreBattery(data.battery);

      if (data.battery.wearPercent !== null) {
        if (data.battery.wearPercent >= 50) {
          issues.push({
            component: 'Battery',
            severity: 'critical',
            code: 'BATTERY_CRITICAL_WEAR',
            message: `Battery has ${data.battery.wearPercent}% wear — capacity is severely degraded. Replacement strongly recommended.`,
          });
          recommendations.push({
            component: 'Battery',
            type: 'replace',
            priority: 'high',
            title: 'Replace battery',
            detail: `Battery capacity has degraded to ${data.battery.healthPercent}% of original design. Contact manufacturer or a service center for replacement.`,
          });
        } else if (data.battery.wearPercent >= 30) {
          issues.push({
            component: 'Battery',
            severity: 'warning',
            code: 'BATTERY_HIGH_WEAR',
            message: `Battery wear is at ${data.battery.wearPercent}% — noticeably reduced capacity.`,
          });
          recommendations.push({
            component: 'Battery',
            type: 'monitor',
            priority: 'medium',
            title: 'Monitor battery health',
            detail: 'Battery is showing significant wear. Avoid full charge/discharge cycles and consider replacement if issues worsen.',
          });
        }
      }

      if (data.battery.cycleCount && data.battery.cycleCount > 800) {
        issues.push({
          component: 'Battery',
          severity: 'warning',
          code: 'BATTERY_HIGH_CYCLES',
          message: `Battery cycle count is ${data.battery.cycleCount}. Most batteries are rated for 300–500 cycles.`,
        });
      }
    }

    // ── Temperatures ─────────────────────────────────────────────────────────
    if (data.temperatures && data.temperatures.cpuMain) {
      scores.thermals = this._scoreThermals(data.temperatures);

      if (data.temperatures.cpuMain > 90) {
        issues.push({
          component: 'Thermals',
          severity: 'critical',
          code: 'CPU_CRITICAL_TEMP',
          message: `CPU is at ${data.temperatures.cpuMain}°C — critically hot. Thermal throttling is likely occurring.`,
        });
        recommendations.push({
          component: 'Thermals',
          type: 'maintenance',
          priority: 'critical',
          title: 'Address CPU overheating immediately',
          detail: 'Clean dust from vents/heatsink, replace thermal paste, or improve case airflow. Sustained high temps degrade hardware.',
        });
      } else if (data.temperatures.cpuMain > 75) {
        issues.push({
          component: 'Thermals',
          severity: 'warning',
          code: 'CPU_HIGH_TEMP',
          message: `CPU is at ${data.temperatures.cpuMain}°C — running warm under load.`,
        });
        recommendations.push({
          component: 'Thermals',
          type: 'maintenance',
          priority: 'medium',
          title: 'Improve CPU cooling',
          detail: 'Consider cleaning dust buildup or upgrading the CPU cooler if temperatures regularly exceed 80°C.',
        });
      }
    }

    // ── Drivers ───────────────────────────────────────────────────────────────
    if (data.drivers && data.drivers.length > 0) {
      const unsignedDrivers = data.drivers.filter(d => d.signed === false);
      if (unsignedDrivers.length > 0) {
        issues.push({
          component: 'Drivers',
          severity: 'warning',
          code: 'DRIVERS_UNSIGNED',
          message: `${unsignedDrivers.length} unsigned driver(s) found. These can cause instability.`,
        });
      }
    }

    // ── Performance Tier ──────────────────────────────────────────────────────
    const tier = this._calcTier(data, scores);

    // ── Overall Health Score ──────────────────────────────────────────────────
    const scoreValues = Object.values(scores).filter(v => v !== null && v !== undefined);
    const overallScore = scoreValues.length
      ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
      : 50;

    return {
      generatedAt: new Date().toISOString(),
      overallScore,
      tier,
      issues: issues.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      }),
      recommendations: recommendations.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      }),
      scores,
      summary: this._buildSummary(overallScore, tier, issues),
    };
  }

  // ── Scoring helpers ─────────────────────────────────────────────────────

  _scoreCPU(cpu) {
    let score = 50;
    if (cpu.physicalCores >= 16) score = 95;
    else if (cpu.physicalCores >= 8)  score = 80;
    else if (cpu.physicalCores >= 6)  score = 70;
    else if (cpu.physicalCores >= 4)  score = 55;
    else if (cpu.physicalCores >= 2)  score = 35;
    else score = 15;

    if (cpu.baseSpeed >= 4.0) score = Math.min(100, score + 10);
    if (cpu.load > 85) score = Math.max(0, score - 20);
    return score;
  }

  _scoreGPU(gpu) {
    if (!gpu) return 30;
    let score = 40;
    const vram = gpu.vram || 0;
    if (vram >= 16384) score = 98;
    else if (vram >= 8192) score = 85;
    else if (vram >= 6144) score = 75;
    else if (vram >= 4096) score = 60;
    else if (vram >= 2048) score = 45;
    else score = 25;
    return score;
  }

  _scoreRAM(ram) {
    let score = 50;
    if (ram.totalGB >= 64) score = 100;
    else if (ram.totalGB >= 32) score = 90;
    else if (ram.totalGB >= 16) score = 75;
    else if (ram.totalGB >= 8)  score = 55;
    else if (ram.totalGB >= 4)  score = 30;
    else score = 10;

    if (ram.dualChannel) score = Math.min(100, score + 5);
    if (ram.speed >= 3200)  score = Math.min(100, score + 5);
    if (ram.usagePercent > 85) score = Math.max(0, score - 15);
    return score;
  }

  _scoreStorage(storage) {
    let score = 60;
    for (const drive of storage.drives) {
      if (drive.smartStatus && drive.smartStatus.toLowerCase() !== 'ok') score -= 40;
      if (drive.type === 'SSD' || drive.type === 'NVMe') score = Math.min(100, score + 15);
    }
    const fullPartitions = (storage.partitions || []).filter(p => p.usePercent > 90);
    score -= fullPartitions.length * 10;
    return Math.max(0, Math.min(100, score));
  }

  _scoreBattery(battery) {
    if (!battery.hasBattery) return null;
    return battery.healthPercent ?? (100 - (battery.wearPercent || 0));
  }

  _scoreThermals(temps) {
    const t = temps.cpuMain;
    if (t === null || t === undefined) return 70;
    if (t < 50) return 100;
    if (t < 65) return 85;
    if (t < 75) return 70;
    if (t < 85) return 50;
    if (t < 90) return 30;
    return 10;
  }

  _calcTier(data, scores) {
    const cpuScore   = scores.cpu || 50;
    const gpuScore   = scores.gpu || 40;
    const ramScore   = scores.ram || 50;

    const composite = (cpuScore * 0.35) + (gpuScore * 0.35) + (ramScore * 0.30);

    if (composite >= 88) return 'Workstation';
    if (composite >= 70) return 'High';
    if (composite >= 48) return 'Mid';
    return 'Basic';
  }

  _estimateDriverAge(driverDate) {
    if (!driverDate) return 0;
    // WMI date format: "20230512000000.000000+000"
    const match = String(driverDate).match(/^(\d{4})(\d{2})(\d{2})/);
    if (!match) return 0;
    const date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
    return (Date.now() - date.getTime()) / 86400000; // days
  }

  _buildSummary(score, tier, issues) {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;

    if (critical > 0) {
      return `System has ${critical} critical issue(s) requiring immediate attention. Overall health is ${score}/100.`;
    }
    if (warnings > 0) {
      return `System is functional with ${warnings} item(s) to address. Performance tier: ${tier}. Health: ${score}/100.`;
    }
    return `System is healthy! Performance tier: ${tier}. Overall health: ${score}/100.`;
  }
}

module.exports = Analyzer;
