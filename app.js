'use strict';

const EARTH_RADIUS_M = 6371000;
const M_PER_NM = 1852;
const M_PER_MILE = 1609.344;

const els = {
  statusText: document.getElementById('statusText'),
  fix1Coord: document.getElementById('fix1Coord'),
  fix1Time: document.getElementById('fix1Time'),
  fix2Coord: document.getElementById('fix2Coord'),
  fix2Time: document.getElementById('fix2Time'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  resetBtn: document.getElementById('resetBtn'),
  results: document.getElementById('results'),
  setTrue: document.getElementById('setTrue'),
  setMag: document.getElementById('setMag'),
  driftKn: document.getElementById('driftKn'),
  driftMph: document.getElementById('driftMph'),
  resultMeta: document.getElementById('resultMeta'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsPanel: document.getElementById('settingsPanel'),
  settingsSave: document.getElementById('settingsSave'),
  settingsClose: document.getElementById('settingsClose'),
  varModeSeg: document.getElementById('varModeSeg'),
  varAutoHint: document.getElementById('varAutoHint'),
  varManualField: document.getElementById('varManualField'),
  varPreview: document.getElementById('varPreview'),
  varDeg: document.getElementById('varDeg'),
  varDir: document.getElementById('varDir'),
  minInterval: document.getElementById('minInterval'),
};

const DEFAULT_SETTINGS = { varMode: 'auto', varDeg: 0, varDir: 'W', minInterval: 5 };
let pendingVarMode = DEFAULT_SETTINGS.varMode;

function loadSettings() {
  try {
    const raw = localStorage.getItem('setdrift.settings');
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem('setdrift.settings', JSON.stringify(s));
  } catch (e) { /* ignore storage errors */ }
}

let settings = loadSettings();
let fix1 = null;
let fix2 = null;

function toRad(d) { return (d * Math.PI) / 180; }
function toDeg(r) { return (r * 180) / Math.PI; }
function norm360(d) { return ((d % 360) + 360) % 360; }

function formatDMM(lat, lon) {
  function part(value, posLetter, negLetter) {
    const letter = value >= 0 ? posLetter : negLetter;
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    return `${deg}°${min.toFixed(3)}'${letter}`;
  }
  return `${part(lat, 'N', 'S')} ${part(lon, 'E', 'W')}`;
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

// Initial great-circle bearing from point 1 to point 2, degrees true, 0-360.
function bearingTrue(lat1, lon1, lat2, lon2) {
  const phi1 = toRad(lat1), phi2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return norm360(toDeg(Math.atan2(y, x)));
}

// Great-circle distance in meters (haversine).
function distanceMeters(lat1, lon1, lat2, lon2) {
  const phi1 = toRad(lat1), phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

function setStatus(text) { els.statusText.textContent = text; }

function renderFix(fix, coordEl, timeEl) {
  if (!fix) {
    coordEl.textContent = '—';
    timeEl.textContent = '—';
    return;
  }
  coordEl.textContent = formatDMM(fix.lat, fix.lon);
  timeEl.textContent = formatTime(fix.time) + (fix.accuracy ? ` (±${Math.round(fix.accuracy)}m)` : '');
}

function getFix() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not available on this device/browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          time: pos.timestamp || Date.now(),
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

// Signed magnetic variation in degrees, East positive / West negative,
// matching WMM declination convention (Magnetic = True - Variation).
function getSignedVariation(fix) {
  if (settings.varMode === 'manual') {
    return { value: settings.varDir === 'E' ? settings.varDeg : -settings.varDeg, source: 'manual' };
  }
  try {
    const altKm = 0; // surface/marine use; altitude has negligible effect on declination near sea level
    const decYear = WMM.toDecimalYear(fix.time);
    const value = WMM.declination(fix.lat, fix.lon, altKm, decYear);
    return { value, source: 'auto' };
  } catch (e) {
    return { value: settings.varDir === 'E' ? settings.varDeg : -settings.varDeg, source: 'manual-fallback' };
  }
}

function formatVariation(variation) {
  const dir = variation.value >= 0 ? 'E' : 'W';
  const label = variation.source === 'manual' ? 'manual' : variation.source === 'auto' ? 'WMM2025' : 'manual fallback';
  return `${Math.abs(variation.value).toFixed(1)}° ${dir} (${label})`;
}

function computeResult() {
  const trueSet = bearingTrue(fix1.lat, fix1.lon, fix2.lat, fix2.lon);
  const variation = getSignedVariation(fix1);
  const signedVar = variation.value;
  const magSet = norm360(trueSet - signedVar);

  const distM = distanceMeters(fix1.lat, fix1.lon, fix2.lat, fix2.lon);
  const elapsedMs = fix2.time - fix1.time;
  const elapsedHours = elapsedMs / 3600000;
  const elapsedSec = elapsedMs / 1000;

  els.setTrue.textContent = `${trueSet.toFixed(1)}°`;
  els.setMag.textContent = `${magSet.toFixed(1)}°`;

  if (elapsedSec < settings.minInterval || elapsedSec <= 0) {
    els.driftKn.textContent = 'n/a';
    els.driftMph.textContent = 'n/a';
    els.resultMeta.textContent =
      `Interval too short (${elapsedSec.toFixed(1)}s < ${settings.minInterval}s) for a reliable drift speed. ` +
      `Distance: ${(distM / M_PER_NM).toFixed(3)} nm. Variation used: ${formatVariation(variation)}.`;
  } else {
    const distNm = distM / M_PER_NM;
    const distMiles = distM / M_PER_MILE;
    const driftKn = distNm / elapsedHours;
    const driftMph = distMiles / elapsedHours;
    els.driftKn.textContent = driftKn.toFixed(2);
    els.driftMph.textContent = driftMph.toFixed(2);
    els.resultMeta.textContent =
      `Distance ${distNm.toFixed(3)} nm (${distMiles.toFixed(3)} mi) over ${elapsedSec.toFixed(1)} s. ` +
      `Variation used: ${formatVariation(variation)}.`;
  }

  els.results.hidden = false;
  els.resetBtn.hidden = false;
}

function resetRun() {
  fix1 = null;
  fix2 = null;
  renderFix(null, els.fix1Coord, els.fix1Time);
  renderFix(null, els.fix2Coord, els.fix2Time);
  els.results.hidden = true;
  els.resetBtn.hidden = true;
  els.startBtn.disabled = false;
  els.stopBtn.disabled = true;
  setStatus('Ready. Press START to mark Fix 1.');
}

els.startBtn.addEventListener('click', async () => {
  els.startBtn.disabled = true;
  setStatus('Acquiring GPS fix…');
  try {
    fix1 = await getFix();
    fix2 = null;
    renderFix(fix1, els.fix1Coord, els.fix1Time);
    renderFix(null, els.fix2Coord, els.fix2Time);
    els.results.hidden = true;
    els.resetBtn.hidden = true;
    els.stopBtn.disabled = false;
    setStatus('Fix 1 marked. Press STOP when ready to mark Fix 2.');
  } catch (err) {
    setStatus(`Could not get location: ${err.message || err}`);
    els.startBtn.disabled = false;
  }
});

els.stopBtn.addEventListener('click', async () => {
  els.stopBtn.disabled = true;
  setStatus('Acquiring GPS fix…');
  try {
    fix2 = await getFix();
    renderFix(fix2, els.fix2Coord, els.fix2Time);
    computeResult();
    setStatus('Run complete.');
    els.startBtn.disabled = true;
  } catch (err) {
    setStatus(`Could not get location: ${err.message || err}`);
    els.stopBtn.disabled = false;
  }
});

els.resetBtn.addEventListener('click', resetRun);

function applyVarModeUI(mode) {
  pendingVarMode = mode;
  for (const btn of els.varModeSeg.querySelectorAll('.seg-btn')) {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  }
  els.varAutoHint.hidden = mode !== 'auto';
  els.varManualField.hidden = mode !== 'manual';
  if (mode === 'auto') {
    if (fix1) {
      const v = getSignedVariation(fix1);
      els.varPreview.textContent = `Current: ${formatVariation(v)}`;
      els.varPreview.hidden = false;
    } else {
      els.varPreview.hidden = true;
    }
  } else {
    els.varPreview.hidden = true;
  }
}

function openSettings() {
  els.varDeg.value = settings.varDeg;
  els.varDir.value = settings.varDir;
  els.minInterval.value = settings.minInterval;
  applyVarModeUI(settings.varMode);
  els.settingsPanel.hidden = false;
}

function closeSettings() { els.settingsPanel.hidden = true; }

els.settingsBtn.addEventListener('click', openSettings);
els.settingsClose.addEventListener('click', closeSettings);
els.settingsPanel.addEventListener('click', (e) => {
  if (e.target === els.settingsPanel) closeSettings();
});
els.varModeSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (btn) applyVarModeUI(btn.dataset.mode);
});

els.settingsSave.addEventListener('click', () => {
  const varDeg = Math.abs(parseFloat(els.varDeg.value));
  const minInterval = Math.abs(parseFloat(els.minInterval.value));
  settings = {
    varMode: pendingVarMode === 'manual' ? 'manual' : 'auto',
    varDeg: Number.isFinite(varDeg) ? varDeg : 0,
    varDir: els.varDir.value === 'E' ? 'E' : 'W',
    minInterval: Number.isFinite(minInterval) && minInterval > 0 ? minInterval : DEFAULT_SETTINGS.minInterval,
  };
  saveSettings(settings);
  if (fix1 && fix2) computeResult();
  closeSettings();
});

resetRun();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline registration best-effort */ });
  });
}
