/**
 * uiRenderer.js — Frontend UI Logic
 * Handles all DOM updates, view switching, scan coordination, and diagnostics display.
 */

// ── State ─────────────────────────────────────────────────────────────────────
let systemData = null;
let diagReport  = null;
let currentView = 'overview';

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Show platform
  const platform = window.deviceDoctor?.platform || 'unknown';
  document.getElementById('platform-info').textContent = `Platform: ${platform}`;

  // Auto-scan on load
  setTimeout(() => runScan(), 300);
});

// ── View Switching ─────────────────────────────────────────────────────────────
function switchView(name) {
  currentView = name;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === name);
  });
  document.querySelectorAll('.view').forEach(el => {
    el.classList.toggle('active', el.id === `view-${name}`);
  });

  // Hide empty state when showing any view with data
  if (systemData) {
    document.getElementById('empty-state').style.display = 'none';
  }

  // Diagnose results only show in overview
  const dr = document.getElementById('diagnose-results');
  if (dr) dr.style.display = (name === 'overview' && diagReport) ? 'flex' : 'none';
}

// ── Scan ──────────────────────────────────────────────────────────────────────
async function runScan() {
  setLoading(true, 'SCANNING SYSTEM…', 'Collecting hardware data…');
  document.getElementById('scan-btn').disabled = true;
  document.getElementById('diagnose-btn').disabled = true;
  document.getElementById('scan-status').textContent = '';
  document.getElementById('scan-status').className = 'scan-status scanning';

  const loadingSteps = [
    'Reading CPU info…',
    'Querying GPU…',
    'Enumerating RAM sticks…',
    'Checking storage SMART…',
    'Reading battery stats…',
    'Probing temperatures…',
    'Listing processes…',
    'Fetching driver list…',
    'Finalising…',
  ];
  let stepIdx = 0;
  const stepInterval = setInterval(() => {
    if (stepIdx < loadingSteps.length) {
      document.getElementById('loader-steps').textContent = loadingSteps[stepIdx++];
    }
  }, 600);

  try {
    const result = await window.deviceDoctor.scanSystem();
    clearInterval(stepInterval);

    if (!result.success) throw new Error(result.error);
    systemData = result.data;

    renderAll(systemData);
    document.getElementById('scan-status').textContent = '✓ Scan complete';
    document.getElementById('scan-status').className = 'scan-status';
    document.getElementById('scan-status').style.color = 'var(--green)';

    const now = new Date();
    document.getElementById('last-scan-time').textContent =
      `Last scan: ${now.toLocaleTimeString()}`;

    document.getElementById('diagnose-btn').disabled = false;
    diagReport = null;
    document.getElementById('diagnose-results').style.display = 'none';
  } catch (err) {
    clearInterval(stepInterval);
    document.getElementById('scan-status').textContent = '✗ Scan failed';
    document.getElementById('scan-status').className = 'scan-status';
    document.getElementById('scan-status').style.color = 'var(--red)';
    console.error('Scan error:', err);
    showErrorToast(`Scan failed: ${err.message}`);
  } finally {
    setLoading(false);
    document.getElementById('scan-btn').disabled = false;
  }
}

