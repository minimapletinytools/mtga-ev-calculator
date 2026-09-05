/**
 * MTG Arena Event EV Calculator - Main Application Logic
 */

import { DEFAULT_VALUATIONS, PRESET_EVENTS } from './presets.js';
import {
  calculateRewardUSD,
  calculateEntryFeeUSD,
  computeEventEV,
  findBreakEvenWinRates,
  calculateWinDistribution
} from './calculator.js';

// MTG Color Theme Definitions
export const MTG_THEMES = {
  white: {
    name: 'Plains',
    primary: '#ca8a04',
    light: '#a16207',
    dark: '#854d0e',
    chartText: '#713f12',
    chartGrid: 'rgba(0, 0, 0, 0.08)',
    chartBg: 'rgba(202, 138, 4, 0.18)'
  },
  blue: {
    name: 'Island',
    primary: '#06b6d4',
    light: '#38bdf8',
    dark: '#0284c7',
    chartText: '#94a3b8',
    chartGrid: 'rgba(255, 255, 255, 0.05)',
    chartBg: 'rgba(6, 182, 212, 0.15)'
  },
  black: {
    name: 'Swamp',
    primary: '#a855f7',
    light: '#c084fc',
    dark: '#7e22ce',
    chartText: '#94a3b8',
    chartGrid: 'rgba(255, 255, 255, 0.05)',
    chartBg: 'rgba(168, 85, 247, 0.15)'
  },
  red: {
    name: 'Mountain',
    primary: '#f87171',
    light: '#fca5a5',
    dark: '#dc2626',
    chartText: '#94a3b8',
    chartGrid: 'rgba(255, 255, 255, 0.05)',
    chartBg: 'rgba(248, 113, 113, 0.18)'
  },
  green: {
    name: 'Forest',
    primary: '#10b981',
    light: '#34d399',
    dark: '#059669',
    chartText: '#94a3b8',
    chartGrid: 'rgba(255, 255, 255, 0.05)',
    chartBg: 'rgba(16, 185, 129, 0.15)'
  },
  artifact: {
    name: 'Artifact',
    primary: '#cbd5e1',
    light: '#ffffff',
    dark: '#94a3b8',
    chartText: '#e2e8f0',
    chartGrid: 'rgba(255, 255, 255, 0.08)',
    chartBg: 'rgba(203, 213, 225, 0.20)'
  }
};

// Application State
const STATE = {
  customPresets: [],
  allEvents: [],
  currentEvent: null,
  valuations: { ...DEFAULT_VALUATIONS },
  userWinRate: 56.5,
  winRateRange: '50-70',
  isGameWinRateForBo3: true,
  cachedCurrentEvent: null,
  theme: 'random',
  activeThemeKey: 'blue',
  charts: {
    evChart: null,
    distChart: null
  }
};

const STORAGE_KEYS = {
  CUSTOM_PRESETS: 'mtga_ev_custom_presets',
  VALUATIONS: 'mtga_ev_valuations',
  LAST_EVENT_ID: 'mtga_ev_last_event_id',
  CURRENT_EVENT: 'mtga_ev_current_event',
  USER_WIN_RATE: 'mtga_ev_user_win_rate',
  WIN_RATE_RANGE: 'mtga_ev_win_rate_range',
  THEME: 'mtga_ev_theme'
};

let autoSaveTimer = null;
export function triggerAutoSave() {
  try {
    saveValuationsToStorage();
    if (STATE.currentEvent) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_EVENT, JSON.stringify(STATE.currentEvent));
      localStorage.setItem(STORAGE_KEYS.LAST_EVENT_ID, STATE.currentEvent.id);
    }
    localStorage.setItem(STORAGE_KEYS.USER_WIN_RATE, STATE.userWinRate);
    localStorage.setItem(STORAGE_KEYS.WIN_RATE_RANGE, STATE.winRateRange);
    localStorage.setItem(STORAGE_KEYS.THEME, STATE.theme);
  } catch (e) {
    console.error('Auto-save error', e);
  }

  const badge = document.getElementById('cache-status-badge');
  const text = document.getElementById('cache-status-text');
  if (badge && text) {
    text.textContent = 'Changes saved to browser cache';
    badge.className = 'hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 text-[11px] font-medium shadow-sm transition-all duration-300 ring-2 ring-emerald-500/20';

    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      badge.className = 'hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 text-[11px] font-medium transition-all duration-500 shadow-sm';
    }, 2200);
  }
}

export function setTheme(themeKey, notify = false) {
  STATE.theme = themeKey;
  localStorage.setItem(STORAGE_KEYS.THEME, themeKey);

  const themeKeys = ['white', 'blue', 'black', 'red', 'green', 'artifact'];
  let chosen = themeKey;
  if (themeKey === 'random') {
    chosen = themeKeys[Math.floor(Math.random() * themeKeys.length)];
  }

  STATE.activeThemeKey = chosen;
  document.documentElement.setAttribute('data-theme', chosen);
  document.body.setAttribute('data-theme', chosen);

  const select = document.getElementById('theme-select');
  if (select) {
    select.value = themeKey;
  }

  // Update chart colors to match active theme
  updateChartThemeColors(chosen);

  // Dynamically synchronize favicon with theme
  updateFavicon(chosen);

  if (notify) {
    const themeName = themeKey === 'random' ? `🎲 Random (${MTG_THEMES[chosen].name})` : MTG_THEMES[chosen].name;
    showToast(`Theme: ${themeName}`, 'info');
  }
}

