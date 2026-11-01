console.log("CHRONOLOCK ACTIVE");

if (window.__chronolockInjected) {
  // Prevent duplicate injection on same page
  if (typeof runFilter === "function") runFilter();
} else {
  window.__chronolockInjected = true;
  initChronoLock();
}

function initChronoLock() {
  // ---------------------------
  // STATE
  // ---------------------------

  let state = {
    enabled: true,
    yearFilterEnabled: true,
    channelFilterEnabled: true,
    keywordFilterEnabled: true,
    cutoffYear: 2018,
    mode: "hidden", // hidden | dim | fade
    blockedChannels: [],
    blockedKeywords: []
  };

  let panelOpen = false;
  let activeTab = "year"; // "year" | "channels" | "keywords"

  function normalizeState() {
    if (typeof state.cutoffYear !== "number" || isNaN(state.cutoffYear)) {
      state.cutoffYear = 2018;
    }
    if (typeof state.enabled !== "boolean") {
      state.enabled = true;
    }
    if (typeof state.yearFilterEnabled !== "boolean") {
      state.yearFilterEnabled = true;
    }
    if (typeof state.channelFilterEnabled !== "boolean") {
      state.channelFilterEnabled = true;
    }
    if (typeof state.keywordFilterEnabled !== "boolean") {
      state.keywordFilterEnabled = true;
    }
    if (!["hidden", "dim", "fade"].includes(state.mode)) {
      state.mode = state.mode === "vanish" ? "hidden" : "hidden";
    }
    if (!Array.isArray(state.blockedChannels)) {
      state.blockedChannels = [];
    }
    if (!Array.isArray(state.blockedKeywords)) {
      state.blockedKeywords = [];
    }
  }

  // ---------------------------
  // STORAGE
  // ---------------------------

  function saveState() {
    if (typeof chrome !== "undefined" && chrome.storage) {
      try {
        chrome.storage.sync.set({ chronolock: state }, () => {
          if (chrome.runtime?.lastError) {
            chrome.storage.local?.set({ chronolock: state });
          }
        });
      } catch (e) {
        chrome.storage.local?.set({ chronolock: state });
      }
    }
  }

  function loadState() {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage) {
        normalizeState();
        return resolve();
      }

      chrome.storage.sync.get("chronolock", (res) => {
        if (!chrome.runtime?.lastError && res && res.chronolock) {
          state = { ...state, ...res.chronolock };
          normalizeState();
          return resolve();
        }

        // Fallback to local storage if sync failed or empty
        chrome.storage.local?.get("chronolock", (localRes) => {
          if (localRes && localRes.chronolock) {
            state = { ...state, ...localRes.chronolock };
          }
          normalizeState();
          resolve();
        });
      });
    });
  }

  // ---------------------------
  // CSS
  // ---------------------------

  const style = document.createElement("style");
  style.id = "chronolock-styles";
  style.textContent = `
  .chronolock-hidden {
    display: none !important;
  }

  .chronolock-dim {
    opacity: 0.15 !important;
    filter: grayscale(1) !important;
    transition: opacity 0.2s ease;
  }

  .chronolock-fade {
    opacity: 0 !important;
    pointer-events: none !important;
    transition: opacity 0.2s ease;
  }

  #chronolock-ui {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 99999999;

    width: 300px;
    border-radius: 16px;

    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #f1f1f1;

    background: rgba(18, 18, 22, 0.85);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);

    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
    overflow: hidden;
    user-select: none;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  #chronolock-ui:hover {
    border-color: rgba(255, 255, 255, 0.22);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  /* Header Bar */
  #chronolock-header {
    cursor: pointer;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    transition: background 0.15s ease;
  }

  #chronolock-header:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .chronolock-header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.08em;
    color: #ffffff;
  }

  .chronolock-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .chronolock-chevron {
    font-size: 10px;
    opacity: 0.6;
    transition: transform 0.2s ease;
  }

  .chronolock-chevron.open {
    transform: rotate(180deg);
  }

  /* Modern iOS-style toggle switches */
  .cl-switch {
    position: relative;
    display: inline-block;
    width: 34px;
    height: 18px;
    flex-shrink: 0;
  }

  .cl-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .cl-slider-toggle {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255, 255, 255, 0.16);
    transition: 0.2s ease;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .cl-slider-toggle:before {
    position: absolute;
    content: "";
    height: 12px;
    width: 12px;
    left: 2px;
    bottom: 2px;
    background: white;
    transition: 0.2s ease;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  }

  .cl-switch input:checked + .cl-slider-toggle {
    background: #3b82f6;
    border-color: #60a5fa;
  }

  .cl-switch input:checked + .cl-slider-toggle:before {
    transform: translateX(16px);
  }

  /* Panel body */
  #chronolock-panel {
    padding: 12px 14px 14px 14px;
    max-height: 480px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  /* Feature Toggles Overview Strip */
  .cl-feature-toggles {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 8px 10px;
    margin-bottom: 12px;
  }

  .cl-feature-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11.5px;
    font-weight: 500;
  }

  .cl-feature-info {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cl-feature-badge {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
  }

  /* Navigation Tabs */
  .cl-tabs {
    display: flex;
    gap: 4px;
    background: rgba(0, 0, 0, 0.35);
    padding: 3px;
    border-radius: 8px;
    margin-bottom: 12px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .cl-tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 6px 4px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: center;
  }

  .cl-tab-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
  }

  .cl-tab-btn.active {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  /* Subpanel Sections */
  .cl-subpanel {
    display: none;
  }

  .cl-subpanel.active {
    display: block;
  }

  .cl-control-group {
    margin-bottom: 10px;
  }

  .cl-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Sliders & Inputs */
  .cl-slider-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  #chronolock-slider {
    flex: 1;
    accent-color: #3b82f6;
    cursor: pointer;
  }

  #chronolock-input {
    width: 58px;
    background: rgba(0,0,0,0.45);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    padding: 4px 6px;
    text-align: center;
    font-weight: 600;
    font-size: 12px;
  }

  .chronolock-presets {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-top: 6px;
  }

  .chronolock-presets button {
    flex: 1;
    min-width: 44px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: #e2e8f0;
    padding: 4px 6px;
    font-size: 11px;
    font-weight: 500;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .chronolock-presets button:hover {
    background: rgba(255, 255, 255, 0.16);
    transform: translateY(-1px);
  }

  #chronolock-mode {
    width: 100%;
    background: rgba(0,0,0,0.45);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 11px;
    cursor: pointer;
  }

  /* Block list chips & inputs */
  .chronolock-list-box {
    max-height: 110px;
    min-height: 48px;
    overflow-y: auto;
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 6px;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 4px;
    margin-top: 6px;
    scrollbar-width: thin;
  }

  .chronolock-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 5px;
    padding: 2px 7px;
    font-size: 11px;
    color: #f1f5f9;
    max-width: 100%;
    word-break: break-all;
  }

  .chronolock-chip span.remove-chip {
    cursor: pointer;
    font-weight: bold;
    color: #f87171;
    font-size: 12px;
    line-height: 1;
    transition: color 0.15s ease;
  }

  .chronolock-chip span.remove-chip:hover {
    color: #ef4444;
  }

  .chronolock-input-row {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }

  .chronolock-input-row input {
    flex: 1;
    background: rgba(0,0,0,0.45);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    color: #fff;
    padding: 5px 8px;
    font-size: 11px;
    outline: none;
  }

  .chronolock-input-row input:focus {
    border-color: #3b82f6;
  }

  .chronolock-input-row button {
    cursor: pointer;
    background: #3b82f6;
    border: none;
    border-radius: 6px;
    color: #ffffff;
    font-weight: 600;
    padding: 5px 12px;
    font-size: 11px;
    transition: background 0.15s ease;
  }

  .chronolock-input-row button:hover {
    background: #2563eb;
  }

  /* Hover block button on video cards */
  .chronolock-card-relative {
    position: relative !important;
  }

  .chronolock-block-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1000;
    display: none;
    align-items: center;
    gap: 4px;
    background: rgba(18, 18, 22, 0.9);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 11px;
    font-family: system-ui, -apple-system, sans-serif;
    cursor: pointer;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: 0 4px 14px rgba(0,0,0,0.5);
    transition: background 0.15s ease, transform 0.15s ease;
    white-space: nowrap;
    pointer-events: auto;
  }

  .chronolock-block-btn:hover {
    background: rgba(220, 38, 38, 0.95);
    border-color: rgba(255, 255, 255, 0.4);
    transform: scale(1.03);
  }

  ytd-rich-item-renderer:hover .chronolock-block-btn,
  ytd-video-renderer:hover .chronolock-block-btn,
  ytd-compact-video-renderer:hover .chronolock-block-btn,
  ytd-grid-video-renderer:hover .chronolock-block-btn,
  ytd-reel-item-renderer:hover .chronolock-block-btn {
    display: inline-flex !important;
  }
  `;
  (document.head || document.documentElement).appendChild(style);

  // ---------------------------
  // UI
  // ---------------------------

  function renderChipList(containerId, countId, items, onRemove) {
    const container = document.getElementById(containerId);
    const countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = items.length;
    if (!container) return;

    container.innerHTML = "";
    if (items.length === 0) {
      container.innerHTML = `<span style="opacity:0.45; font-size:11px; padding:4px;">No items blocked</span>`;
      return;
    }

    items.forEach((item, idx) => {
      const chip = document.createElement("span");
      chip.className = "chronolock-chip";
      chip.textContent = item;

      const removeBtn = document.createElement("span");
      removeBtn.className = "remove-chip";
      removeBtn.innerHTML = " &times;";
      removeBtn.title = "Remove";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        onRemove(idx);
      });

      chip.appendChild(removeBtn);
      container.appendChild(chip);
    });
  }

  function addBlockedChannel(channelName) {
    if (!channelName) return;
    const clean = channelName.trim();
    if (!clean) return;
    if (!state.blockedChannels.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      state.blockedChannels.push(clean);
      saveState();
      syncControls();
      runFilter();
    }
  }

  function removeBlockedChannel(index) {
    state.blockedChannels.splice(index, 1);
    saveState();
    syncControls();
    runFilter();
  }

  function addBlockedKeyword(keyword) {
    if (!keyword) return;
    const clean = keyword.trim();
    if (!clean) return;
    if (!state.blockedKeywords.some((k) => k.toLowerCase() === clean.toLowerCase())) {
      state.blockedKeywords.push(clean);
      saveState();
      syncControls();
      runFilter();
    }
  }

  function removeBlockedKeyword(index) {
    state.blockedKeywords.splice(index, 1);
    saveState();
    syncControls();
    runFilter();
  }

  function syncControls(ui) {
    if (!ui) ui = document.getElementById("chronolock-ui");
    if (!ui) return;

    // Master switch
    const masterSwitch = ui.querySelector("#chronolock-master-toggle");
    if (masterSwitch) masterSwitch.checked = state.enabled;

    // Sub-feature switches
    const yearSwitch = ui.querySelector("#chronolock-year-toggle");
    if (yearSwitch) yearSwitch.checked = state.yearFilterEnabled;

    const channelSwitch = ui.querySelector("#chronolock-channel-toggle");
    if (channelSwitch) channelSwitch.checked = state.channelFilterEnabled;

    const keywordSwitch = ui.querySelector("#chronolock-keyword-toggle");
    if (keywordSwitch) keywordSwitch.checked = state.keywordFilterEnabled;

    // Sliders & inputs
    const slider = ui.querySelector("#chronolock-slider");
    const input = ui.querySelector("#chronolock-input");
    const mode = ui.querySelector("#chronolock-mode");

    if (slider) slider.value = state.cutoffYear;
    if (input) input.value = state.cutoffYear;
    if (mode) mode.value = state.mode;

    // Badges in overview
    const yearBadge = ui.querySelector("#cl-year-badge");
    if (yearBadge) yearBadge.textContent = state.cutoffYear;

    // Chip lists
    renderChipList(
      "chronolock-channel-list",
      "chronolock-channel-count",
      state.blockedChannels,
      removeBlockedChannel
    );
    renderChipList(
      "chronolock-keyword-list",
      "chronolock-keyword-count",
      state.blockedKeywords,
      removeBlockedKeyword
    );

    // Channel badge in feature overview & tab
    const chBadge = ui.querySelector("#cl-channel-badge");
    if (chBadge) chBadge.textContent = `${state.blockedChannels.length}`;

    // Keyword badge in feature overview & tab
    const kwBadge = ui.querySelector("#cl-keyword-badge");
    if (kwBadge) kwBadge.textContent = `${state.blockedKeywords.length}`;
  }

  function updateToggleHeader(ui) {
    if (!ui) ui = document.getElementById("chronolock-ui");
    if (!ui) return;

    const chevron = ui.querySelector(".chronolock-chevron");
    if (chevron) {
      chevron.className = `chronolock-chevron ${panelOpen ? "open" : ""}`;
    }
  }

  function updateAllUI() {
    const ui = document.getElementById("chronolock-ui");
    if (!ui) return;
    updateToggleHeader(ui);
    syncControls(ui);
  }

  function switchTab(tabName) {
    activeTab = tabName;
    const ui = document.getElementById("chronolock-ui");
    if (!ui) return;

    ui.querySelectorAll(".cl-tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    ui.querySelectorAll(".cl-subpanel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `cl-subpanel-${tabName}`);
    });
  }

  function createUI() {
    if (document.getElementById("chronolock-ui")) return;

    normalizeState();

    const ui = document.createElement("div");
    ui.id = "chronolock-ui";

    ui.innerHTML = `
      <!-- Header Bar -->
      <div id="chronolock-header">
        <div class="chronolock-header-title">
          <span>⏳</span>
          <span>CHRONOLOCK</span>
        </div>
        <div class="chronolock-header-actions">
          <label class="cl-switch" title="Master Toggle (All ChronoLock features)">
            <input type="checkbox" id="chronolock-master-toggle" ${state.enabled ? "checked" : ""}>
            <span class="cl-slider-toggle"></span>
          </label>
          <span class="chronolock-chevron ${panelOpen ? "open" : ""}">▼</span>
        </div>
      </div>

      <!-- Main Expandable Panel -->
      <div id="chronolock-panel" style="${panelOpen ? "display:block;" : "display:none;"}">

        <!-- Feature Toggles Overview Strip -->
        <div class="cl-feature-toggles">
          <div class="cl-feature-row">
            <div class="cl-feature-info">
              <span>📅</span>
              <span>Year Filter</span>
              <span id="cl-year-badge" class="cl-feature-badge">${state.cutoffYear}</span>
            </div>
            <label class="cl-switch" title="Toggle Year Filtering">
              <input type="checkbox" id="chronolock-year-toggle" ${state.yearFilterEnabled ? "checked" : ""}>
              <span class="cl-slider-toggle"></span>
            </label>
          </div>

          <div class="cl-feature-row">
            <div class="cl-feature-info">
              <span>🚫</span>
              <span>Channel Block</span>
              <span id="cl-channel-badge" class="cl-feature-badge">${state.blockedChannels.length}</span>
            </div>
            <label class="cl-switch" title="Toggle Channel Blocking">
              <input type="checkbox" id="chronolock-channel-toggle" ${state.channelFilterEnabled ? "checked" : ""}>
              <span class="cl-slider-toggle"></span>
            </label>
          </div>

          <div class="cl-feature-row">
            <div class="cl-feature-info">
              <span>🔤</span>
              <span>Keyword Block</span>
              <span id="cl-keyword-badge" class="cl-feature-badge">${state.blockedKeywords.length}</span>
            </div>
            <label class="cl-switch" title="Toggle Keyword Blocking">
              <input type="checkbox" id="chronolock-keyword-toggle" ${state.keywordFilterEnabled ? "checked" : ""}>
              <span class="cl-slider-toggle"></span>
            </label>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="cl-tabs">
          <button class="cl-tab-btn active" data-tab="year">Year</button>
          <button class="cl-tab-btn" data-tab="channels">Channels</button>
          <button class="cl-tab-btn" data-tab="keywords">Keywords</button>
        </div>

        <!-- TAB 1: Year Settings -->
        <div id="cl-subpanel-year" class="cl-subpanel active">
          <div class="cl-control-group">
            <div class="cl-label">
              <span>Cutoff Year</span>
              <span style="opacity:0.7; font-size:10px;">Videos newer are filtered</span>
            </div>
            <div class="cl-slider-row">
              <input id="chronolock-slider" type="range" min="2005" max="2026" value="${state.cutoffYear}" />
              <input id="chronolock-input" type="number" min="2005" max="2026" value="${state.cutoffYear}" />
            </div>
            <div class="chronolock-presets">
              <button data-year="2005">'05</button>
              <button data-year="2007">'07</button>
              <button data-year="2012">2012</button>
              <button data-year="2016">2016</button>
              <button data-year="2018">2018</button>
            </div>
          </div>

          <div class="cl-control-group" style="margin-top:12px;">
            <div class="cl-label">
              <span>Filter Mode</span>
            </div>
            <select id="chronolock-mode">
              <option value="hidden" ${state.mode === "hidden" ? "selected" : ""}>Hide completely</option>
              <option value="dim" ${state.mode === "dim" ? "selected" : ""}>Dim & grayscale</option>
              <option value="fade" ${state.mode === "fade" ? "selected" : ""}>Fade invisible (keep slot)</option>
            </select>
          </div>
        </div>

        <!-- TAB 2: Channels -->
        <div id="cl-subpanel-channels" class="cl-subpanel">
          <div class="cl-label">
            <span>Blocked Channels (<span id="chronolock-channel-count">0</span>)</span>
            <span style="opacity:0.6; font-size:10px;">Or hover video & click Block</span>
          </div>
          <div class="chronolock-input-row">
            <input id="chronolock-channel-input" type="text" placeholder="Channel name..." />
            <button id="chronolock-channel-add">Add</button>
          </div>
          <div id="chronolock-channel-list" class="chronolock-list-box"></div>
        </div>

        <!-- TAB 3: Keywords -->
        <div id="cl-subpanel-keywords" class="cl-subpanel">
          <div class="cl-label">
            <span>Blocked Keywords (<span id="chronolock-keyword-count">0</span>)</span>
            <span style="opacity:0.6; font-size:10px;">Matches titles/metadata</span>
          </div>
          <div class="chronolock-input-row">
            <input id="chronolock-keyword-input" type="text" placeholder="Keyword or phrase..." />
            <button id="chronolock-keyword-add">Add</button>
          </div>
          <div id="chronolock-keyword-list" class="chronolock-list-box"></div>
        </div>

      </div>
    `;

    document.body.appendChild(ui);

    const header = ui.querySelector("#chronolock-header");
    const panel = ui.querySelector("#chronolock-panel");
    const masterToggle = ui.querySelector("#chronolock-master-toggle");
    const yearToggle = ui.querySelector("#chronolock-year-toggle");
    const channelToggle = ui.querySelector("#chronolock-channel-toggle");
    const keywordToggle = ui.querySelector("#chronolock-keyword-toggle");

    const slider = ui.querySelector("#chronolock-slider");
    const input = ui.querySelector("#chronolock-input");
    const mode = ui.querySelector("#chronolock-mode");

    syncControls(ui);

    // Clicking header opens/closes panel (unless master switch clicked)
    header.addEventListener("click", (e) => {
      if (e.target.closest(".cl-switch")) return;
      panelOpen = !panelOpen;
      panel.style.display = panelOpen ? "block" : "none";
      updateToggleHeader(ui);
    });

    // Master Toggle
    masterToggle.addEventListener("change", (e) => {
      state.enabled = e.target.checked;
      saveState();
      updateAllUI();
      runFilter();
    });

    // Per-feature Toggles
    yearToggle.addEventListener("change", (e) => {
      state.yearFilterEnabled = e.target.checked;
      saveState();
      runFilter();
    });

    channelToggle.addEventListener("change", (e) => {
      state.channelFilterEnabled = e.target.checked;
      saveState();
      runFilter();
    });

    keywordToggle.addEventListener("change", (e) => {
      state.keywordFilterEnabled = e.target.checked;
      saveState();
      runFilter();
    });

    // Tab buttons
    ui.querySelectorAll(".cl-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        switchTab(btn.dataset.tab);
      });
    });

    // Slider & Input year controls
    slider.addEventListener("input", (e) => {
      state.cutoffYear = parseInt(e.target.value, 10);
      syncControls(ui);
      saveState();
      runFilter();
    });

    input.addEventListener("input", (e) => {
      state.cutoffYear = parseInt(e.target.value, 10);
      syncControls(ui);
      saveState();
      runFilter();
    });

    ui.querySelectorAll("button[data-year]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.cutoffYear = parseInt(btn.dataset.year, 10);
        syncControls(ui);
        saveState();
        runFilter();
      });
    });

    mode.addEventListener("change", (e) => {
      state.mode = e.target.value;
      saveState();
      runFilter();
    });

    // Channel adding
    const channelInput = ui.querySelector("#chronolock-channel-input");
    const channelAddBtn = ui.querySelector("#chronolock-channel-add");
    channelAddBtn?.addEventListener("click", () => {
      if (channelInput && channelInput.value) {
        addBlockedChannel(channelInput.value);
        channelInput.value = "";
      }
    });

    channelInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && channelInput.value) {
        addBlockedChannel(channelInput.value);
        channelInput.value = "";
      }
    });

    // Keyword adding
    const keywordInput = ui.querySelector("#chronolock-keyword-input");
    const keywordAddBtn = ui.querySelector("#chronolock-keyword-add");
    keywordAddBtn?.addEventListener("click", () => {
      if (keywordInput && keywordInput.value) {
        addBlockedKeyword(keywordInput.value);
        keywordInput.value = "";
      }
    });

    keywordInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && keywordInput.value) {
        addBlockedKeyword(keywordInput.value);
        keywordInput.value = "";
      }
    });
  }

  // ---------------------------
  // VIDEO COLLECTION & PARSING
  // ---------------------------

  function getVideos() {
    return Array.from(
      document.querySelectorAll(
        "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer"
      )
    );
  }

  function extractVideoDateText(v) {
    // 1. Check if metadata container has an "ago" or time string
    const metaLine = v.querySelector(
      "#metadata-line, #metadata, #inline-metadata, ytd-video-meta-block, .ytd-video-meta-block"
    );
    if (metaLine) {
      const txt = (metaLine.textContent || metaLine.innerText || "").trim();
      if (txt && /ago|streamed|yesterday|today|premier/i.test(txt)) {
        return txt;
      }
    }

    // 2. Check title link or thumbnail aria-label which often contains timestamps like "2 weeks ago"
    const titleLink = v.querySelector("#video-title-link, #video-title, a#thumbnail");
    const aria = titleLink?.getAttribute("aria-label");
    if (aria && /ago|streamed|yesterday|today|premier/i.test(aria)) {
      return aria;
    }

    // 3. Fall back to entire element text content
    return (v.textContent || v.innerText || "").trim();
  }

  function getYear(text) {
    if (!text) return null;

    text = text.toLowerCase();

    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Years: e.g. "5y ago", "5 yr ago", "5 yrs ago", "5 years ago", "1 year ago", "a year ago"
    let m = text.match(/(\d+|an?)\s*(?:years?|yrs?|yr|y)\.?\s+ago/);
    if (m) {
      const num = (m[1] === "a" || m[1] === "an") ? 1 : parseInt(m[1], 10);
      return currentYear - num;
    }

    // 2. Sub-year units:
    // - weeks: wk, wks, week, weeks, w
    // - hours: hr, hrs, hour, hours, h
    // - months: mo, mos, mth, mths, month, months
    // - days: day, days, d
    // - minutes: min, mins, minute, minutes, m
    // - seconds: sec, secs, second, seconds, s
    m = text.match(/(\d+|an?)\s*(?:months?|mths?|mth|mos?|mo|weeks?|wks?|wk|w|days?|d|hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\.?\s+ago/);
    if (m) {
      return currentYear;
    }

    // 3. Keywords indicating very recent
    if (text.includes("streamed") || text.includes("today") || text.includes("yesterday") || text.includes("just now") || text.includes("live")) {
      return currentYear;
    }

    // 4. Absolute 4-digit years (e.g. "Premiered Nov 12, 2017")
    m = text.match(/\b(200\d|201\d|202\d)\b/);
    if (m) {
      return parseInt(m[1], 10);
    }

    return null;
  }

  function extractVideoDetails(v) {
    // 1. Channel name extraction
    let channelName = "";
    const channelEl = v.querySelector(
      "#channel-name, .ytd-channel-name, ytd-channel-name, #byline, .ytd-channel-name yt-formatted-string, #text.ytd-channel-name, #upload-info #channel-name"
    );
    if (channelEl) {
      channelName = (channelEl.textContent || channelEl.innerText || "").trim();
    }
    if (!channelName) {
      // Fallback: check link href with /@ or /channel/
      const chLink = v.querySelector("a[href*='/@'], a[href*='/channel/'], a[href*='/c/']");
      if (chLink) {
        channelName = (chLink.textContent || chLink.innerText || "").trim();
        if (!channelName && chLink.getAttribute("href")) {
          const href = chLink.getAttribute("href");
          const m = href.match(/\/(@[^\/?]+)/);
          if (m) channelName = m[1];
        }
      }
    }

    // 2. Title extraction
    let videoTitle = "";
    const titleEl = v.querySelector("#video-title, #video-title-link, [id='video-title']");
    if (titleEl) {
      videoTitle = (titleEl.textContent || titleEl.innerText || titleEl.getAttribute("title") || "").trim();
    }

    // Full text of card (for keywords or fallback)
    const fullText = (v.textContent || v.innerText || "").trim();

    return {
      channelName,
      videoTitle,
      fullText
    };
  }

  function attachBlockButton(v) {
    if (v.querySelector(".chronolock-block-btn")) return;

    if (!v.classList.contains("chronolock-card-relative")) {
      v.classList.add("chronolock-card-relative");
    }

    const btn = document.createElement("button");
    btn.className = "chronolock-block-btn";
    btn.title = "Block this channel in ChronoLock";
    btn.innerHTML = `🚫 <span>Block Channel</span>`;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      const details = extractVideoDetails(v);
      if (details.channelName) {
        addBlockedChannel(details.channelName);
      } else {
        const manual = prompt("Block channel name:", "");
        if (manual) {
          addBlockedChannel(manual);
        }
      }
    });

    v.appendChild(btn);
  }

  function isBlockedByChannelOrKeyword(v) {
    const details = extractVideoDetails(v);

    // 1. Check channel if channelFilterEnabled
    if (state.channelFilterEnabled && Array.isArray(state.blockedChannels) && state.blockedChannels.length > 0) {
      const chLower = (details.channelName || "").toLowerCase();
      if (chLower) {
        for (const blocked of state.blockedChannels) {
          const b = blocked.toLowerCase().trim();
          if (b && (chLower === b || chLower.includes(b))) {
            return true;
          }
        }
      }
    }

    // 2. Check keyword if keywordFilterEnabled
    if (state.keywordFilterEnabled && Array.isArray(state.blockedKeywords) && state.blockedKeywords.length > 0) {
      const titleLower = (details.videoTitle || "").toLowerCase();
      const fullLower = (details.fullText || "").toLowerCase();
      for (const blocked of state.blockedKeywords) {
        const b = blocked.toLowerCase().trim();
        if (b && (titleLower.includes(b) || fullLower.includes(b))) {
          return true;
        }
      }
    }

    return false;
  }

  // ---------------------------
  // FILTERING
  // ---------------------------

  function resetVideo(v) {
    v.classList.remove(
      "chronolock-hidden",
      "chronolock-dim",
      "chronolock-fade"
    );
  }

  function applyMode(v) {
    v.classList.remove(
      "chronolock-hidden",
      "chronolock-dim",
      "chronolock-fade"
    );

    if (state.mode === "dim") {
      v.classList.add("chronolock-dim");
    } else if (state.mode === "fade") {
      v.classList.add("chronolock-fade");
    } else {
      v.classList.add("chronolock-hidden");
    }
  }

  function runFilter() {
    const videos = getVideos();

    videos.forEach((v) => {
      attachBlockButton(v);
      resetVideo(v);

      // If master extension switch is off, do not filter anything
      if (!state.enabled) {
        return;
      }

      // Check custom channel & keyword blocklists
      if (isBlockedByChannelOrKeyword(v)) {
        applyMode(v);
        return;
      }

      // Check year cutoff (only if yearFilterEnabled is on)
      if (state.yearFilterEnabled) {
        const text = extractVideoDateText(v);
        const year = getYear(text);

        if (year !== null && year > state.cutoffYear) {
          applyMode(v);
        }
      }
    });
  }

  // ---------------------------
  // OBSERVER
  // ---------------------------

  let filterTimeout = null;

  function startObserver() {
    const observer = new MutationObserver(() => {
      clearTimeout(filterTimeout);
      filterTimeout = setTimeout(() => {
        if (!document.getElementById("chronolock-ui")) {
          createUI();
        }
        runFilter();
      }, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    runFilter();
  }

  // ---------------------------
  // CROSS-CONTEXT SYNC
  // ---------------------------

  // Handle messages from the extension toolbar button
  chrome.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "CHRONOLOCK_TOGGLE") {
      if (msg.state) {
        state = { ...state, ...msg.state };
      } else {
        state.enabled = !state.enabled;
      }
      normalizeState();
      updateAllUI();
      runFilter();
      sendResponse?.({ success: true, state });
    }
  });

  // Handle storage changes from another tab or background worker
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (changes.chronolock?.newValue) {
      state = { ...state, ...changes.chronolock.newValue };
      normalizeState();
      updateAllUI();
      runFilter();
    }
  });

  // ---------------------------
  // INIT
  // ---------------------------

  function start() {
    loadState().then(() => {
      createUI();
      startObserver();
    });
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
}