// ── Diagnose ─────────────────────────────────────────────────────────────────
async function runDiagnose() {
  if (!systemData) return;
  setLoading(true, 'DIAGNOSING…', 'Analysing hardware data…');

  try {
    const result = await window.deviceDoctor.diagnose(systemData);
    if (!result.success) throw new Error(result.error);
    diagReport = result.report;
    renderDiagnoseReport(diagReport);
    switchView('overview');
  } catch (err) {
    console.error('Diagnose error:', err);
    showErrorToast(`Diagnosis failed: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

// ── Master Render ─────────────────────────────────────────────────────────────
function renderAll(data) {
  document.getElementById('empty-state').style.display = 'none';
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));

  renderOverviewBar(data);
  renderHWCards(data);
  renderCPUView(data.cpu);
  renderGPUView(data.gpu);
  renderMemoryView(data.ram);
  renderStorageView(data.storage);
  renderBatteryView(data.battery);
  renderThermalsView(data.temperatures);
  renderProcessesView(data.processes);
  renderDriversView(data.drivers);

  switchView('overview');
}

// ── Overview Bar ──────────────────────────────────────────────────────────────
function renderOverviewBar(data) {
  const bar = document.getElementById('overview-bar');
  bar.style.display = 'grid';

  document.getElementById('ov-hostname').textContent = data.os?.hostname || '—';
  document.getElementById('ov-os').textContent =
    data.os ? `${data.os.distro || data.os.platform} ${data.os.release || ''}` : '—';
  document.getElementById('ov-ram').textContent =
    data.ram ? `${data.ram.totalGB}GB` : '—';
  document.getElementById('ov-cores').textContent =
    data.cpu ? `${data.cpu.physicalCores}C/${data.cpu.threads || data.cpu.physicalCores}T` : '—';
  document.getElementById('ov-score').textContent = '—';
  document.getElementById('ov-tier').textContent = '—';
}

// ── HW Cards (Overview Grid) ──────────────────────────────────────────────────
function renderHWCards(data) {
  const section = document.getElementById('hw-cards-section');
  section.style.display = 'block';
  const grid = document.getElementById('hw-cards');
  grid.innerHTML = '';

  // CPU card
  if (data.cpu) {
    grid.appendChild(makeCard({
      title: 'CPU', icon: '⚙', score: null,
      main: data.cpu.model || 'Unknown CPU',
      rows: [
        ['Cores / Threads', `${data.cpu.physicalCores}C / ${data.cpu.threads || '?'}T`],
        ['Base Speed', data.cpu.baseSpeed ? `${data.cpu.baseSpeed} GHz` : '—'],
        ['Current Speed', data.cpu.currentSpeed ? `${data.cpu.currentSpeed} GHz` : '—'],
        ['Architecture', data.cpu.architecture || '—'],
        ['Load', data.cpu.load != null ? `${data.cpu.load}%` : '—'],
      ],
      progress: data.cpu.load != null ? {
        label: 'Utilisation', value: data.cpu.load,
        color: data.cpu.load > 85 ? 'red' : data.cpu.load > 60 ? 'yellow' : 'blue',
      } : null,
    }));
  }

  // GPU card
  if (data.gpu && data.gpu.length > 0) {
    const g = data.gpu[0];
    grid.appendChild(makeCard({
      title: 'GPU', icon: '🖥', score: null,
      main: g.model || 'Unknown GPU',
      rows: [
        ['VRAM', g.vram ? `${g.vram >= 1024 ? (g.vram/1024).toFixed(0)+'GB' : g.vram+'MB'}` : '—'],
        ['Driver', g.driverVersion || '—'],
        ['Bus', g.bus || '—'],
        ['Utilisation', g.utilization != null ? `${g.utilization}%` : '—'],
        ['Temperature', g.temperature != null ? `${g.temperature}°C` : '—'],
      ],
    }));
  }

  // RAM card
  if (data.ram) {
    grid.appendChild(makeCard({
      title: 'RAM', icon: '▦', score: null,
      main: `${data.ram.totalGB} GB ${data.ram.type || ''}`,
      rows: [
        ['Used / Free', data.ram.usedGB != null ? `${data.ram.usedGB}GB / ${data.ram.freeGB}GB` : '—'],
        ['Speed', data.ram.speed ? `${data.ram.speed} MHz` : '—'],
        ['Sticks', data.ram.totalSticks || '—'],
        ['Dual Channel', data.ram.dualChannel != null ? (data.ram.dualChannel ? '✓ Yes' : '✗ No') : '—'],
      ],
      progress: data.ram.usagePercent != null ? {
        label: 'Usage', value: data.ram.usagePercent,
        color: data.ram.usagePercent > 85 ? 'red' : data.ram.usagePercent > 65 ? 'yellow' : 'blue',
      } : null,
    }));
  }

  // Storage card
  if (data.storage && data.storage.drives && data.storage.drives.length > 0) {
    const d = data.storage.drives[0];
    const isSSD = d.type === 'SSD' || d.type === 'NVMe';
    grid.appendChild(makeCard({
      title: 'Storage', icon: '💾', score: null,
      main: d.name || 'Unknown Drive',
      rows: [
        ['Type', d.type || '—'],
        ['Interface', d.interfaceType || '—'],
        ['Capacity', d.sizeGB ? `${d.sizeGB} GB` : '—'],
        ['SMART', d.smartStatus || '—'],
        ['Temperature', d.temperature ? `${d.temperature}°C` : '—'],
      ],
    }));
  }

  // Battery card
  if (data.battery && data.battery.hasBattery) {
    const b = data.battery;
    grid.appendChild(makeCard({
      title: 'Battery', icon: '⚡', score: null,
      main: `${b.percent || '?'}% ${b.isCharging ? '⚡ Charging' : ''}`,
      rows: [
        ['Health', b.healthPercent != null ? `${b.healthPercent}%` : '—'],
        ['Wear', b.wearPercent != null ? `${b.wearPercent}%` : '—'],
        ['Capacity', b.maxCapacityWh ? `${b.maxCapacityWh} Wh` : '—'],
        ['Design Cap.', b.designCapacityWh ? `${b.designCapacityWh} Wh` : '—'],
        ['Cycles', b.cycleCount || '—'],
      ],
      progress: b.percent != null ? {
        label: 'Charge', value: b.percent,
        color: b.percent < 20 ? 'red' : b.percent < 50 ? 'yellow' : 'green',
      } : null,
    }));
  }

  // Thermals card
  if (data.temperatures && data.temperatures.cpuMain != null) {
    const t = data.temperatures.cpuMain;
    grid.appendChild(makeCard({
      title: 'Thermals', icon: '🌡', score: null,
      main: `CPU ${t}°C`,
      rows: [
        ['CPU Max', data.temperatures.cpuMax ? `${data.temperatures.cpuMax}°C` : '—'],
        ['Chipset', data.temperatures.chipset ? `${data.temperatures.chipset}°C` : '—'],
        ['GPU', data.gpu?.[0]?.temperature ? `${data.gpu[0].temperature}°C` : '—'],
      ],
    }));
  }

  // OS card
  if (data.os) {
    grid.appendChild(makeCard({
      title: 'Operating System', icon: '⊞', score: null,
      main: `${data.os.distro || data.os.platform}`,
      rows: [
        ['Release', data.os.release || '—'],
        ['Build', data.os.build || '—'],
        ['Architecture', data.os.arch || '—'],
        ['Kernel', data.os.kernel || '—'],
        ['UEFI', data.os.uefi != null ? (data.os.uefi ? '✓ Yes' : '✗ No') : '—'],
      ],
    }));
  }
}

// ── CPU Detail View ───────────────────────────────────────────────────────────
function renderCPUView(cpu) {
  const el = document.getElementById('cpu-card');
  if (!cpu) { el.innerHTML = '<div class="no-data">CPU data unavailable</div>'; return; }

  el.innerHTML = `
    <div class="card-header">
      <span class="card-title">⚙ Processor</span>
    </div>
    <div class="card-main">${cpu.model || 'Unknown CPU'}</div>
    ${makeRows([
      ['Manufacturer', cpu.manufacturer || '—'],
      ['Physical Cores', cpu.physicalCores || '—'],
      ['Logical Threads', cpu.threads || '—'],
      ['Socket', cpu.socket || '—'],
      ['Base Clock', cpu.baseSpeed ? `${cpu.baseSpeed} GHz` : '—'],
      ['Max Clock', cpu.maxSpeed ? `${cpu.maxSpeed} GHz` : '—'],
      ['Current Clock', cpu.currentSpeed ? `${cpu.currentSpeed} GHz` : '—'],
      ['Architecture', cpu.architecture || '—'],
      ['L1 Data Cache', cpu.cache?.l1d ? formatBytes(cpu.cache.l1d) : '—'],
      ['L1 Instr Cache', cpu.cache?.l1i ? formatBytes(cpu.cache.l1i) : '—'],
      ['L2 Cache', cpu.cache?.l2 ? formatBytes(cpu.cache.l2) : '—'],
      ['L3 Cache', cpu.cache?.l3 ? formatBytes(cpu.cache.l3) : '—'],
      ['Current Load', cpu.load != null ? `${cpu.load}%` : '—'],
    ])}
    ${cpu.load != null ? `
    <div class="progress-wrap">
      <div class="progress-label"><span>CPU Load</span><span>${cpu.load}%</span></div>
      <div class="progress-bar">
        <div class="progress-fill ${cpu.load>85?'red':cpu.load>60?'yellow':'blue'}" style="width:${cpu.load}%"></div>
      </div>
    </div>` : ''}
  `;
}

// ── GPU Detail View ───────────────────────────────────────────────────────────
function renderGPUView(gpus) {
  const el = document.getElementById('gpu-cards');
  if (!gpus || gpus.length === 0) {
    el.innerHTML = '<div class="no-data">No GPU data available</div>'; return;
  }
  el.innerHTML = '';
  gpus.forEach((g, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    const vramStr = g.vram ? (g.vram >= 1024 ? `${(g.vram/1024).toFixed(0)} GB` : `${g.vram} MB`) : '—';
    card.innerHTML = `
      <div class="card-header">
        <span class="card-title">🖥 GPU ${i+1}</span>
        ${g.source === 'nvidia-smi' ? '<span class="card-score ok">nvidia-smi</span>' : ''}
      </div>
      <div class="card-main">${g.model || 'Unknown GPU'}</div>
      ${makeRows([
        ['Vendor', g.vendor || '—'],
        ['VRAM', vramStr],
        ['Driver Version', g.driverVersion || '—'],
        ['Driver Date', formatDriverDate(g.driverDate)],
        ['Bus', g.bus || '—'],
        ['Temperature', g.temperature != null ? `${g.temperature}°C` : '—'],
        ['Utilisation', g.utilization != null ? `${g.utilization}%` : '—'],
      ])}
      ${g.utilization != null ? `
      <div class="progress-wrap">
        <div class="progress-label"><span>GPU Load</span><span>${g.utilization}%</span></div>
        <div class="progress-bar">
          <div class="progress-fill ${g.utilization>85?'red':g.utilization>60?'yellow':'blue'}"
               style="width:${g.utilization}%"></div>
        </div>
      </div>` : ''}
    `;
    el.appendChild(card);
  });
}

// ── Memory Detail View ────────────────────────────────────────────────────────
function renderMemoryView(ram) {
  const el = document.getElementById('mem-card');
  const dimmTitle = document.getElementById('dimm-title');
  const dimmCards = document.getElementById('dimm-cards');

  if (!ram) {
    el.innerHTML = '<div class="no-data">RAM data unavailable</div>';
    dimmTitle.style.display = 'none'; return;
  }

  el.innerHTML = `
    <div class="card-header"><span class="card-title">▦ Memory Overview</span>
      <span class="card-score ${ram.dualChannel ? 'good' : 'warn'}">
        ${ram.dualChannel ? 'Dual Channel' : 'Single Channel'}
      </span>
    </div>
    <div class="card-main">${ram.totalGB} GB ${ram.type || ''} ${ram.speed ? '@ '+ram.speed+' MHz' : ''}</div>
    ${makeRows([
      ['Total', `${ram.totalGB} GB`],
      ['Used', ram.usedGB != null ? `${ram.usedGB} GB` : '—'],
      ['Free', ram.freeGB != null ? `${ram.freeGB} GB` : '—'],
      ['Usage', ram.usagePercent != null ? `${ram.usagePercent}%` : '—'],
      ['Sticks', ram.totalSticks || '—'],
      ['Type', ram.type || '—'],
      ['Speed', ram.speed ? `${ram.speed} MHz` : '—'],
      ['Dual Channel', ram.dualChannel != null ? (ram.dualChannel ? '✓ Enabled' : '✗ Not detected') : '—'],
    ])}
    ${ram.usagePercent != null ? `
    <div class="progress-wrap">
      <div class="progress-label"><span>Memory Usage</span><span>${ram.usagePercent}%</span></div>
      <div class="progress-bar">
        <div class="progress-fill ${ram.usagePercent>85?'red':ram.usagePercent>65?'yellow':'blue'}"
             style="width:${ram.usagePercent}%"></div>
      </div>
    </div>` : ''}
  `;

  // DIMM sticks
  if (ram.sticks && ram.sticks.length > 0) {
    dimmTitle.style.display = 'block';
    dimmCards.innerHTML = '';
    ram.sticks.forEach((s, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-header"><span class="card-title">DIMM Slot ${i+1}</span></div>
        <div class="card-main">${s.sizeGB} GB ${s.type || ''}</div>
        ${makeRows([
          ['Bank', s.bank || '—'],
          ['Size', s.sizeGB ? `${s.sizeGB} GB` : '—'],
          ['Speed', s.speed ? `${s.speed} MHz` : '—'],
          ['Manufacturer', s.manufacturer || '—'],
          ['Part Number', s.partNumber || '—'],
          ['Form Factor', s.formFactor || '—'],
        ])}
      `;
      dimmCards.appendChild(card);
    });
  } else {
    dimmTitle.style.display = 'none';
  }
}