function updateFavicon(themeKey) {
  const themeInfo = MTG_THEMES[themeKey] || MTG_THEMES.blue;
  const primary = themeInfo.primary || '#06b6d4';
  const light = themeInfo.light || '#38bdf8';
  const dark = themeInfo.dark || '#0891b2';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <defs>
    <radialGradient id="lotusGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${light}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${primary}" stop-opacity="0.25"/>
    </radialGradient>
    <linearGradient id="lotusCenter" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
  <path d="M24 6 C20 14 16 22 24 34 C32 22 28 14 24 6 Z" fill="url(#lotusGlow)" stroke="${light}" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M14 16 C10 22 12 30 22 36 C18 28 16 22 14 16 Z" fill="${primary}" fill-opacity="0.75" stroke="${light}" stroke-width="1.2"/>
  <path d="M34 16 C38 22 36 30 26 36 C30 28 32 22 34 16 Z" fill="${primary}" fill-opacity="0.75" stroke="${light}" stroke-width="1.2"/>
  <path d="M7 25 C6 31 10 37 20 38 C14 34 10 30 7 25 Z" fill="${dark}" fill-opacity="0.85" stroke="${light}" stroke-width="1"/>
  <path d="M41 25 C42 31 38 37 28 38 C34 34 38 30 41 25 Z" fill="${dark}" fill-opacity="0.85" stroke="${light}" stroke-width="1"/>
  <ellipse cx="24" cy="30" rx="6" ry="7" fill="url(#lotusCenter)" stroke="#fef08a" stroke-width="1"/>
  <circle cx="21.5" cy="29" r="1.2" fill="#1e1b4b"/>
  <circle cx="21.2" cy="28.6" r="0.4" fill="#ffffff"/>
  <circle cx="26.5" cy="29" r="1.2" fill="#1e1b4b"/>
  <circle cx="26.2" cy="28.6" r="0.4" fill="#ffffff"/>
  <path d="M23 32 Q24 33.5 25 32" stroke="#1e1b4b" stroke-width="0.9" stroke-linecap="round" fill="none"/>
  <circle cx="10" cy="11" r="1.2" fill="#fef08a" opacity="0.9"/>
  <circle cx="38" cy="11" r="1.2" fill="#fef08a" opacity="0.9"/>
  <circle cx="24" cy="42" r="1.2" fill="${light}"/>
</svg>`;

  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function updateChartThemeColors(themeKey) {
  const themeInfo = MTG_THEMES[themeKey] || MTG_THEMES.blue;
  const textColor = themeInfo.chartText || '#94a3b8';
  const gridColor = themeInfo.chartGrid || 'rgba(255, 255, 255, 0.05)';
  const chartBg = themeInfo.chartBg || `${themeInfo.primary}22`;

  if (STATE.charts.evChart) {
    STATE.charts.evChart.data.datasets[0].borderColor = themeInfo.primary;
    STATE.charts.evChart.data.datasets[0].pointBackgroundColor = themeInfo.primary;
    STATE.charts.evChart.data.datasets[0].backgroundColor = chartBg;

    if (STATE.charts.evChart.options.scales) {
      if (STATE.charts.evChart.options.scales.x) {
        STATE.charts.evChart.options.scales.x.ticks.color = textColor;
        STATE.charts.evChart.options.scales.x.grid.color = gridColor;
      }
      if (STATE.charts.evChart.options.scales.y) {
        STATE.charts.evChart.options.scales.y.ticks.color = textColor;
        STATE.charts.evChart.options.scales.y.grid.color = gridColor;
      }
    }
    if (STATE.charts.evChart.options.plugins?.legend) {
      STATE.charts.evChart.options.plugins.legend.labels.color = textColor;
    }
    STATE.charts.evChart.update('none');
  }

  if (STATE.charts.distChart) {
    STATE.charts.distChart.data.datasets[0].borderColor = themeInfo.primary;
    STATE.charts.distChart.data.datasets[0].backgroundColor = `${themeInfo.primary}b5`;

    if (STATE.charts.distChart.options.scales) {
      if (STATE.charts.distChart.options.scales.x) {
        STATE.charts.distChart.options.scales.x.ticks.color = textColor;
      }
      if (STATE.charts.distChart.options.scales.y) {
        STATE.charts.distChart.options.scales.y.ticks.color = textColor;
        STATE.charts.distChart.options.scales.y.grid.color = gridColor;
      }
    }
    STATE.charts.distChart.update('none');
  }
}

// --- Initialization ---
function init() {
  loadFromStorage();
  buildEventsList();

  // Apply theme (random by default)
  setTheme(STATE.theme || 'random');

  const lastEventId = localStorage.getItem(STORAGE_KEYS.LAST_EVENT_ID) || 'arena_direct_play';
  if (STATE.cachedCurrentEvent && (STATE.cachedCurrentEvent.id === lastEventId || STATE.cachedCurrentEvent.isCustom)) {
    STATE.currentEvent = STATE.cachedCurrentEvent;
  } else {
    const initialEvent = STATE.allEvents.find(e => e.id === lastEventId) || STATE.allEvents[0];
    STATE.currentEvent = JSON.parse(JSON.stringify(initialEvent));
  }

  setupEventListeners();
  renderPresetDropdown();
  syncCurrentEventToForm();
  renderValuations();
  renderRewardsTable();
  updateAllCalculations();
  initCharts();

  refreshIcons();
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// --- LocalStorage & State Management ---
function loadFromStorage() {
  try {
    const savedCustom = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
    if (savedCustom) {
      STATE.customPresets = JSON.parse(savedCustom);
    }
  } catch (e) {
    console.error('Error loading custom presets from storage', e);
  }

  try {
    const savedCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT_EVENT);
    if (savedCurrent) {
      STATE.cachedCurrentEvent = JSON.parse(savedCurrent);
    }
  } catch (e) {
    console.error('Error loading current event from storage', e);
  }

  try {
    const savedValuations = localStorage.getItem(STORAGE_KEYS.VALUATIONS);
    if (savedValuations) {
      STATE.valuations = { ...DEFAULT_VALUATIONS, ...JSON.parse(savedValuations) };
    }
  } catch (e) {
    console.error('Error loading valuations from storage', e);
  }

  try {
    const savedWR = localStorage.getItem(STORAGE_KEYS.USER_WIN_RATE);
    if (savedWR !== null) {
      const parsed = parseFloat(savedWR);
      if (!isNaN(parsed)) STATE.userWinRate = parsed;
    }
    const savedRange = localStorage.getItem(STORAGE_KEYS.WIN_RATE_RANGE);
    if (savedRange) {
      STATE.winRateRange = savedRange;
      const selectRange = document.getElementById('select-wr-range');
      if (selectRange) selectRange.value = savedRange;
    }
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) {
      STATE.theme = savedTheme;
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('theme')) {
      STATE.theme = urlParams.get('theme');
    }
  } catch (e) {
    console.error('Error loading settings from storage', e);
  }
}

function saveCustomPresetsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(STATE.customPresets));
  } catch (e) {
    console.error('Error saving custom presets', e);
  }
}

function saveValuationsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.VALUATIONS, JSON.stringify(STATE.valuations));
  } catch (e) {
    console.error('Error saving valuations', e);
  }
}

function buildEventsList() {
  STATE.allEvents = [...PRESET_EVENTS, ...STATE.customPresets];
}

// --- UI Rendering & Syncing ---

function renderPresetDropdown() {
  const select = document.getElementById('event-select');
  if (!select) return;

  select.innerHTML = '';

  // Group events by category
  const categories = {};
  STATE.allEvents.forEach(ev => {
    const cat = ev.category || (ev.isCustom ? 'My Custom Presets' : 'Standard Events');
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(ev);
  });

  for (const [catName, events] of Object.entries(categories)) {
    const optGroup = document.createElement('optgroup');
    optGroup.label = catName;
    events.forEach(ev => {
      const opt = document.createElement('option');
      opt.value = ev.id;
      opt.textContent = ev.name;
      optGroup.appendChild(opt);
    });
    select.appendChild(optGroup);
  }

  // Add "+ New Custom Event" option
  const customGroup = document.createElement('optgroup');
  customGroup.label = "Actions";
  const newOpt = document.createElement('option');
  newOpt.value = "__new_custom__";
  newOpt.textContent = "+ Create New Custom Event";
  customGroup.appendChild(newOpt);
  select.appendChild(customGroup);

  if (STATE.currentEvent) {
    select.value = STATE.currentEvent.id;
  }
}

function syncCurrentEventToForm() {
  if (!STATE.currentEvent) return;

  const ev = STATE.currentEvent;
  const select = document.getElementById('event-select');
  const nameInput = document.getElementById('event-name');
  const entryGemsInput = document.getElementById('event-entry-gems');
  const maxLossesInput = document.getElementById('event-max-losses');
  const maxWinsInput = document.getElementById('event-max-wins');
  const formatTypeSelect = document.getElementById('event-format-type');
  const isBo3Input = document.getElementById('event-is-bo3');
  const catBadge = document.getElementById('event-category-badge');
  const deleteBtn = document.getElementById('btn-delete-preset');

  if (select && select.value !== ev.id) {
    select.value = ev.id;
  }
  if (nameInput) nameInput.value = ev.name || '';
  if (entryGemsInput) entryGemsInput.value = ev.entryGems || 0;
  if (maxLossesInput) maxLossesInput.value = ev.maxLosses || 3;
  if (maxWinsInput) maxWinsInput.value = ev.maxWins || 7;
  if (formatTypeSelect) formatTypeSelect.value = ev.formatType || 'elimination';
  if (isBo3Input) isBo3Input.checked = !!ev.isBo3;

  if (catBadge) {
    catBadge.textContent = ev.category || (ev.isCustom ? 'Custom Preset' : 'Standard Event');
  }

  if (deleteBtn) {
    deleteBtn.style.display = ev.isCustom ? 'inline-flex' : 'none';
  }

  // Update Bo3 Indicator Badge
  const bo3Badge = document.getElementById('bo3-indicator-badge');
  if (bo3Badge) {
    bo3Badge.classList.toggle('hidden', !ev.isBo3);
  }
}

function syncFormToCurrentEvent() {
  if (!STATE.currentEvent) return;

  const nameInput = document.getElementById('event-name');
  const entryGemsInput = document.getElementById('event-entry-gems');
  const maxLossesInput = document.getElementById('event-max-losses');
  const maxWinsInput = document.getElementById('event-max-wins');
  const formatTypeSelect = document.getElementById('event-format-type');
  const isBo3Input = document.getElementById('event-is-bo3');

  STATE.currentEvent.name = nameInput ? nameInput.value.trim() : STATE.currentEvent.name;
  STATE.currentEvent.entryGems = entryGemsInput ? Math.max(0, parseInt(entryGemsInput.value) || 0) : 0;
  STATE.currentEvent.maxLosses = maxLossesInput ? Math.max(1, parseInt(maxLossesInput.value) || 3) : 3;
  
  const newMaxWins = maxWinsInput ? Math.max(1, parseInt(maxWinsInput.value) || 7) : 7;
  STATE.currentEvent.maxWins = newMaxWins;

  STATE.currentEvent.formatType = formatTypeSelect ? formatTypeSelect.value : 'elimination';
  STATE.currentEvent.isBo3 = isBo3Input ? isBo3Input.checked : false;

  // Adjust rewards array length if maxWins changed
  adjustRewardsArrayToMaxWins();

  // Update Bo3 Indicator Badge
  const bo3Badge = document.getElementById('bo3-indicator-badge');
  if (bo3Badge) {
    bo3Badge.classList.toggle('hidden', !STATE.currentEvent.isBo3);
  }

  triggerAutoSave();
}

function adjustRewardsArrayToMaxWins() {
  if (!STATE.currentEvent) return;
  const maxW = STATE.currentEvent.maxWins;
  if (!Array.isArray(STATE.currentEvent.rewards)) {
    STATE.currentEvent.rewards = [];
  }

  // Ensure elements up to maxW exist
  for (let w = 0; w <= maxW; w++) {
    if (!STATE.currentEvent.rewards[w]) {
      const prev = STATE.currentEvent.rewards[w - 1] || { gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 };
      STATE.currentEvent.rewards[w] = { ...prev, wins: w };
    } else {
      STATE.currentEvent.rewards[w].wins = w;
    }
  }

  // Trim excess
  STATE.currentEvent.rewards = STATE.currentEvent.rewards.slice(0, maxW + 1);
}

function renderValuations() {
  const gemPriceInput = document.getElementById('val-gem-price');
  const gemAmountInput = document.getElementById('val-gem-amount');
  const packPriceInput = document.getElementById('val-pack-price');
  const playBoxPriceInput = document.getElementById('val-playbox-price');
  const colBoxPriceInput = document.getElementById('val-collectorbox-price');
  const otherPriceInput = document.getElementById('val-other-price');
  const gemUnitLabel = document.getElementById('gem-unit-cost-label');
  const entryEquivLabel = document.getElementById('entry-usd-equiv');
  const summaryEntryUSD = document.getElementById('summary-entry-usd');

  if (gemPriceInput && document.activeElement !== gemPriceInput) gemPriceInput.value = STATE.valuations.gemsBundlePrice;
  if (gemAmountInput && document.activeElement !== gemAmountInput) gemAmountInput.value = STATE.valuations.gemsBundleAmount;
  if (packPriceInput && document.activeElement !== packPriceInput) packPriceInput.value = STATE.valuations.packValue;
  if (playBoxPriceInput && document.activeElement !== playBoxPriceInput) playBoxPriceInput.value = STATE.valuations.playBoxValue;
  if (colBoxPriceInput && document.activeElement !== colBoxPriceInput) colBoxPriceInput.value = STATE.valuations.collectorBoxValue;
  if (otherPriceInput && document.activeElement !== otherPriceInput) otherPriceInput.value = STATE.valuations.otherValue;

  const gemUnitRate = STATE.valuations.gemsBundlePrice / (STATE.valuations.gemsBundleAmount || 20000);
  if (gemUnitLabel) {
    gemUnitLabel.textContent = `$${gemUnitRate.toFixed(5)} / gem`;
  }

  if (STATE.currentEvent) {
    const entryUSD = calculateEntryFeeUSD(STATE.currentEvent, STATE.valuations);
    if (entryEquivLabel) entryEquivLabel.textContent = `≈ $${entryUSD.toFixed(2)}`;
    if (summaryEntryUSD) summaryEntryUSD.textContent = `$${entryUSD.toFixed(2)} USD`;
  }
}

function syncValuationsFromForm() {
  const gemPriceInput = document.getElementById('val-gem-price');
  const gemAmountInput = document.getElementById('val-gem-amount');
  const packPriceInput = document.getElementById('val-pack-price');
  const playBoxPriceInput = document.getElementById('val-playbox-price');
  const colBoxPriceInput = document.getElementById('val-collectorbox-price');
  const otherPriceInput = document.getElementById('val-other-price');

  STATE.valuations.gemsBundlePrice = Math.max(0.01, parseFloat(gemPriceInput?.value) || 100);
  STATE.valuations.gemsBundleAmount = Math.max(1, parseInt(gemAmountInput?.value) || 20000);
  STATE.valuations.packValue = Math.max(0, parseFloat(packPriceInput?.value) || 0);
  STATE.valuations.playBoxValue = Math.max(0, parseFloat(playBoxPriceInput?.value) || 0);
  STATE.valuations.collectorBoxValue = Math.max(0, parseFloat(colBoxPriceInput?.value) || 0);
  STATE.valuations.otherValue = Math.max(0, parseFloat(otherPriceInput?.value) || 0);

  saveValuationsToStorage();
  renderValuations();
  triggerAutoSave();
}

// --- Rewards Table (Editable Generic Table) ---

function renderRewardsTable() {
  const tbody = document.getElementById('rewards-table-body');
  if (!tbody || !STATE.currentEvent) return;

  tbody.innerHTML = '';
  adjustRewardsArrayToMaxWins();

  // Compute distribution at current user win rate for probability column
  const winRate = STATE.userWinRate / 100;
  let effectiveWinRate = winRate;
  if (STATE.currentEvent.isBo3 && STATE.isGameWinRateForBo3) {
    effectiveWinRate = 3 * winRate * winRate - 2 * winRate * winRate * winRate;
  }

  const distribution = calculateWinDistribution(
    STATE.currentEvent.maxWins,
    STATE.currentEvent.maxLosses,
    STATE.currentEvent.formatType,
    effectiveWinRate
  );

  const probMap = new Map();
  distribution.forEach(d => probMap.set(d.wins, d.probability));

  STATE.currentEvent.rewards.forEach((reward) => {
    const tr = document.createElement('tr');
    tr.id = `reward-row-${reward.wins}`;
    tr.className = 'hover:bg-slate-800/40 transition border-b border-slate-800/60';

    const isTrophy = (reward.wins === STATE.currentEvent.maxWins);
    const prob = probMap.get(reward.wins) || 0;
    const probPct = (prob * 100).toFixed(1);
    const tierUSD = calculateRewardUSD(reward, STATE.valuations);

    tr.innerHTML = `
      <td class="py-2 px-2.5 font-semibold text-slate-200">
        <div class="flex items-center gap-1.5">
          <span>${reward.wins} ${reward.wins === 1 ? 'Win' : 'Wins'}</span>
          ${isTrophy ? '<span class="text-amber-400 text-xs" title="Trophy">🏆</span>' : ''}
        </div>
      </td>
      <td class="py-2 px-1.5">
        <input type="number" step="50" min="0" data-win="${reward.wins}" data-field="gems" class="reward-input w-20 sm:w-24 bg-slate-950/90 text-cyan-300 font-mono px-2 py-1.5 rounded-lg border border-slate-700/80 focus:border-cyan-500 outline-none text-xs" value="${reward.gems || 0}">
      </td>
      <td class="py-2 px-1.5">
        <input type="number" step="0.1" min="0" data-win="${reward.wins}" data-field="packs" class="reward-input w-16 sm:w-20 bg-slate-950/90 text-amber-300 font-mono px-2 py-1.5 rounded-lg border border-slate-700/80 focus:border-amber-500 outline-none text-xs" value="${reward.packs || 0}">
      </td>
      <td class="py-2 px-1.5">
        <input type="number" step="1" min="0" data-win="${reward.wins}" data-field="playBoxes" class="reward-input w-16 sm:w-20 bg-slate-950/90 text-blue-300 font-mono px-2 py-1.5 rounded-lg border border-slate-700/80 focus:border-blue-500 outline-none text-xs" value="${reward.playBoxes || 0}">
      </td>
      <td class="py-2 px-1.5">
        <input type="number" step="1" min="0" data-win="${reward.wins}" data-field="collectorBoxes" class="reward-input w-16 sm:w-20 bg-slate-950/90 text-purple-300 font-mono px-2 py-1.5 rounded-lg border border-slate-700/80 focus:border-purple-500 outline-none text-xs" value="${reward.collectorBoxes || 0}">
      </td>
      <td class="py-2 px-1.5">
        <input type="number" step="1" min="0" data-win="${reward.wins}" data-field="other" class="reward-input w-16 sm:w-20 bg-slate-950/90 text-emerald-300 font-mono px-2 py-1.5 rounded-lg border border-slate-700/80 focus:border-emerald-500 outline-none text-xs" value="${reward.other || 0}">
      </td>
      <td class="tier-usd-val py-2 px-2.5 text-right font-bold font-mono text-slate-100 text-xs">
        $${tierUSD.toFixed(2)}
      </td>
      <td class="tier-prob-cell py-2 px-2.5 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <div class="prob-progress-bar-track w-12 sm:w-16 rounded-full h-1.5 overflow-hidden">
            <div class="prob-progress-bar h-1.5 rounded-full" style="width: ${Math.min(100, probPct)}%"></div>
          </div>
          <span class="text-xs text-slate-300 w-11 text-right">${probPct}%</span>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Attach event listeners to all reward inputs
  tbody.querySelectorAll('.reward-input').forEach(input => {
    input.addEventListener('input', handleRewardInputChange);
  });
}

