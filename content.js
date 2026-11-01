console.log("WEBFILTER ACTIVE");

if (window.__chronolockInjected) {
  // Prevent duplicate injection on same page
  if (typeof runFilter === "function") runFilter();
} else {
  window.__chronolockInjected = true;
  initChronoLock();
}

function initChronoLock() {
  const isTwitter = /twitter\.com|x\.com/.test(window.location.hostname);
  const isYouTube = /youtube\.com/.test(window.location.hostname);

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
    blockedChannels: [], // Array<{ text: string, enabled: boolean }>
    blockedKeywords: []  // Array<{ text: string, enabled: boolean }>
  };

  let panelOpen = false;
  let activeTab = isTwitter ? "keywords" : "year";
  let channelSearchQuery = "";
  let keywordSearchQuery = "";

  // Normalize legacy array format (strings -> { text, enabled })
  function normalizeItemList(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => {
        if (typeof item === "string") {
          const t = item.trim();
          return t ? { text: t, enabled: true } : null;
        } else if (item && typeof item === "object" && typeof item.text === "string") {
          return {
            text: item.text.trim(),
            enabled: typeof item.enabled === "boolean" ? item.enabled : true
          };
        }
        return null;
      })
      .filter((item) => item && item.text.length > 0);
  }

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
    state.blockedChannels = normalizeItemList(state.blockedChannels);
    state.blockedKeywords = normalizeItemList(state.blockedKeywords);
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
    bottom: 16px;
    right: 16px;
    z-index: 99999999;

    width: 280px;
    border-radius: 12px;

    font-size: 11.5px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #f1f1f1;

    background: rgba(18, 18, 24, 0.92);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);

    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
    overflow: hidden;
    user-select: none;
    transition: opacity 0.2s ease, visibility 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }

  /* Automatically hide dock when video is fullscreened */
  :fullscreen #chronolock-ui,
  :-webkit-full-screen #chronolock-ui,
  :-moz-full-screen #chronolock-ui,
  body.yt-fullscreen-active #chronolock-ui,
  ytd-app[fullscreen] #chronolock-ui,
  ytd-watch-flexy[fullscreen] #chronolock-ui,
  #movie_player:fullscreen ~ #chronolock-ui,
  .ytp-fullscreen #chronolock-ui,
  body.chronolock-fullscreen-hide #chronolock-ui {
    display: none !important;
  }

  #chronolock-ui:hover {
    border-color: rgba(255, 255, 255, 0.24);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
  }

  /* Header Bar - Compact */
  #chronolock-header {
    cursor: pointer;
    padding: 8px 12px;
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
    gap: 6px;
    font-weight: 700;
    font-size: 11.5px;
    letter-spacing: 0.06em;
    color: #ffffff;
  }

  .chronolock-header-actions {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .chronolock-chevron {
    font-size: 9px;
    opacity: 0.6;
    transition: transform 0.2s ease;
  }

  .chronolock-chevron.open {
    transform: rotate(180deg);
  }

  /* Modern compact iOS-style toggle switches */
  .cl-switch {
    position: relative;
    display: inline-block;
    width: 28px;
    height: 15px;
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
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .cl-slider-toggle:before {
    position: absolute;
    content: "";
    height: 11px;
    width: 11px;
    left: 1px;
    bottom: 1px;
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
    transform: translateX(13px);
  }

  /* Tiny toggle for individual list items */
  .cl-mini-switch {
    position: relative;
    display: inline-block;
    width: 22px;
    height: 12px;
    flex-shrink: 0;
  }

  .cl-mini-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .cl-mini-toggle {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255, 255, 255, 0.2);
    transition: 0.18s ease;
    border-radius: 10px;
  }

  .cl-mini-toggle:before {
    position: absolute;
    content: "";
    height: 8px;
    width: 8px;
    left: 2px;
    bottom: 2px;
    background: white;
    transition: 0.18s ease;
    border-radius: 50%;
  }

  .cl-mini-switch input:checked + .cl-mini-toggle {
    background: #10b981;
  }

  .cl-mini-switch input:checked + .cl-mini-toggle:before {
    transform: translateX(10px);
  }

  /* Panel body */
  #chronolock-panel {
    padding: 10px 12px 12px 12px;
    max-height: 440px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  /* Feature Toggles Strip */
  .cl-feature-toggles {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: rgba(0, 0, 0, 0.32);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 6px 9px;
    margin-bottom: 10px;
  }

  .cl-feature-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 500;
  }

  .cl-feature-info {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .cl-feature-badge {
    font-size: 9.5px;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    font-weight: 600;
  }

  /* Tabs */
  .cl-tabs {
    display: flex;
    gap: 4px;
    background: rgba(0, 0, 0, 0.32);
    padding: 3px;
    border-radius: 7px;
    margin-bottom: 10px;
  }

  .cl-tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 10.5px;
    font-weight: 600;
    padding: 5px 0;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: center;
  }

  .cl-tab-btn:hover {
    color: #fff;
  }

  .cl-tab-btn.active {
    background: #3b82f6;
    color: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  .cl-subpanel {
    display: none;
  }

  .cl-subpanel.active {
    display: block;
  }

  /* Form controls */
  .cl-control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cl-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    color: #cbd5e1;
    font-size: 10.5px;
  }

  .cl-slider-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  #chronolock-slider {
    flex: 1;
    accent-color: #3b82f6;
    cursor: pointer;
    height: 4px;
  }

  #chronolock-input {
    width: 52px;
    background: rgba(0,0,0,0.45);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 5px;
    padding: 3px 4px;
    text-align: center;
    font-weight: 600;
    font-size: 11px;
  }

  .chronolock-presets {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
    margin-top: 5px;
  }

  .chronolock-presets button {
    flex: 1;
    min-width: 38px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 5px;
    color: #e2e8f0;
    padding: 3px 4px;
    font-size: 10px;
    font-weight: 500;
    transition: background 0.15s ease;
  }

  .chronolock-presets button:hover {
    background: rgba(255, 255, 255, 0.16);
  }

  #chronolock-mode {
    width: 100%;
    background: rgba(0,0,0,0.45);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 5px;
    padding: 4px 6px;
    font-size: 10.5px;
    cursor: pointer;
  }

  /* Search & Add row */
  .chronolock-search-row {
    margin-bottom: 6px;
  }

  .chronolock-search-input {
    width: 100%;
    box-sizing: border-box;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 5px;
    color: #fff;
    padding: 4px 8px;
    font-size: 10.5px;
    outline: none;
  }

  .chronolock-search-input::placeholder {
    color: rgba(255,255,255,0.4);
  }

  .chronolock-search-input:focus {
    border-color: #3b82f6;
  }

  .chronolock-input-row {
    display: flex;
    gap: 5px;
    margin-top: 5px;
  }

  .chronolock-input-row input {
    flex: 1;
    background: rgba(0,0,0,0.45);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 5px;
    color: #fff;
    padding: 4px 6px;
    font-size: 10.5px;
    outline: none;
  }

  .chronolock-input-row input:focus {
    border-color: #3b82f6;
  }

  .chronolock-input-row button {
    cursor: pointer;
    background: #3b82f6;
    border: none;
    border-radius: 5px;
    color: #ffffff;
    font-weight: 600;
    padding: 4px 10px;
    font-size: 10.5px;
    transition: background 0.15s ease;
  }

  .chronolock-input-row button:hover {
    background: #2563eb;
  }

  /* Modern Item List with individual toggles & delete */
  .chronolock-list-box {
    max-height: 140px;
    min-height: 50px;
    overflow-y: auto;
    background: rgba(0,0,0,0.38);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 6px;
    scrollbar-width: thin;
  }

  .chronolock-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 5px;
    padding: 4px 6px;
    font-size: 10.5px;
    color: #f1f5f9;
    transition: background 0.15s ease, opacity 0.15s ease;
  }

  .chronolock-list-item:hover {
    background: rgba(255,255,255,0.1);
  }

  .chronolock-list-item.is-disabled {
    opacity: 0.45;
    background: rgba(255,255,255,0.03);
  }

  .chronolock-list-item-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 6px;
    font-weight: 500;
  }

  .chronolock-list-item.is-disabled .chronolock-list-item-text {
    text-decoration: line-through;
  }

  .chronolock-list-item-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .chronolock-del-btn {
    cursor: pointer;
    font-weight: bold;
    color: #f87171;
    font-size: 13px;
    line-height: 1;
    padding: 1px 4px;
    border-radius: 3px;
    background: transparent;
    border: none;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .chronolock-del-btn:hover {
    background: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
  }

  /* Hover block button on YouTube & Twitter cards */
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
    background: rgba(18, 18, 22, 0.92);
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
  ytd-reel-item-renderer:hover .chronolock-block-btn,
  article[data-testid="tweet"]:hover .chronolock-block-btn {
    display: inline-flex !important;
  }
  `;
  (document.head || document.documentElement).appendChild(style);

  // ---------------------------
  // UI ITEM LIST RENDERING
  // ---------------------------

  function renderInteractiveList(containerId, countId, items, searchQuery, onToggle, onRemove) {
    const container = document.getElementById(containerId);
    const countEl = document.getElementById(countId);
    if (!container) return;

    const activeCount = items.filter((i) => i.enabled).length;
    if (countEl) {
      countEl.textContent = `${activeCount}/${items.length}`;
    }

    const filtered = items.map((item, originalIndex) => ({ item, originalIndex })).filter(({ item }) => {
      if (!searchQuery) return true;
      return item.text.toLowerCase().includes(searchQuery.toLowerCase());
    });

    container.innerHTML = "";
    if (items.length === 0) {
      container.innerHTML = `<span style="opacity:0.45; font-size:10.5px; padding:6px; text-align:center;">No items added</span>`;
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `<span style="opacity:0.45; font-size:10.5px; padding:6px; text-align:center;">No matching items</span>`;
      return;
    }

    filtered.forEach(({ item, originalIndex }) => {
      const row = document.createElement("div");
      row.className = `chronolock-list-item ${item.enabled ? "" : "is-disabled"}`;

      const textSpan = document.createElement("span");
      textSpan.className = "chronolock-list-item-text";
      textSpan.textContent = item.text;
      textSpan.title = item.text;

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "chronolock-list-item-actions";

      // Mini toggle switch
      const switchLabel = document.createElement("label");
      switchLabel.className = "cl-mini-switch";
      switchLabel.title = item.enabled ? "Enabled (Click to disable)" : "Disabled (Click to enable)";

      const switchInput = document.createElement("input");
      switchInput.type = "checkbox";
      switchInput.checked = Boolean(item.enabled);
      switchInput.addEventListener("change", (e) => {
        e.stopPropagation();
        onToggle(originalIndex, switchInput.checked);
      });

      const sliderSpan = document.createElement("span");
      sliderSpan.className = "cl-mini-toggle";

      switchLabel.appendChild(switchInput);
      switchLabel.appendChild(sliderSpan);

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.className = "chronolock-del-btn";
      delBtn.innerHTML = "&times;";
      delBtn.title = "Delete item";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        onRemove(originalIndex);
      });

      actionsDiv.appendChild(switchLabel);
      actionsDiv.appendChild(delBtn);

      row.appendChild(textSpan);
      row.appendChild(actionsDiv);
      container.appendChild(row);
    });
  }

  // Channel Operations
  function addBlockedChannel(channelName) {
    if (!channelName) return;
    const clean = channelName.trim();
    if (!clean) return;
    if (!state.blockedChannels.some((c) => c.text.toLowerCase() === clean.toLowerCase())) {
      state.blockedChannels.push({ text: clean, enabled: true });
      saveState();
      syncControls();
      runFilter();
    }
  }

  function toggleBlockedChannel(index, enabled) {
    if (state.blockedChannels[index]) {
      state.blockedChannels[index].enabled = enabled;
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

  // Keyword Operations
  function addBlockedKeyword(keyword) {
    if (!keyword) return;
    const clean = keyword.trim();
    if (!clean) return;
    if (!state.blockedKeywords.some((k) => k.text.toLowerCase() === clean.toLowerCase())) {
      state.blockedKeywords.push({ text: clean, enabled: true });
      saveState();
      syncControls();
      runFilter();
    }
  }

  function toggleBlockedKeyword(index, enabled) {
    if (state.blockedKeywords[index]) {
      state.blockedKeywords[index].enabled = enabled;
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

    const activeChannels = state.blockedChannels.filter((c) => c.enabled).length;
    const chBadge = ui.querySelector("#cl-channel-badge");
    if (chBadge) chBadge.textContent = `${activeChannels}/${state.blockedChannels.length}`;

    const activeKeywords = state.blockedKeywords.filter((k) => k.enabled).length;
    const kwBadge = ui.querySelector("#cl-keyword-badge");
    if (kwBadge) kwBadge.textContent = `${activeKeywords}/${state.blockedKeywords.length}`;

    // Render Lists
    renderInteractiveList(
      "chronolock-channel-list",
      "chronolock-channel-count",
      state.blockedChannels,
      channelSearchQuery,
      toggleBlockedChannel,
      removeBlockedChannel
    );

    renderInteractiveList(
      "chronolock-keyword-list",
      "chronolock-keyword-count",
      state.blockedKeywords,
      keywordSearchQuery,
      toggleBlockedKeyword,
      removeBlockedKeyword
    );
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

  function togglePanelVisibility(forceOpen) {
    const ui = document.getElementById("chronolock-ui");
    if (!ui) {
      createUI();
      panelOpen = true;
      const createdPanel = document.getElementById("chronolock-panel");
      if (createdPanel) createdPanel.style.display = "block";
      updateToggleHeader();
      return;
    }

    panelOpen = typeof forceOpen === "boolean" ? forceOpen : !panelOpen;
    const panel = ui.querySelector("#chronolock-panel");
    if (panel) {
      panel.style.display = panelOpen ? "block" : "none";
    }
    updateToggleHeader(ui);
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

    const channelLabelText = isTwitter ? "Authors" : "Channels";
    const channelSingleText = isTwitter ? "Author" : "Channel";

    ui.innerHTML = `
      <!-- Header Bar -->
      <div id="chronolock-header">
        <div class="chronolock-header-title">
          <span>🛡️</span>
          <span>WEBFILTER</span>
        </div>
        <div class="chronolock-header-actions">
          <label class="cl-switch" title="Master Toggle (All WebFilter features)">
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
              <span>${channelLabelText} Block</span>
              <span id="cl-channel-badge" class="cl-feature-badge">0</span>
            </div>
            <label class="cl-switch" title="Toggle ${channelLabelText} Blocking">
              <input type="checkbox" id="chronolock-channel-toggle" ${state.channelFilterEnabled ? "checked" : ""}>
              <span class="cl-slider-toggle"></span>
            </label>
          </div>

          <div class="cl-feature-row">
            <div class="cl-feature-info">
              <span>🔤</span>
              <span>Keyword Block</span>
              <span id="cl-keyword-badge" class="cl-feature-badge">0</span>
            </div>
            <label class="cl-switch" title="Toggle Keyword Blocking">
              <input type="checkbox" id="chronolock-keyword-toggle" ${state.keywordFilterEnabled ? "checked" : ""}>
              <span class="cl-slider-toggle"></span>
            </label>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="cl-tabs">
          <button class="cl-tab-btn ${activeTab === "year" ? "active" : ""}" data-tab="year">Year</button>
          <button class="cl-tab-btn ${activeTab === "channels" ? "active" : ""}" data-tab="channels">${channelLabelText}</button>
          <button class="cl-tab-btn ${activeTab === "keywords" ? "active" : ""}" data-tab="keywords">Keywords</button>
        </div>

        <!-- TAB 1: Year Settings -->
        <div id="cl-subpanel-year" class="cl-subpanel ${activeTab === "year" ? "active" : ""}">
          <div class="cl-control-group">
            <div class="cl-label">
              <span>Cutoff Year</span>
              <span style="opacity:0.7; font-size:10px;">Items newer are filtered</span>
            </div>
            <div class="cl-slider-row">
              <input id="chronolock-slider" type="range" min="2005" max="2026" value="${state.cutoffYear}" />
              <input id="chronolock-input" type="number" min="2005" max="2026" value="${state.cutoffYear}" />
            </div>
            <div class="chronolock-presets">
              <button data-year="2006">'06</button>
              <button data-year="2010">2010</button>
              <button data-year="2015">2015</button>
              <button data-year="2018">2018</button>
              <button data-year="2020">2020</button>
            </div>
          </div>

          <div class="cl-control-group" style="margin-top:10px;">
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

        <!-- TAB 2: Channels / Authors -->
        <div id="cl-subpanel-channels" class="cl-subpanel ${activeTab === "channels" ? "active" : ""}">
          <div class="cl-label" style="margin-bottom: 5px;">
            <span>Blocked ${channelLabelText} (<span id="chronolock-channel-count">0</span> active)</span>
          </div>
          <div class="chronolock-search-row">
            <input id="chronolock-channel-search" class="chronolock-search-input" type="text" placeholder="🔍 Search ${channelLabelText.toLowerCase()}..." />
          </div>
          <div class="chronolock-input-row">
            <input id="chronolock-channel-input" type="text" placeholder="Add ${channelSingleText.toLowerCase()} name..." />
            <button id="chronolock-channel-add">Add</button>
          </div>
          <div id="chronolock-channel-list" class="chronolock-list-box"></div>
        </div>

        <!-- TAB 3: Keywords -->
        <div id="cl-subpanel-keywords" class="cl-subpanel ${activeTab === "keywords" ? "active" : ""}">
          <div class="cl-label" style="margin-bottom: 5px;">
            <span>Blocked Keywords (<span id="chronolock-keyword-count">0</span> active)</span>
          </div>
          <div class="chronolock-search-row">
            <input id="chronolock-keyword-search" class="chronolock-search-input" type="text" placeholder="🔍 Search keywords..." />
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
      togglePanelVisibility();
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

    // Search inputs
    const channelSearch = ui.querySelector("#chronolock-channel-search");
    channelSearch?.addEventListener("input", (e) => {
      channelSearchQuery = e.target.value;
      syncControls(ui);
    });

    const keywordSearch = ui.querySelector("#chronolock-keyword-search");
    keywordSearch?.addEventListener("input", (e) => {
      keywordSearchQuery = e.target.value;
      syncControls(ui);
    });

    // Channel adding
    const channelInput = ui.querySelector("#chronolock-channel-input");
    const channelAddBtn = ui.querySelector("#chronolock-channel-add");
    function handleAddChannel() {
      if (channelInput && channelInput.value) {
        addBlockedChannel(channelInput.value);
        channelInput.value = "";
      }
    }
    channelAddBtn?.addEventListener("click", handleAddChannel);
    channelInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleAddChannel();
    });

    // Keyword adding
    const keywordInput = ui.querySelector("#chronolock-keyword-input");
    const keywordAddBtn = ui.querySelector("#chronolock-keyword-add");
    function handleAddKeyword() {
      if (keywordInput && keywordInput.value) {
        addBlockedKeyword(keywordInput.value);
        keywordInput.value = "";
      }
    }
    keywordAddBtn?.addEventListener("click", handleAddKeyword);
    keywordInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleAddKeyword();
    });
  }

  // ---------------------------
  // CARD / VIDEO / TWEET PARSING
  // ---------------------------

  function getItems() {
    if (isYouTube) {
      return Array.from(
        document.querySelectorAll(
          "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer"
        )
      );
    }
    if (isTwitter) {
      // Twitter / X tweet cards and user cells
      return Array.from(
        document.querySelectorAll('article[data-testid="tweet"]')
      );
    }
    return [];
  }

  function extractDateText(item) {
    if (isYouTube) {
      // 1. Check if metadata container has an "ago" or time string
      const metaLine = item.querySelector(
        "#metadata-line, #metadata, #inline-metadata, ytd-video-meta-block, .ytd-video-meta-block"
      );
      if (metaLine) {
        const txt = (metaLine.textContent || metaLine.innerText || "").trim();
        if (txt && /ago|streamed|yesterday|today|premier/i.test(txt)) {
          return txt;
        }
      }

      // 2. Check title link or thumbnail aria-label which often contains timestamps like "2 weeks ago"
      const titleLink = item.querySelector("#video-title-link, #video-title, a#thumbnail");
      const aria = titleLink?.getAttribute("aria-label");
      if (aria && /ago|streamed|yesterday|today|premier/i.test(aria)) {
        return aria;
      }

      return (item.textContent || item.innerText || "").trim();
    }

    if (isTwitter) {
      // Twitter <time datetime="2024-05-12T10:00:00.000Z">
      const timeEl = item.querySelector("time");
      if (timeEl) {
        const dt = timeEl.getAttribute("datetime");
        if (dt) return dt;
        return (timeEl.textContent || "").trim();
      }
      return (item.textContent || "").trim();
    }

    return "";
  }

  function getYear(text) {
    if (!text) return null;

    // Check ISO datetime format first (e.g. 2023-10-15T...)
    const isoMatch = text.match(/\b(200\d|201\d|202\d)-\d{2}-\d{2}/);
    if (isoMatch) {
      return parseInt(isoMatch[1], 10);
    }

    text = text.toLowerCase();
    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Years ago: e.g. "5y ago", "5 yr ago", "5 yrs ago", "5 years ago", "1 year ago", "a year ago"
    let m = text.match(/(\d+|an?)\s*(?:years?|yrs?|yr|y)\.?\s+ago/);
    if (m) {
      const num = (m[1] === "a" || m[1] === "an") ? 1 : parseInt(m[1], 10);
      return currentYear - num;
    }

    // 2. Sub-year units ago
    m = text.match(/(\d+|an?)\s*(?:months?|mths?|mth|mos?|mo|weeks?|wks?|wk|w|days?|d|hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\.?\s+ago/);
    if (m) {
      return currentYear;
    }

    // 3. Keywords indicating very recent
    if (text.includes("streamed") || text.includes("today") || text.includes("yesterday") || text.includes("just now") || text.includes("live")) {
      return currentYear;
    }

    // 4. Absolute 4-digit years (e.g. "Premiered Nov 12, 2017" or "Oct 24, 2021")
    m = text.match(/\b(200\d|201\d|202\d)\b/);
    if (m) {
      return parseInt(m[1], 10);
    }

    return null;
  }

  function extractItemDetails(item) {
    if (isYouTube) {
      let channelName = "";
      const channelEl = item.querySelector(
        "#channel-name, .ytd-channel-name, ytd-channel-name, #byline, .ytd-channel-name yt-formatted-string, #text.ytd-channel-name, #upload-info #channel-name"
      );
      if (channelEl) {
        channelName = (channelEl.textContent || channelEl.innerText || "").trim();
      }
      if (!channelName) {
        const chLink = item.querySelector("a[href*='/@'], a[href*='/channel/'], a[href*='/c/']");
        if (chLink) {
          channelName = (chLink.textContent || chLink.innerText || "").trim();
          if (!channelName && chLink.getAttribute("href")) {
            const href = chLink.getAttribute("href");
            const m = href.match(/\/(@[^\/?]+)/);
            if (m) channelName = m[1];
          }
        }
      }

      let contentTitle = "";
      const titleEl = item.querySelector("#video-title, #video-title-link, [id='video-title']");
      if (titleEl) {
        contentTitle = (titleEl.textContent || titleEl.innerText || titleEl.getAttribute("title") || "").trim();
      }

      const fullText = (item.textContent || item.innerText || "").trim();
      return { channelName, contentTitle, fullText };
    }

    if (isTwitter) {
      // Author handle & name
      let authorName = "";
      let authorHandle = "";

      const userEl = item.querySelector('[data-testid="User-Name"]');
      if (userEl) {
        const fullUserText = (userEl.textContent || "").trim();
        // Look for @handle
        const handleMatch = fullUserText.match(/@([\w_]+)/);
        if (handleMatch) {
          authorHandle = handleMatch[0]; // e.g. @username
          authorName = fullUserText.replace(handleMatch[0], "").split("·")[0].trim();
        } else {
          authorName = fullUserText.split("·")[0].trim();
        }
      }

      // Tweet text
      let tweetText = "";
      const tweetTextEl = item.querySelector('[data-testid="tweetText"]');
      if (tweetTextEl) {
        tweetText = (tweetTextEl.textContent || "").trim();
      }

      const fullText = (item.textContent || "").trim();
      const channelName = authorHandle || authorName;

      return {
        channelName,
        authorHandle,
        authorName,
        contentTitle: tweetText,
        fullText
      };
    }

    return { channelName: "", contentTitle: "", fullText: "" };
  }

  function attachBlockButton(item) {
    if (item.querySelector(".chronolock-block-btn")) return;

    if (!item.classList.contains("chronolock-card-relative")) {
      item.classList.add("chronolock-card-relative");
    }

    const btn = document.createElement("button");
    btn.className = "chronolock-block-btn";
    const btnLabel = isTwitter ? "Block Author" : "Block Channel";
    btn.title = `Block this ${isTwitter ? "author" : "channel"} in WebFilter`;
    btn.innerHTML = `🚫 <span>${btnLabel}</span>`;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      const details = extractItemDetails(item);
      const target = details.channelName || details.authorHandle || details.authorName;
      if (target) {
        addBlockedChannel(target);
      } else {
        const manual = prompt(`Block ${isTwitter ? "author (@handle or name)" : "channel name"}:`, "");
        if (manual) {
          addBlockedChannel(manual);
        }
      }
    });

    item.appendChild(btn);
  }

  function isBlockedByChannelOrKeyword(item) {
    const details = extractItemDetails(item);

    // 1. Check channel / author if channelFilterEnabled
    if (state.channelFilterEnabled && Array.isArray(state.blockedChannels) && state.blockedChannels.length > 0) {
      const activeChannels = state.blockedChannels.filter((c) => c.enabled);
      if (activeChannels.length > 0) {
        const chLower = (details.channelName || "").toLowerCase();
        const handleLower = (details.authorHandle || "").toLowerCase();
        const authorLower = (details.authorName || "").toLowerCase();

        for (const blocked of activeChannels) {
          const b = blocked.text.toLowerCase().trim();
          if (!b) continue;

          // Match without or with '@'
          const bClean = b.startsWith("@") ? b.slice(1) : b;
          const hClean = handleLower.startsWith("@") ? handleLower.slice(1) : handleLower;

          if (
            chLower === b || chLower.includes(b) ||
            (handleLower && (handleLower === b || hClean === bClean)) ||
            (authorLower && (authorLower === b || authorLower.includes(b)))
          ) {
            return true;
          }
        }
      }
    }

    // 2. Check keyword if keywordFilterEnabled
    if (state.keywordFilterEnabled && Array.isArray(state.blockedKeywords) && state.blockedKeywords.length > 0) {
      const activeKeywords = state.blockedKeywords.filter((k) => k.enabled);
      if (activeKeywords.length > 0) {
        const titleLower = (details.contentTitle || "").toLowerCase();
        const fullLower = (details.fullText || "").toLowerCase();

        for (const blocked of activeKeywords) {
          const b = blocked.text.toLowerCase().trim();
          if (b && (titleLower.includes(b) || fullLower.includes(b))) {
            return true;
          }
        }
      }
    }

    return false;
  }

  // ---------------------------
  // FILTERING
  // ---------------------------

  function resetItem(item) {
    item.classList.remove(
      "chronolock-hidden",
      "chronolock-dim",
      "chronolock-fade"
    );
  }

  function applyMode(item) {
    item.classList.remove(
      "chronolock-hidden",
      "chronolock-dim",
      "chronolock-fade"
    );

    if (state.mode === "dim") {
      item.classList.add("chronolock-dim");
    } else if (state.mode === "fade") {
      item.classList.add("chronolock-fade");
    } else {
      item.classList.add("chronolock-hidden");
    }
  }

  function runFilter() {
    const items = getItems();

    items.forEach((item) => {
      attachBlockButton(item);
      resetItem(item);

      // If master extension switch is off, do not filter anything
      if (!state.enabled) {
        return;
      }

      // Check custom channel & keyword blocklists
      if (isBlockedByChannelOrKeyword(item)) {
        applyMode(item);
        return;
      }

      // Check year cutoff (only if yearFilterEnabled is on)
      if (state.yearFilterEnabled) {
        const text = extractDateText(item);
        const year = getYear(text);

        if (year !== null && year > state.cutoffYear) {
          applyMode(item);
        }
      }
    });
  }

  // ---------------------------
  // FULLSCREEN HANDLER (YouTube)
  // ---------------------------

  function checkFullscreen() {
    const isFs = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      document.querySelector(".ytp-fullscreen, ytd-watch-flexy[fullscreen]")
    );

    document.body.classList.toggle("chronolock-fullscreen-hide", isFs);

    const ui = document.getElementById("chronolock-ui");
    if (ui) {
      if (isFs) {
        ui.style.setProperty("display", "none", "important");
      } else {
        ui.style.removeProperty("display");
      }
    }
  }

  document.addEventListener("fullscreenchange", checkFullscreen);
  document.addEventListener("webkitfullscreenchange", checkFullscreen);
  document.addEventListener("mozfullscreenchange", checkFullscreen);

  // ---------------------------
  // OBSERVER
  // ---------------------------

  let filterTimeout = null;

  function startObserver() {
    const observer = new MutationObserver(() => {
      clearTimeout(filterTimeout);
      filterTimeout = setTimeout(() => {
        if (isYouTube) checkFullscreen();
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
  // CROSS-CONTEXT SYNC & MESSAGES
  // ---------------------------

  // Handle messages from the extension toolbar button
  chrome.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "WEBFILTER_TOGGLE_UI") {
      togglePanelVisibility();
      sendResponse?.({ success: true, panelOpen });
      return;
    }

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