// ── Storage Detail View ───────────────────────────────────────────────────────
function renderStorageView(storage) {
  const storageCards = document.getElementById('storage-cards');
  const partTitle    = document.getElementById('part-title');
  const partCards    = document.getElementById('part-cards');

  if (!storage) {
    storageCards.innerHTML = '<div class="no-data">Storage data unavailable</div>';
    partTitle.style.display = 'none'; return;
  }

  storageCards.innerHTML = '';
  (storage.drives || []).forEach(d => {
    const isSSD = d.type === 'SSD' || d.type === 'NVMe';
    const smart = (d.smartStatus || 'Unknown').toLowerCase();
    const smartColor = smart === 'ok' ? 'good' : smart.includes('fail') ? 'bad' : 'warn';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <span class="card-title">💾 ${isSSD ? 'SSD' : 'HDD'}</span>
        <span class="card-score ${smartColor}">${d.smartStatus || 'Unknown'}</span>
      </div>
      <div class="card-main">${d.name || 'Unknown Drive'}</div>
      ${makeRows([
        ['Type', d.type || '—'],
        ['Interface', d.interfaceType || '—'],
        ['Capacity', d.sizeGB ? `${d.sizeGB} GB` : '—'],
        ['Vendor', d.vendor || '—'],
        ['Serial', d.serialNum || '—'],
        ['Firmware', d.firmwareRevision || '—'],
        ['Temperature', d.temperature ? `${d.temperature}°C` : '—'],
        ['SMART Status', d.smartStatus || '—'],
      ])}
    `;
    storageCards.appendChild(card);
  });

  if (storage.partitions && storage.partitions.length > 0) {
    partTitle.style.display = 'block';
    partCards.innerHTML = '';
    storage.partitions.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-header"><span class="card-title">Volume ${p.mount || p.fs}</span></div>
        <div class="card-main">${p.fs}</div>
        ${makeRows([
          ['Type', p.type || '—'],
          ['Total', `${p.sizeGB} GB`],
          ['Used', `${p.usedGB} GB`],
          ['Free', `${(p.sizeGB - p.usedGB).toFixed(1)} GB`],
          ['Mount', p.mount || '—'],
        ])}
        <div class="progress-wrap">
          <div class="progress-label"><span>Disk Usage</span><span>${Math.round(p.usePercent)}%</span></div>
          <div class="progress-bar">
            <div class="progress-fill ${p.usePercent>90?'red':p.usePercent>75?'yellow':'blue'}"
                 style="width:${Math.round(p.usePercent)}%"></div>
          </div>
        </div>
      `;
      partCards.appendChild(card);
    });
  } else {
    partTitle.style.display = 'none';
  }
}