function updateRewardRowVisuals(win) {
  const row = document.getElementById(`reward-row-${win}`);
  if (!row || !STATE.currentEvent || !STATE.currentEvent.rewards[win]) return;

  const reward = STATE.currentEvent.rewards[win];
  const tierUSD = calculateRewardUSD(reward, STATE.valuations);
  const usdCell = row.querySelector('.tier-usd-val');
  if (usdCell) usdCell.textContent = `$${tierUSD.toFixed(2)}`;
}

function handleRewardInputChange(e) {
  const input = e.target;
  const win = parseInt(input.getAttribute('data-win'));
  const field = input.getAttribute('data-field');
  const val = parseFloat(input.value) || 0;

  if (STATE.currentEvent && STATE.currentEvent.rewards[win]) {
    STATE.currentEvent.rewards[win][field] = val;
    updateRewardRowVisuals(win);
    updateAllCalculationsWithoutRecreatingRewards();
    triggerAutoSave();
  }
}

// --- Summary KPI Cards & Expected Value Table (50% - 70% + Custom WR) ---

function updateAllCalculations() {
  if (!STATE.currentEvent) return;

  renderValuations();
  renderSummaryKPIs();
  renderExpectedPayoutsTable();
  renderCharts();
}

function updateAllCalculationsWithoutRecreatingRewards() {
  if (!STATE.currentEvent) return;

  renderValuations();
  renderSummaryKPIs();
  renderExpectedPayoutsTable();
  renderCharts();

  // Update probability columns in rewards table
  const winRate = STATE.userWinRate / 100;
  let effectiveWinRate = winRate;
  if (STATE.currentEvent.isBo3 && STATE.isGameWinRateForBo3) {
    effectiveWinRate = 3 * winRate * winRate - 2 * winRate * winRate * winRate;
  }

  const distribution = calculateWinDistribution(
    STATE.currentEvent.maxWins,
    STATE.currentEvent.maxLosses,
    STATE.currentEvent.formatType,
    effectiveWinRate
  );

  const probMap = new Map();
  distribution.forEach(d => probMap.set(d.wins, d.probability));

  (STATE.currentEvent.rewards || []).forEach(reward => {
    const row = document.getElementById(`reward-row-${reward.wins}`);
    if (row) {
      const prob = probMap.get(reward.wins) || 0;
      const probPct = (prob * 100).toFixed(1);
      const probCell = row.querySelector('.tier-prob-cell');
      if (probCell) {
        probCell.innerHTML = `
          <div class="flex items-center justify-end gap-1.5">
            <div class="prob-progress-bar-track w-12 sm:w-16 rounded-full h-1.5 overflow-hidden">
              <div class="prob-progress-bar h-1.5 rounded-full" style="width: ${Math.min(100, probPct)}%"></div>
            </div>
            <span class="text-xs text-slate-300 w-11 text-right">${probPct}%</span>
          </div>
        `;
      }
    }
  });
}

