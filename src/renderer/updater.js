/**
 * updater.js — Auto-Update UI Handler (renderer side)
 *
 * Listens for updater:status events pushed from main.js via preload.js
 * and renders a non-intrusive status bar in the titlebar area.
 *
 * Include this script AFTER uiRenderer.js in index.html
 */

(function initUpdater() {
  // Inject update bar into DOM once page is ready
  document.addEventListener('DOMContentLoaded', () => {
    injectUpdateBar();
    bindUpdaterEvents();
    displayAppVersion();
  });
})();

// ── DOM injection ────────────────────────────────────────────────────────────
function injectUpdateBar() {
  const bar = document.createElement('div');
  bar.id = 'update-bar';
  bar.style.cssText = `
    display: none;
    position: fixed;
    bottom: 0; left: 220px; right: 0;
    height: 32px;
    background: #0d1a2a;
    border-top: 1px solid #1e2d45;
    padding: 0 20px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    color: #7a9ab8;
    align-items: center;
    gap: 12px;
    z-index: 500;
    transition: all 0.3s;
  `;
  bar.innerHTML = `
    <span id="update-icon" style="font-size:13px">⟳</span>
    <span id="update-msg">Checking for updates…</span>
    <div id="update-progress-wrap" style="display:none;flex:1;max-width:200px">
      <div style="height:3px;background:#1e2d45;border-radius:2px;overflow:hidden">
        <div id="update-progress-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#00d4ff,#0066ff);border-radius:2px;transition:width 0.3s"></div>
      </div>
    </div>
    <button id="update-action-btn" style="
      display:none;
      margin-left:auto;
      padding:4px 12px;
      background:rgba(0,212,255,0.12);
      border:1px solid rgba(0,212,255,0.4);
      border-radius:4px;
      color:#00d4ff;
      font-family:inherit;
      font-size:10px;
      cursor:pointer;
      letter-spacing:1px;
      text-transform:uppercase;
    ">RESTART NOW</button>
    <button onclick="document.getElementById('update-bar').style.display='none'" style="
      margin-left:auto;
      background:transparent;border:none;
      color:#4a6a88;cursor:pointer;font-size:14px;line-height:1;
      padding:0 4px;
    " id="update-dismiss">✕</button>
  `;
  document.body.appendChild(bar);
}

// ── Event binding ────────────────────────────────────────────────────────────
function bindUpdaterEvents() {
  if (!window.deviceDoctor?.onUpdaterStatus) return;

  const cleanup = window.deviceDoctor.onUpdaterStatus((payload) => {
    handleUpdaterPayload(payload);
  });

  // Cleanup on unload
  window.addEventListener('unload', cleanup);

  // Bind restart button
  document.getElementById('update-action-btn')?.addEventListener('click', () => {
    window.deviceDoctor.installUpdate();
  });
}

function handleUpdaterPayload(payload) {
  const bar      = document.getElementById('update-bar');
  const icon     = document.getElementById('update-icon');
  const msg      = document.getElementById('update-msg');
  const progWrap = document.getElementById('update-progress-wrap');
  const progFill = document.getElementById('update-progress-fill');
  const actionBtn= document.getElementById('update-action-btn');
  const dismiss  = document.getElementById('update-dismiss');

  if (!bar) return;

  // Reset state
  bar.style.borderTopColor = '#1e2d45';
  progWrap.style.display   = 'none';
  actionBtn.style.display  = 'none';
  dismiss.style.display    = 'block';
  bar.style.display        = 'flex';

  switch (payload.event) {
    case 'checking':
      icon.textContent    = '⟳';
      msg.textContent     = 'Checking for updates…';
      msg.style.color     = '#7a9ab8';
      icon.style.cssText += 'animation:spin 1s linear infinite';
      // Auto-hide after 4s if still just checking
      setTimeout(() => {
        if (document.getElementById('update-msg')?.textContent === 'Checking for updates…') {
          bar.style.display = 'none';
        }
      }, 4000);
      break;

    case 'up-to-date':
      bar.style.display = 'none'; // Silent — don't annoy user when up to date
      break;

    case 'available':
      icon.textContent    = '⬇';
      msg.textContent     = `Update v${payload.version} downloading…`;
      msg.style.color     = '#00d4ff';
      bar.style.borderTopColor = '#00d4ff44';
      break;

    case 'downloading':
      icon.textContent    = '⬇';
      msg.textContent     = `Downloading update… ${payload.percent}%`;
      msg.style.color     = '#00d4ff';
      progWrap.style.display = 'flex';
      progFill.style.width   = `${payload.percent}%`;
      bar.style.borderTopColor = '#00d4ff44';
      break;

    case 'downloaded':
      icon.textContent     = '✓';
      msg.textContent      = `v${payload.version} ready to install`;
      msg.style.color      = '#00ff88';
      bar.style.borderTopColor = '#00ff8844';
      actionBtn.style.display  = 'block';
      dismiss.style.display    = 'none';
      // Pulse the bar
      bar.animate([
        { boxShadow: '0 -2px 12px rgba(0,255,136,0)' },
        { boxShadow: '0 -2px 12px rgba(0,255,136,0.3)' },
        { boxShadow: '0 -2px 12px rgba(0,255,136,0)' },
      ], { duration: 2000, iterations: 3 });
      break;

    case 'error':
      icon.textContent    = '⚠';
      msg.textContent     = `Update error: ${payload.message || 'unknown'}`;
      msg.style.color     = '#ff8c00';
      setTimeout(() => { bar.style.display = 'none'; }, 5000);
      break;

    default:
      bar.style.display = 'none';
  }
}

// ── App version display ───────────────────────────────────────────────────────
async function displayAppVersion() {
  if (!window.deviceDoctor?.getVersion) return;
  try {
    const version = await window.deviceDoctor.getVersion();
    const el = document.getElementById('app-version-display');
    if (el) el.textContent = `v${version}`;
    // Also update titlebar subtitle if it exists
    const sub = document.querySelector('.titlebar-subtitle');
    if (sub) sub.textContent = `v${version}`;
  } catch {
    // Non-critical
  }
}