// ── Battery Detail View ───────────────────────────────────────────────────────
function renderBatteryView(battery) {
  const el = document.getElementById('battery-card');

  if (!battery || !battery.hasBattery) {
    el.innerHTML = `<div class="no-data">No battery detected (desktop system or unavailable)</div>`;
    return;
  }

  const health = battery.healthPercent || (100 - (battery.wearPercent || 0));
  const healthColor = health > 80 ? 'var(--green)' : health > 60 ? 'var(--yellow)' : 'var(--red)';

  el.innerHTML = `
    <div class="card-header">
      <span class="card-title">⚡ Battery</span>
      <span class="card-score ${health > 80 ? 'good' : health > 60 ? 'warn' : 'bad'}">
        ${health}% Health
      </span>
    </div>
    <div class="card-main" style="color:${healthColor}">
      ${battery.percent || '?'}% Charged ${battery.isCharging ? '⚡' : ''}
    </div>
    ${makeRows([
      ['Manufacturer', battery.manufacturer || '—'],
      ['Model', battery.model || '—'],
      ['Type', battery.type || '—'],
      ['Design Capacity', battery.designCapacityWh ? `${battery.designCapacityWh} Wh` : '—'],
      ['Full Charge Cap.', battery.maxCapacityWh ? `${battery.maxCapacityWh} Wh` : '—'],
      ['Wear Level', battery.wearPercent != null ? `${battery.wearPercent}%` : '—'],
      ['Health', battery.healthPercent != null ? `${battery.healthPercent}%` : '—'],
      ['Voltage', battery.voltage ? `${battery.voltage} V` : '—'],
      ['Cycle Count', battery.cycleCount || '—'],
      ['Time Remaining', battery.timeRemaining ? `${battery.timeRemaining} min` : '—'],
      ['Charging', battery.isCharging ? 'Yes' : 'No'],
    ])}
    <div class="progress-wrap">
      <div class="progress-label"><span>Charge Level</span><span>${battery.percent || 0}%</span></div>
      <div class="progress-bar">
        <div class="progress-fill ${(battery.percent||0)<20?'red':(battery.percent||0)<50?'yellow':'green'}"
             style="width:${battery.percent||0}%"></div>
      </div>
    </div>
    <div class="progress-wrap">
      <div class="progress-label"><span>Battery Health</span><span>${health}%</span></div>
      <div class="progress-bar">
        <div class="progress-fill ${health>80?'green':health>60?'yellow':'red'}"
             style="width:${health}%"></div>
      </div>
    </div>
  `;
}