function renderSummaryKPIs() {
  const ev = computeEventEV(
    STATE.currentEvent,
    STATE.valuations,
    STATE.userWinRate,
    STATE.isGameWinRateForBo3
  );

  const be = findBreakEvenWinRates(
    STATE.currentEvent,
    STATE.valuations,
    STATE.isGameWinRateForBo3
  );

  // User WR display in input
  const wrInput = document.getElementById('input-user-winrate');
  if (wrInput && document.activeElement !== wrInput) {
    wrInput.value = STATE.userWinRate;
  }

  // Net EV USD
  const kpiNetUSD = document.getElementById('kpi-net-usd');
  const kpiGrossUSD = document.getElementById('kpi-gross-usd');
  if (kpiNetUSD) {
    const isPos = ev.expNetUSD >= 0;
    kpiNetUSD.textContent = `${isPos ? '+' : ''}$${ev.expNetUSD.toFixed(2)}`;
    kpiNetUSD.className = `text-xl font-bold font-mono ${isPos ? 'val-positive' : 'val-negative'}`;
  }
  if (kpiGrossUSD) {
    kpiGrossUSD.textContent = `Gross: $${ev.expGrossUSD.toFixed(2)}`;
  }

  // Net Gems
  const kpiNetGems = document.getElementById('kpi-net-gems');
  const kpiGrossGems = document.getElementById('kpi-gross-gems');
  if (kpiNetGems) {
    const isPos = ev.expNetGems >= 0;
    kpiNetGems.textContent = `${isPos ? '+' : ''}${Math.round(ev.expNetGems).toLocaleString()}`;
    kpiNetGems.className = `text-xl font-bold font-mono ${isPos ? 'val-positive' : 'text-cyan-400'}`;
  }
  if (kpiGrossGems) {
    kpiGrossGems.textContent = `Gross: ${Math.round(ev.expGems).toLocaleString()} gems`;
  }

  // ROI %
  const kpiROI = document.getElementById('kpi-roi');
  const kpiGemReturn = document.getElementById('kpi-gem-return');
  if (kpiROI) {
    const isPos = ev.roiPct >= 0;
    kpiROI.textContent = `${isPos ? '+' : ''}${ev.roiPct.toFixed(1)}%`;
    kpiROI.className = `text-xl font-bold font-mono ${isPos ? 'val-positive' : 'val-negative'}`;
  }
  if (kpiGemReturn) {
    kpiGemReturn.textContent = `Gem Return: ${ev.gemReturnPct.toFixed(1)}%`;
  }

  // Expected Boxes
  const kpiBoxes = document.getElementById('kpi-boxes');
  const kpiBoxesDetail = document.getElementById('kpi-boxes-detail');
  if (kpiBoxes) {
    const totalBoxes = ev.expPlayBoxes + ev.expCollectorBoxes;
    kpiBoxes.textContent = totalBoxes > 0 ? totalBoxes.toFixed(3) : '0.00';
  }
  if (kpiBoxesDetail) {
    kpiBoxesDetail.textContent = `Play: ${ev.expPlayBoxes.toFixed(2)} | Col: ${ev.expCollectorBoxes.toFixed(2)}`;
  }

  // Break-Even USD Win Rate
  const kpiBEUSD = document.getElementById('kpi-breakeven-usd');
  if (kpiBEUSD) {
    kpiBEUSD.textContent = be.breakEvenUSD !== null ? `${be.breakEvenUSD.toFixed(1)}%` : 'N/A';
  }

  // Infinite Gems Win Rate
  const kpiBEGems = document.getElementById('kpi-infinite-gems');
  if (kpiBEGems) {
    kpiBEGems.textContent = be.breakEvenGems !== null ? `${be.breakEvenGems.toFixed(1)}%` : 'N/A';
  }
}