// ── Thermals Detail View ──────────────────────────────────────────────────────
function renderThermalsView(temps) {
  const el = document.getElementById('thermals-card');
  if (!temps || temps.cpuMain == null) {
    el.innerHTML = '<div class="no-data">Temperature data unavailable — requires systeminformation or elevated permissions</div>';
    return;
  }

  const tempClass = (t) => {
    if (t == null) return '';
    if (t > 90) return 'danger';
    if (t > 75) return 'hot';
    if (t > 60) return 'warm';
    return 'cool';
  };

  let coresHtml = '';
  if (temps.cpuCores && temps.cpuCores.length > 0) {
    coresHtml = `
      <div class="section-title" style="margin-top:16px">CPU Core Temperatures</div>
      <div class="temp-display">
        ${temps.cpuCores.map((t, i) => `
          <div class="temp-gauge">
            <div class="temp-val ${tempClass(t)}">${t != null ? t+'°' : '—'}</div>
            <div class="temp-lbl">Core ${i}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  el.innerHTML = `
    <div class="temp-display">
      <div class="temp-gauge">
        <div class="temp-val ${tempClass(temps.cpuMain)}">${temps.cpuMain}°</div>
        <div class="temp-lbl">CPU Avg</div>
      </div>
      ${temps.cpuMax != null ? `
      <div class="temp-gauge">
        <div class="temp-val ${tempClass(temps.cpuMax)}">${temps.cpuMax}°</div>
        <div class="temp-lbl">CPU Max</div>
      </div>` : ''}
      ${temps.chipset != null ? `
      <div class="temp-gauge">
        <div class="temp-val ${tempClass(temps.chipset)}">${temps.chipset}°</div>
        <div class="temp-lbl">Chipset</div>
      </div>` : ''}
    </div>
    ${coresHtml}
  `;
}

// ── Processes View ────────────────────────────────────────────────────────────
function renderProcessesView(procs) {
  const el = document.getElementById('proc-content');
  if (!procs || !procs.top || procs.top.length === 0) {
    el.innerHTML = '<div class="no-data">Process data unavailable</div>'; return;
  }

  const summary = procs.total
    ? `<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-bottom:12px">
        Total: ${procs.total} | Running: ${procs.running || '—'} | Sleeping: ${procs.sleeping || '—'}
       </div>` : '';

  el.innerHTML = `
    ${summary}
    <table class="proc-table">
      <thead>
        <tr>
          <th>Process</th>
          <th>PID</th>
          <th>CPU %</th>
          <th>RAM (MB)</th>
          <th>State</th>
        </tr>
      </thead>
      <tbody>
        ${procs.top.map(p => {
          const cpuClass = p.cpu > 50 ? 'proc-critical' : p.cpu > 20 ? 'proc-high' : '';
          return `
            <tr>
              <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${escHtml(p.name)}
              </td>
              <td>${p.pid}</td>
              <td class="${cpuClass}">
                ${p.cpu}%
                <div class="proc-cpu-bar">
                  <div class="proc-cpu-fill" style="width:${Math.min(100,p.cpu*2)}%"></div>
                </div>
              </td>
              <td>${p.memMB || '—'}</td>
              <td>${p.state || '—'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ── Drivers View ──────────────────────────────────────────────────────────────
function renderDriversView(drivers) {
  const el = document.getElementById('driver-content');
  if (!drivers || drivers.length === 0) {
    el.innerHTML = '<div class="no-data">No driver data available (Windows only)</div>'; return;
  }

  const categories = {};
  drivers.forEach(d => {
    const cat = d.class || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(d);
  });

  let html = `<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-bottom:12px">
    ${drivers.length} drivers found | ${drivers.filter(d=>!d.signed).length} unsigned
  </div>`;

  for (const [cat, list] of Object.entries(categories)) {
    html += `
      <div style="margin-bottom:16px">
        <div style="font-family:var(--font-head);font-size:11px;letter-spacing:2px;color:var(--text3);
             text-transform:uppercase;margin-bottom:6px;padding-bottom:4px;
             border-bottom:1px solid var(--border)">${escHtml(cat)}</div>
        <table class="driver-table">
          <thead><tr><th>Device</th><th>Version</th><th>Date</th><th>Signed</th></tr></thead>
          <tbody>
            ${list.slice(0,10).map(d => `
              <tr>
                <td title="${escHtml(d.name)}">${escHtml(d.name)}</td>
                <td>${d.version || '—'}</td>
                <td>${formatDriverDate(d.date)}</td>
                <td style="color:${d.signed===false?'var(--red)':'var(--green)'}">
                  ${d.signed === false ? '✗' : '✓'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  el.innerHTML = html;
}

// ── Diagnostics Report ────────────────────────────────────────────────────────
function renderDiagnoseReport(report) {
  // Update overview bar with real scores
  document.getElementById('ov-score').textContent = `${report.overallScore}/100`;
  document.getElementById('ov-score').style.color = scoreColor(report.overallScore);

  const tierEl = document.getElementById('ov-tier');
  tierEl.textContent = report.tier;
  tierEl.className = `tier-badge tier-${report.tier}`;

  // Build panel
  const panel = document.getElementById('diagnose-panel');
  panel.innerHTML = `
    <!-- Health Meter -->
    <div class="health-meter">
      <div class="health-ring">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle class="health-ring-track" cx="40" cy="40" r="34"/>
          <circle class="health-ring-fill"
            cx="40" cy="40" r="34"
            stroke="${scoreColor(report.overallScore)}"
            stroke-dasharray="${2 * Math.PI * 34}"
            stroke-dashoffset="${2 * Math.PI * 34 * (1 - report.overallScore/100)}"
          />
        </svg>
        <div class="health-num" style="color:${scoreColor(report.overallScore)}">
          ${report.overallScore}
          <span class="sublbl">/ 100</span>
        </div>
      </div>
      <div class="health-summary">
        <h3 style="color:${scoreColor(report.overallScore)}">
          ${report.overallScore >= 80 ? '✓ Healthy System' : report.overallScore >= 60 ? '⚠ Needs Attention' : '✗ Issues Detected'}
        </h3>
        <p>${report.summary}</p>
      </div>
      <div class="tier-badge tier-${report.tier}">${report.tier}</div>
    </div>

    <!-- Component Scores -->
    <div class="section-title">Component Scores</div>
    <div class="score-grid">
      ${Object.entries(report.scores).map(([key, val]) => val != null ? `
        <div class="score-cell">
          <div class="score-cell-name">${key}</div>
          <div class="score-cell-val" style="color:${scoreColor(val)}">${val}</div>
          <div class="score-cell-bar">
            <div class="score-cell-fill" style="width:${val}%;background:${scoreColor(val)}"></div>
          </div>
        </div>
      ` : '').join('')}
    </div>

    <!-- Issues -->
    <div class="section-title">
      Detected Issues
      <span style="margin-left:auto;font-size:11px;font-family:var(--font-mono);color:var(--text3)">
        ${report.issues.length} issue(s)
      </span>
    </div>
    ${report.issues.length > 0 ? `
    <div class="issue-list">
      ${report.issues.map(issue => `
        <div class="issue-item ${issue.severity}">
          <div class="issue-severity">${issue.severity}</div>
          <div class="issue-comp">${issue.component}</div>
          <div class="issue-msg">${escHtml(issue.message)}</div>
        </div>
      `).join('')}
    </div>` : `<div class="no-data" style="padding:16px">🎉 No issues detected! System looks great.</div>`}

    <!-- Recommendations -->
    ${report.recommendations.length > 0 ? `
    <div class="section-title" style="margin-top:20px">Recommendations</div>
    <div class="rec-list">
      ${report.recommendations.map(r => `
        <div class="rec-item">
          <div class="rec-header">
            <span class="rec-type ${r.type}">${r.type}</span>
            <span class="rec-title">${escHtml(r.title)}</span>
            <span class="rec-comp">${r.component}</span>
          </div>
          <div class="rec-detail">${escHtml(r.detail)}</div>
        </div>
      `).join('')}
    </div>` : ''}
  `;

  // Show diagnose results
  document.getElementById('diagnose-results').style.display = 'flex';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeCard({ title, icon, score, main, rows, progress }) {
  const card = document.createElement('div');
  card.className = 'card';
  const scoreClass = score >= 80 ? 'good' : score >= 60 ? 'ok' : score >= 40 ? 'warn' : 'bad';
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">${icon} ${title}</span>
      ${score != null ? `<span class="card-score ${scoreClass}">${score}</span>` : ''}
    </div>
    <div class="card-main">${main}</div>
    ${makeRows(rows)}
    ${progress ? `
    <div class="progress-wrap">
      <div class="progress-label"><span>${progress.label}</span><span>${progress.value}%</span></div>
      <div class="progress-bar">
        <div class="progress-fill ${progress.color}" style="width:${Math.min(100,progress.value)}%"></div>
      </div>
    </div>` : ''}
  `;
  return card;
}

function makeRows(rows) {
  return rows.map(([k, v]) => `
    <div class="card-row">
      <span class="card-key">${k}</span>
      <span class="card-val">${v}</span>
    </div>
  `).join('');
}

function scoreColor(score) {
  if (score >= 80) return 'var(--green)';
  if (score >= 60) return 'var(--yellow)';
  if (score >= 40) return 'var(--orange)';
  return 'var(--red)';
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes >= 1048576) return `${(bytes/1048576).toFixed(0)} MB`;
  if (bytes >= 1024)    return `${(bytes/1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDriverDate(raw) {
  if (!raw) return '—';
  const match = String(raw).match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return String(raw).slice(0, 10);
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function escHtml(str) {
  if (!str) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setLoading(active, title = '', steps = '') {
  const el = document.getElementById('loading');
  el.classList.toggle('active', active);
  if (title) document.getElementById('loader-text').textContent = title;
  if (steps) document.getElementById('loader-steps').textContent = steps;
}

function showErrorToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:#1a0a10;border:1px solid var(--red);border-radius:8px;
    padding:12px 16px;font-family:var(--font-mono);font-size:11px;
    color:var(--red);max-width:320px;line-height:1.5;
    animation:slideIn 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