function getWinRateList() {
  let minWR = 50, maxWR = 70;
  if (STATE.winRateRange === '40-80') {
    minWR = 40; maxWR = 80;
  } else if (STATE.winRateRange === '30-90') {
    minWR = 30; maxWR = 90;
  } else if (STATE.winRateRange === '0-100') {
    minWR = 0; maxWR = 100;
  }

  const ratesSet = new Set();
  for (let r = minWR; r <= maxWR; r++) {
    ratesSet.add(r);
  }

  // Always include user win rate
  ratesSet.add(STATE.userWinRate);

  const sortedRates = Array.from(ratesSet).sort((a, b) => a - b);
  return sortedRates;
}

function renderExpectedPayoutsTable() {
  const tbody = document.getElementById('ev-table-body');
  const thead = document.getElementById('ev-table-head');
  if (!tbody || !STATE.currentEvent) return;

  const rewards = STATE.currentEvent.rewards || [];
  const hasPlayBoxes = rewards.some(r => (r.playBoxes || 0) > 0);
  const hasCollectorBoxes = rewards.some(r => (r.collectorBoxes || 0) > 0);
  const hasOther = rewards.some(r => (r.other || 0) > 0);

  // Render Table Header with Highlighted Net Value column and dynamic reward columns
  if (thead) {
    thead.innerHTML = `
      <tr class="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
        <th class="py-3 px-3.5">Win Rate (%)</th>
        <th class="col-net-value-header py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-1">
            <span class="text-cyan-300">★ Net Value ($)</span>
          </div>
        </th>
        <th class="py-3 px-3 text-right">Gross Value ($)</th>
        <th class="py-3 px-3 text-right">Net Gems</th>
        <th class="py-3 px-3 text-right">Gross Gems</th>
        <th class="py-3 px-3 text-right">Packs</th>
        ${hasPlayBoxes ? '<th class="py-3 px-3 text-right text-blue-400">Play Boxes</th>' : ''}
        ${hasCollectorBoxes ? '<th class="py-3 px-3 text-right text-purple-400">Collector Boxes</th>' : ''}
        ${hasOther ? '<th class="py-3 px-3 text-right text-emerald-400">Other ($)</th>' : ''}
        <th class="py-3 px-3 text-right">ROI (%)</th>
        <th class="py-3 px-3 text-center">Breakdown</th>
      </tr>
    `;
  }

  tbody.innerHTML = '';
  const winRates = getWinRateList();

  winRates.forEach(wr => {
    const isUserWR = Math.abs(wr - STATE.userWinRate) < 0.001;
    const ev = computeEventEV(
      STATE.currentEvent,
      STATE.valuations,
      wr,
      STATE.isGameWinRateForBo3
    );

    const tr = document.createElement('tr');
    tr.className = `transition ${isUserWR ? 'user-wr-row' : 'hover:bg-slate-800/40'} border-b border-slate-800/60`;

    const netUSDPos = ev.expNetUSD >= 0;
    const netGemsPos = ev.expNetGems >= 0;
    const roiPos = ev.roiPct >= 0;

    const wrLabel = STATE.currentEvent.isBo3
      ? `<div class="flex flex-col">
          <span class="font-bold text-slate-100">${wr.toFixed(wr % 1 === 0 ? 0 : 1)}%</span>
          <span class="text-[10px] text-slate-400">Match: ${ev.effectiveWinRatePct.toFixed(1)}%</span>
         </div>`
      : `<span class="font-bold text-slate-100">${wr.toFixed(wr % 1 === 0 ? 0 : 1)}%</span>`;

    tr.innerHTML = `
      <td class="py-2.5 px-3.5">
        <div class="flex items-center gap-2">
          ${wrLabel}
          ${isUserWR ? '<span class="user-wr-badge text-[10px] py-0.5 px-2">🎯 YOUR WR</span>' : ''}
        </div>
      </td>
      <td class="col-net-value-cell py-2.5 px-3 text-right ${netUSDPos ? 'val-positive' : 'val-negative'}">
        ${netUSDPos ? '+' : ''}$${ev.expNetUSD.toFixed(2)}
      </td>
      <td class="py-2.5 px-3 text-right text-slate-200">
        $${ev.expGrossUSD.toFixed(2)}
      </td>
      <td class="py-2.5 px-3 text-right font-semibold ${netGemsPos ? 'text-emerald-400' : 'text-slate-300'}">
        ${netGemsPos ? '+' : ''}${Math.round(ev.expNetGems).toLocaleString()}
      </td>
      <td class="py-2.5 px-3 text-right currency-gems">
        ${Math.round(ev.expGems).toLocaleString()}
      </td>
      <td class="py-2.5 px-3 text-right currency-packs">
        ${ev.expPacks.toFixed(2)}
      </td>
      ${hasPlayBoxes ? `<td class="py-2.5 px-3 text-right ${ev.expPlayBoxes > 0 ? 'currency-play font-bold' : 'text-slate-400'}">${ev.expPlayBoxes.toFixed(3)}</td>` : ''}
      ${hasCollectorBoxes ? `<td class="py-2.5 px-3 text-right ${ev.expCollectorBoxes > 0 ? 'currency-col font-bold' : 'text-slate-400'}">${ev.expCollectorBoxes.toFixed(3)}</td>` : ''}
      ${hasOther ? `<td class="py-2.5 px-3 text-right text-slate-300">$${ev.expOther.toFixed(2)}</td>` : ''}
      <td class="py-2.5 px-3 text-right font-semibold ${roiPos ? 'val-positive' : 'val-negative'}">
        ${roiPos ? '+' : ''}${ev.roiPct.toFixed(1)}%
      </td>
      <td class="py-2.5 px-3 text-center">
        <button class="btn-view-dist text-xs px-2.5 py-1 rounded-lg transition font-sans" data-wr="${wr}">
          Breakdown
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Attach breakdown button handlers
  tbody.querySelectorAll('.btn-view-dist').forEach(btn => {
    btn.addEventListener('click', () => {
      const wr = parseFloat(btn.getAttribute('data-wr'));
      showDistributionModal(wr);
    });
  });
}

// --- Chart.js Visual Analytics ---

function initCharts() {
  const evCanvas = document.getElementById('ev-chart');
  const distCanvas = document.getElementById('dist-chart');

  if (evCanvas) {
    const ctx = evCanvas.getContext('2d');
    STATE.charts.evChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Net Expected Value ($)',
            data: [],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#06b6d4',
            borderWidth: 2.5
          },
          {
            label: 'Break-Even ($0)',
            data: [],
            borderColor: 'rgba(239, 68, 68, 0.6)',
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            borderWidth: 1.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#94a3b8', font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 10 },
              callback: function (val) {
                return '$' + val;
              }
            }
          }
        }
      }
    });
  }

  if (distCanvas) {
    const ctx = distCanvas.getContext('2d');
    STATE.charts.distChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Probability (%)',
            data: [],
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: '#6366f1',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Chance: ${context.parsed.y.toFixed(1)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 10 },
              callback: function (val) {
                return val + '%';
              }
            }
          }
        }
      }
    });
  }

  updateChartThemeColors(STATE.activeThemeKey);
  renderCharts();
}

function renderCharts() {
  if (!STATE.currentEvent) return;

  // 1. Update EV Chart
  if (STATE.charts.evChart) {
    const labels = [];
    const netData = [];
    const zeroLine = [];

    for (let wr = 30; wr <= 85; wr += 2.5) {
      labels.push(`${wr.toFixed(1)}%`);
      const ev = computeEventEV(
        STATE.currentEvent,
        STATE.valuations,
        wr,
        STATE.isGameWinRateForBo3
      );
      netData.push(ev.expNetUSD);
      zeroLine.push(0);
    }

    STATE.charts.evChart.data.labels = labels;
    STATE.charts.evChart.data.datasets[0].data = netData;
    STATE.charts.evChart.data.datasets[1].data = zeroLine;
    STATE.charts.evChart.update();
  }

  // 2. Update Distribution Chart for user win rate
  if (STATE.charts.distChart) {
    const chartWrLabel = document.getElementById('chart-wr-label');
    if (chartWrLabel) {
      chartWrLabel.textContent = `${STATE.userWinRate.toFixed(1)}%`;
    }

    const winRate = STATE.userWinRate / 100;
    let effectiveWinRate = winRate;
    if (STATE.currentEvent.isBo3 && STATE.isGameWinRateForBo3) {
      effectiveWinRate = 3 * winRate * winRate - 2 * winRate * winRate * winRate;
    }

    const distribution = calculateWinDistribution(
      STATE.currentEvent.maxWins,
      STATE.currentEvent.maxLosses,
      STATE.currentEvent.formatType,
      effectiveWinRate
    );

    const labels = distribution.map(d => `${d.wins} ${d.wins === 1 ? 'Win' : 'Wins'}`);
    const data = distribution.map(d => (d.probability * 100).toFixed(1));

    STATE.charts.distChart.data.labels = labels;
    STATE.charts.distChart.data.datasets[0].data = data;
    STATE.charts.distChart.update();
  }
}

// --- Distribution Modal ---

function showDistributionModal(winRatePct) {
  const modal = document.getElementById('modal-distribution');
  const title = document.getElementById('modal-dist-title');
  const summary = document.getElementById('modal-dist-summary');
  const tbody = document.getElementById('modal-dist-tbody');

  if (!modal || !tbody || !STATE.currentEvent) return;

  const winRate = winRatePct / 100;
  let effectiveWinRate = winRate;
  if (STATE.currentEvent.isBo3 && STATE.isGameWinRateForBo3) {
    effectiveWinRate = 3 * winRate * winRate - 2 * winRate * winRate * winRate;
  }

  const distribution = calculateWinDistribution(
    STATE.currentEvent.maxWins,
    STATE.currentEvent.maxLosses,
    STATE.currentEvent.formatType,
    effectiveWinRate
  );

  const ev = computeEventEV(
    STATE.currentEvent,
    STATE.valuations,
    winRatePct,
    STATE.isGameWinRateForBo3
  );

  title.textContent = `Win Probability Breakdown (${winRatePct.toFixed(1)}% WR)`;
  summary.innerHTML = `
    <div class="glass-card p-3 rounded-xl border border-slate-700/80 mb-3 space-y-1">
      <div class="flex justify-between font-semibold text-slate-200">
        <span>Event: ${STATE.currentEvent.name}</span>
        <span class="${ev.expNetUSD >= 0 ? 'val-positive' : 'val-negative'}">Net EV: ${ev.expNetUSD >= 0 ? '+' : ''}$${ev.expNetUSD.toFixed(2)}</span>
      </div>
      <div class="text-slate-400 text-[11px] flex justify-between">
        <span>Format: ${STATE.currentEvent.formatType === 'fixed_matches' ? 'Fixed Matches' : `${STATE.currentEvent.maxWins} Wins or ${STATE.currentEvent.maxLosses} Losses`}</span>
        <span>Expected Total Games: ${ev.expTotalGames.toFixed(1)}</span>
      </div>
    </div>
  `;

  tbody.innerHTML = '';

  // Calculate cumulative probabilities (P >= w)
  let cumulative = 0;
  const cumulativeMap = new Map();
  for (let i = distribution.length - 1; i >= 0; i--) {
    cumulative += distribution[i].probability;
    cumulativeMap.set(distribution[i].wins, cumulative);
  }

  const rewardsMap = new Map();
  (STATE.currentEvent.rewards || []).forEach(r => rewardsMap.set(r.wins, r));

  distribution.forEach(d => {
    const r = rewardsMap.get(d.wins) || { gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 };
    const tierUSD = calculateRewardUSD(r, STATE.valuations);
    const atLeastChance = (cumulativeMap.get(d.wins) * 100).toFixed(1);
    const exactChance = (d.probability * 100).toFixed(1);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 border-b border-slate-800/60';
    tr.innerHTML = `
      <td class="py-2 px-3 font-semibold text-slate-200">
        ${d.wins} ${d.wins === 1 ? 'Win' : 'Wins'}
      </td>
      <td class="py-2 px-3 text-right text-cyan-300 font-bold">
        ${exactChance}%
      </td>
      <td class="py-2 px-3 text-right text-indigo-300">
        ${atLeastChance}%
      </td>
      <td class="py-2 px-3 text-right text-slate-100 font-bold">
        $${tierUSD.toFixed(2)}
      </td>
    `;
    tbody.appendChild(tr);
  });

  modal.classList.remove('hidden');
}

function hideDistributionModal() {
  const modal = document.getElementById('modal-distribution');
  if (modal) modal.classList.add('hidden');
}

function openInfoModal() {
  const modal = document.getElementById('modal-info');
  if (modal) {
    modal.classList.remove('hidden');
    refreshIcons();
  }
}

function hideInfoModal() {
  const modal = document.getElementById('modal-info');
  if (modal) modal.classList.add('hidden');
}

// --- Presets Management ---

function selectPreset(presetId) {
  if (presetId === '__new_custom__') {
    createNewCustomEvent();
    return;
  }

  const found = STATE.allEvents.find(e => e.id === presetId);
  if (!found) return;

  STATE.currentEvent = JSON.parse(JSON.stringify(found));
  localStorage.setItem(STORAGE_KEYS.LAST_EVENT_ID, found.id);

  syncCurrentEventToForm();
  renderRewardsTable();
  updateAllCalculations();
}

function createNewCustomEvent() {
  const newId = 'custom_' + Date.now();
  const newEvent = {
    id: newId,
    name: 'Custom MTGA Event',
    category: 'My Custom Presets',
    isCustom: true,
    entryGems: 8000,
    entryUSD: 0,
    maxWins: 7,
    maxLosses: 2,
    formatType: 'elimination',
    isBo3: false,
    rewards: [
      { wins: 0, gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 1, gems: 100, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 2, gems: 250, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 3, gems: 1000, packs: 2, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 4, gems: 1400, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 5, gems: 1600, packs: 4, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 6, gems: 1800, packs: 5, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 7, gems: 2200, packs: 6, playBoxes: 0, collectorBoxes: 0, other: 0 }
    ]
  };

  STATE.customPresets.push(newEvent);
  saveCustomPresetsToStorage();
  buildEventsList();
  renderPresetDropdown();
  selectPreset(newId);
  showToast('Created new custom event!', 'success');
}

function saveCurrentPresetChanges() {
  if (!STATE.currentEvent) return;

  syncFormToCurrentEvent();

  // If it's a built-in preset, open save as new modal
  if (!STATE.currentEvent.isCustom) {
    openSaveAsModal(STATE.currentEvent.name + ' (Custom)');
    return;
  }

  // Update in customPresets list
  const idx = STATE.customPresets.findIndex(e => e.id === STATE.currentEvent.id);
  if (idx >= 0) {
    STATE.customPresets[idx] = JSON.parse(JSON.stringify(STATE.currentEvent));
  } else {
    STATE.customPresets.push(JSON.parse(JSON.stringify(STATE.currentEvent)));
  }

  saveCustomPresetsToStorage();
  buildEventsList();
  renderPresetDropdown();
  showToast('Preset saved successfully!', 'success');
}

function openSaveAsModal(defaultName = '') {
  const modal = document.getElementById('modal-save-as');
  const input = document.getElementById('input-new-preset-name');
  if (input) input.value = defaultName || (STATE.currentEvent ? STATE.currentEvent.name + ' Copy' : 'My Event');
  if (modal) modal.classList.remove('hidden');
}

function hideSaveAsModal() {
  const modal = document.getElementById('modal-save-as');
  if (modal) modal.classList.add('hidden');
}

function confirmSaveAsNew() {
  const input = document.getElementById('input-new-preset-name');
  const name = input ? input.value.trim() : 'Custom Event';
  if (!name) return;

  syncFormToCurrentEvent();
  const newId = 'custom_' + Date.now();
  const newEvent = {
    ...JSON.parse(JSON.stringify(STATE.currentEvent)),
    id: newId,
    name: name,
    category: 'My Custom Presets',
    isCustom: true
  };

  STATE.customPresets.push(newEvent);
  saveCustomPresetsToStorage();
  buildEventsList();
  renderPresetDropdown();
  selectPreset(newId);
  hideSaveAsModal();
  showToast(`Saved new preset "${name}"!`, 'success');
}

function deleteCurrentPreset() {
  if (!STATE.currentEvent || !STATE.currentEvent.isCustom) return;

  if (!confirm(`Are you sure you want to delete preset "${STATE.currentEvent.name}"?`)) {
    return;
  }

  STATE.customPresets = STATE.customPresets.filter(e => e.id !== STATE.currentEvent.id);
  saveCustomPresetsToStorage();
  buildEventsList();
  renderPresetDropdown();
  selectPreset(STATE.allEvents[0].id);
  showToast('Preset deleted.', 'info');
}

function resetAllToDefaults() {
  localStorage.clear();
  STATE.customPresets = [];
  STATE.valuations = { ...DEFAULT_VALUATIONS };
  STATE.userWinRate = 56.5;
  STATE.winRateRange = '50-70';
  STATE.theme = 'random';
  setTheme('random');

  buildEventsList();
  renderPresetDropdown();
  selectPreset(PRESET_EVENTS[0].id);
  renderValuations();
  showToast('All settings reset to MTG Arena defaults.', 'success');
}

// --- Import / Export JSON ---

function exportJSON() {
  const exportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    valuations: STATE.valuations,
    userWinRate: STATE.userWinRate,
    customPresets: STATE.customPresets,
    currentEvent: STATE.currentEvent,
    theme: STATE.theme
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mtga-ev-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Configuration exported as JSON!', 'success');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.valuations) {
        STATE.valuations = { ...DEFAULT_VALUATIONS, ...data.valuations };
        saveValuationsToStorage();
      }
      if (Array.isArray(data.customPresets)) {
        STATE.customPresets = data.customPresets;
        saveCustomPresetsToStorage();
      }
      if (typeof data.userWinRate === 'number') {
        STATE.userWinRate = data.userWinRate;
      }
      if (data.theme) {
        setTheme(data.theme);
      }

      buildEventsList();
      renderPresetDropdown();
      if (data.currentEvent) {
        STATE.currentEvent = data.currentEvent;
        syncCurrentEventToForm();
      } else {
        selectPreset(STATE.allEvents[0].id);
      }
      renderValuations();
      renderRewardsTable();
      updateAllCalculations();
      showToast('Configuration imported successfully!', 'success');
    } catch (err) {
      console.error('Import error', err);
      showToast('Error parsing JSON file.', 'error');
    }
  };
  reader.readAsText(file);
}

// --- Toast Alerts ---

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100'
                : type === 'error' ? 'bg-rose-900/90 border-rose-500 text-rose-100'
                : 'bg-slate-900/90 border-cyan-500 text-cyan-100';

  toast.className = `px-4 py-2.5 rounded-xl border shadow-xl text-xs font-medium backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2 ${bgClass}`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Event Listeners Setup ---

function setupEventListeners() {
  // Theme Selector & Shuffle
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => setTheme(e.target.value, true));
  }

  const btnThemeShuffle = document.getElementById('btn-theme-shuffle');
  if (btnThemeShuffle) {
    btnThemeShuffle.addEventListener('click', () => setTheme('random', true));
  }

  const cuteLogo = document.getElementById('cute-logo-avatar');
  if (cuteLogo) {
    cuteLogo.addEventListener('click', () => setTheme('random', true));
  }

  // Preset selector
  const eventSelect = document.getElementById('event-select');
  if (eventSelect) {
    eventSelect.addEventListener('change', (e) => selectPreset(e.target.value));
  }

  // Event parameters change
  ['event-name', 'event-entry-gems', 'event-max-losses', 'event-max-wins', 'event-format-type', 'event-is-bo3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        syncFormToCurrentEvent();
        renderRewardsTable();
        updateAllCalculations();
      });
      el.addEventListener('change', () => {
        syncFormToCurrentEvent();
        renderRewardsTable();
        updateAllCalculations();
      });
    }
  });

  // Quick Entry Fee Buttons
  document.querySelectorAll('.btn-quick-entry').forEach(btn => {
    btn.addEventListener('click', () => {
      const gems = parseInt(btn.getAttribute('data-gems')) || 0;
      const entryInput = document.getElementById('event-entry-gems');
      if (entryInput) entryInput.value = gems;
      if (STATE.currentEvent) {
        STATE.currentEvent.entryGems = gems;
      }
      syncFormToCurrentEvent();
      renderRewardsTable();
      updateAllCalculations();
    });
  });

  // Add / Remove Win Row buttons
  const btnAddWin = document.getElementById('btn-add-win-row');
  if (btnAddWin) {
    btnAddWin.addEventListener('click', () => {
      if (!STATE.currentEvent) return;
      STATE.currentEvent.maxWins = (STATE.currentEvent.maxWins || 0) + 1;
      const maxWinsInput = document.getElementById('event-max-wins');
      if (maxWinsInput) maxWinsInput.value = STATE.currentEvent.maxWins;
      adjustRewardsArrayToMaxWins();
      renderRewardsTable();
      updateAllCalculations();
    });
  }

  const btnRemoveWin = document.getElementById('btn-remove-win-row');
  if (btnRemoveWin) {
    btnRemoveWin.addEventListener('click', () => {
      if (!STATE.currentEvent || STATE.currentEvent.maxWins <= 1) return;
      STATE.currentEvent.maxWins -= 1;
      const maxWinsInput = document.getElementById('event-max-wins');
      if (maxWinsInput) maxWinsInput.value = STATE.currentEvent.maxWins;
      adjustRewardsArrayToMaxWins();
      renderRewardsTable();
      updateAllCalculations();
    });
  }

  // Preset action buttons
  const btnSavePreset = document.getElementById('btn-save-preset');
  if (btnSavePreset) btnSavePreset.addEventListener('click', saveCurrentPresetChanges);

  const btnSaveAsNew = document.getElementById('btn-save-as-new');
  if (btnSaveAsNew) btnSaveAsNew.addEventListener('click', () => openSaveAsModal());

  const btnDeletePreset = document.getElementById('btn-delete-preset');
  if (btnDeletePreset) btnDeletePreset.addEventListener('click', deleteCurrentPreset);

  // Save-as modal handlers
  const btnSaveModalClose = document.getElementById('modal-save-close');
  if (btnSaveModalClose) btnSaveModalClose.addEventListener('click', hideSaveAsModal);

  const btnSaveModalCancel = document.getElementById('modal-save-cancel');
  if (btnSaveModalCancel) btnSaveModalCancel.addEventListener('click', hideSaveAsModal);

  const btnSaveModalConfirm = document.getElementById('modal-save-confirm');
  if (btnSaveModalConfirm) btnSaveModalConfirm.addEventListener('click', confirmSaveAsNew);

  // Distribution modal handlers
  const btnDistClose = document.getElementById('modal-dist-close');
  if (btnDistClose) btnDistClose.addEventListener('click', hideDistributionModal);

  const btnDistBtnClose = document.getElementById('modal-dist-btn-close');
  if (btnDistBtnClose) btnDistBtnClose.addEventListener('click', hideDistributionModal);

  // Valuations inputs change
  ['val-gem-price', 'val-gem-amount', 'val-pack-price', 'val-playbox-price', 'val-collectorbox-price', 'val-other-price'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        syncValuationsFromForm();
        renderRewardsTable();
        updateAllCalculations();
      });
    }
  });

  const btnResetValuations = document.getElementById('btn-reset-valuations');
  if (btnResetValuations) {
    btnResetValuations.addEventListener('click', () => {
      const modal = document.getElementById('modal-reset-confirm');
      if (modal) modal.classList.remove('hidden');
    });
  }

  // Reset confirmation modal handlers
  const btnResetAll = document.getElementById('btn-reset-all');
  if (btnResetAll) {
    btnResetAll.addEventListener('click', () => {
      const modal = document.getElementById('modal-reset-confirm');
      if (modal) modal.classList.remove('hidden');
    });
  }

  const modalResetClose = document.getElementById('modal-reset-close');
  if (modalResetClose) {
    modalResetClose.addEventListener('click', () => {
      document.getElementById('modal-reset-confirm')?.classList.add('hidden');
    });
  }

  const modalResetCancel = document.getElementById('modal-reset-cancel');
  if (modalResetCancel) {
    modalResetCancel.addEventListener('click', () => {
      document.getElementById('modal-reset-confirm')?.classList.add('hidden');
    });
  }

  const modalResetConfirmBtn = document.getElementById('modal-reset-confirm-btn');
  if (modalResetConfirmBtn) {
    modalResetConfirmBtn.addEventListener('click', () => {
      document.getElementById('modal-reset-confirm')?.classList.add('hidden');
      resetAllToDefaults();
    });
  }

  // User win rate input & stepper
  const wrInput = document.getElementById('input-user-winrate');
  if (wrInput) {
    wrInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        STATE.userWinRate = val;
        localStorage.setItem(STORAGE_KEYS.USER_WIN_RATE, val);
        updateAllCalculationsWithoutRecreatingRewards();
        triggerAutoSave();
      }
    });
  }

  const btnWrMinus = document.getElementById('btn-wr-minus');
  if (btnWrMinus) {
    btnWrMinus.addEventListener('click', () => {
      STATE.userWinRate = Math.max(0, parseFloat((STATE.userWinRate - 0.5).toFixed(1)));
      const input = document.getElementById('input-user-winrate');
      if (input) input.value = STATE.userWinRate;
      updateAllCalculationsWithoutRecreatingRewards();
      triggerAutoSave();
    });
  }

  const btnWrPlus = document.getElementById('btn-wr-plus');
  if (btnWrPlus) {
    btnWrPlus.addEventListener('click', () => {
      STATE.userWinRate = Math.min(100, parseFloat((STATE.userWinRate + 0.5).toFixed(1)));
      const input = document.getElementById('input-user-winrate');
      if (input) input.value = STATE.userWinRate;
      updateAllCalculationsWithoutRecreatingRewards();
      triggerAutoSave();
    });
  }

  // Quick WR preset buttons
  document.querySelectorAll('.btn-quick-wr').forEach(btn => {
    btn.addEventListener('click', () => {
      const wr = parseFloat(btn.getAttribute('data-wr'));
      STATE.userWinRate = wr;
      const input = document.getElementById('input-user-winrate');
      if (input) input.value = STATE.userWinRate;
      updateAllCalculationsWithoutRecreatingRewards();
      triggerAutoSave();
    });
  });

  // Range selector
  const selectRange = document.getElementById('select-wr-range');
  if (selectRange) {
    selectRange.addEventListener('change', (e) => {
      STATE.winRateRange = e.target.value;
      renderExpectedPayoutsTable();
      triggerAutoSave();
    });
  }

  // Export / Import buttons
  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) btnExport.addEventListener('click', exportJSON);

  const btnImport = document.getElementById('btn-import-json');
  const fileInput = document.getElementById('import-file-input');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importJSON(e.target.files[0]);
      }
    });
  }

  // Info modal handlers
  const btnInfo = document.getElementById('btn-info');
  if (btnInfo) btnInfo.addEventListener('click', openInfoModal);

  const modalInfoClose = document.getElementById('modal-info-close');
  if (modalInfoClose) modalInfoClose.addEventListener('click', hideInfoModal);

  const modalInfoBtnClose = document.getElementById('modal-info-btn-close');
  if (modalInfoBtnClose) modalInfoBtnClose.addEventListener('click', hideInfoModal);

  // Close modals on clicking background backdrop or pressing Escape
  window.addEventListener('click', (e) => {
    ['modal-distribution', 'modal-save-as', 'modal-reset-confirm', 'modal-info'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal && e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['modal-distribution', 'modal-save-as', 'modal-reset-confirm', 'modal-info'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
      });
    }
  });
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
