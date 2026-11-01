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
    cutoffYear: 2018,
    mode: "hidden", // hidden | dim | fade
    blockedChannels: [],
    blockedKeywords: []
  };

  let panelOpen = false;

  function normalizeState() {
    if (typeof state.cutoffYear !== "number" || isNaN(state.cutoffYear)) {
      state.cutoffYear = 2018;
    }
    if (typeof state.enabled !== "boolean") {
      state.enabled = true;
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
    bottom: 16px;
    right: 16px;
    z-index: 99999999;

    width: 260px;

    padding: 12px;
    border-radius: 14px;

    font-size: 12px;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;

    color: rgba(255,255,255,0.92);

    background: rgba(25, 25, 25, 0.78);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    border: 1px solid rgba(255,255,255,0.18);

    box-shadow:
      0 10px 30px rgba(0,0,0,0.6),
      inset 0 1px 0 rgba(255,255,255,0.1);
  }

  #chronolock-toggle {
    cursor: pointer;
    user-select: none;

    padding: 10px;
    border-radius: 12px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    font-weight: 650;
    letter-spacing: 0.06em;

    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  #chronolock-toggle:hover {
    background: rgba(255,255,255,0.14);
    border-color: rgba(255,255,255,0.25);
  }

  #chronolock-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(255,255,255,0.1);
  }

  #chronolock-status-badge:hover {
    background: rgba(255,255,255,0.2);
  }

  #chronolock-panel {
    margin-top: 10px;
  }

  .chronolock-section {
    margin-top: 10px;
    text-align: center;
    font-weight: 500;
  }

  .chronolock-presets {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .chronolock-mode-wrap {
    display: flex;
    justify-content: center;
    margin-top: 6px;
  }

  #chronolock-mode {
    width: 130px;
  }

  #chronolock-panel button {
    cursor: pointer;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.08);
    color: inherit;
    padding: 5px 10px;
    transition: background 0.15s ease;
  }

  #chronolock-panel button:hover {
    background: rgba(255,255,255,0.16);
  }

  #chronolock-panel input,
  #chronolock-panel select {
    background: rgba(0,0,0,0.35);
    color: white;
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 8px;
    padding: 5px;
    outline: none;
  }

  #chronolock-enable {
    font-weight: 600;
    font-size: 12px;
    padding: 8px 12px !important;
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
    background: rgba(18, 18, 18, 0.88);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 11px;
    font-family: system-ui, -apple-system, sans-serif;
    cursor: pointer;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    transition: background 0.15s ease, transform 0.15s ease;
    white-space: nowrap;
    pointer-events: auto;
  }

  .chronolock-block-btn:hover {
    background: rgba(220, 38, 38, 0.9);
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

  /* Block list chips & inputs */
  .chronolock-list-box {
    max-height: 80px;
    overflow-y: auto;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    padding: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 5px;
    scrollbar-width: thin;
  }

  .chronolock-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(255,255,255,0.12);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    color: #e0e0e0;
    max-width: 100%;
    word-break: break-all;
  }

  .chronolock-chip span.remove-chip {
    cursor: pointer;
    font-weight: bold;
    color: #ef9a9a;
    margin-left: 2px;
  }

  .chronolock-chip span.remove-chip:hover {
    color: #ff5252;
  }

  .chronolock-input-row {
    display: flex;
    gap: 4px;
    margin-top: 6px;
  }

  .chronolock-input-row input {
    flex: 1;
    font-size: 11px;
  }

  .chronolock-input-row button {
    padding: 4px 8px !important;
    font-size: 11px;
  }
  `;
  (document.head || document.documentElement).appendChild(style);

  // ---------------------------
  // UI
  // ---------------------------

  function updateToggleText(ui) {
    if (!ui) ui = document.getElementById("chronolock-ui");
    if (!ui) return;

    const toggle = ui.querySelector("#chronolock-toggle");
    if (!toggle) return;

    toggle.innerHTML = `
      <span id="chronolock-status-badge" title="Click to toggle filter on/off">
        ${state.enabled ? "🔒" : "🔓"} ${state.cutoffYear}
      </span>
      <span style="opacity:0.9; font-weight:600; letter-spacing:0.12em;" title="Click to open/close settings">
        CHRONOLOCK
      </span>
    `;

    // Clicking status badge specifically toggles on/off directly
    const badge = toggle.querySelector("#chronolock-status-badge");
    badge?.addEventListener("click", (e) => {
      e.stopPropagation();
      state.enabled = !state.enabled;
      updateAllUI();
      saveState();
      runFilter();
    });
  }

  function updateEnableBtn(ui) {
    if (!ui) ui = document.getElementById("chronolock-ui");
    if (!ui) return;

    const btn = ui.querySelector("#chronolock-enable");
    if (!btn) return;

    if (state.enabled) {
      btn.textContent = "🟢 Enabled (Click to Turn Off)";
      btn.style.background = "rgba(46, 125, 50, 0.4)";
      btn.style.borderColor = "rgba(76, 175, 80, 0.6)";
      btn.style.color = "#a5d6a7";
    } else {
      btn.textContent = "🔴 Disabled (Click to Turn On)";
      btn.style.background = "rgba(198, 40, 40, 0.4)";
      btn.style.borderColor = "rgba(239, 83, 80, 0.6)";
      btn.style.color = "#ef9a9a";
    }
  }

  function renderChipList(containerId, countId, items, onRemove) {
    const container = document.getElementById(containerId);
    const countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = items.length;
    if (!container) return;

    container.innerHTML = "";
    if (items.length === 0) {
      container.innerHTML = `<span style="opacity:0.5; font-size:11px; padding:2px 4px;">None</span>`;
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

    const slider = ui.querySelector("#chronolock-slider");
    const input = ui.querySelector("#chronolock-input");
    const mode = ui.querySelector("#chronolock-mode");

    if (slider) slider.value = state.cutoffYear;
    if (input) input.value = state.cutoffYear;
    if (mode) mode.value = state.mode;

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
  }

  function updateAllUI() {
    const ui = document.getElementById("chronolock-ui");
    if (!ui) return;
    updateToggleText(ui);
    updateEnableBtn(ui);
    syncControls(ui);
  }

  function createUI() {
    if (document.getElementById("chronolock-ui")) return;

    normalizeState();

    const ui = document.createElement("div");
    ui.id = "chronolock-ui";

    ui.innerHTML = `
      <div id="chronolock-toggle"></div>

      <div id="chronolock-panel" style="display:none;">

        <div class="chronolock-section">
          Cutoff Year
        </div>

        <div style="display:flex; gap:6px; align-items:center; margin-top:6px;">
          <input id="chronolock-slider"
            type="range"
            min="2005"
            max="2026"
            style="flex:1;"
          />

          <input id="chronolock-input"
            type="number"
            min="2005"
            max="2026"
            style="width:70px;"
          />
        </div>

        <div class="chronolock-section">
          Presets
          <div class="chronolock-presets">
            <button data-year="2005">05'</button>
            <button data-year="2007">07'</button>
            <button data-year="2012">2012</button>
            <button data-year="2016">2016</button>
            <button data-year="2018">2018</button>
          </div>
        </div>

        <div class="chronolock-section">
          Mode
          <div class="chronolock-mode-wrap">
            <select id="chronolock-mode">
              <option value="hidden">Hide</option>
              <option value="dim">Dim</option>
              <option value="fade">Fade</option>
            </select>
          </div>
        </div>

        <div class="chronolock-section" style="margin-top:12px; text-align:left;">
          <div style="font-weight:600; margin-bottom:4px; display:flex; justify-content:space-between;">
            <span>Blocked Channels</span>
            <span id="chronolock-channel-count" style="opacity:0.7;">0</span>
          </div>
          <div class="chronolock-input-row">
            <input id="chronolock-channel-input" type="text" placeholder="Channel name..." />
            <button id="chronolock-channel-add">Add</button>
          </div>
          <div id="chronolock-channel-list" class="chronolock-list-box"></div>
        </div>

        <div class="chronolock-section" style="margin-top:10px; text-align:left;">
          <div style="font-weight:600; margin-bottom:4px; display:flex; justify-content:space-between;">
            <span>Blocked Keywords</span>
            <span id="chronolock-keyword-count" style="opacity:0.7;">0</span>
          </div>
          <div class="chronolock-input-row">
            <input id="chronolock-keyword-input" type="text" placeholder="Keyword or phrase..." />
            <button id="chronolock-keyword-add">Add</button>
          </div>
          <div id="chronolock-keyword-list" class="chronolock-list-box"></div>
        </div>

        <div style="margin-top:12px;">
          <button id="chronolock-enable" style="width:100%;">
            Toggle
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(ui);

    const toggle = ui.querySelector("#chronolock-toggle");
    const panel = ui.querySelector("#chronolock-panel");
    const slider = ui.querySelector("#chronolock-slider");
    const input = ui.querySelector("#chronolock-input");
    const mode = ui.querySelector("#chronolock-mode");
    const enableBtn = ui.querySelector("#chronolock-enable");

    updateToggleText(ui);
    updateEnableBtn(ui);
    syncControls(ui);

    // Clicking the header bar toggles the dropdown settings panel open/close
    toggle.addEventListener("click", () => {
      panelOpen = !panelOpen;
      panel.style.display = panelOpen ? "block" : "none";
    });

    // In-panel toggle button explicitly toggles filtering on/off
    enableBtn.addEventListener("click", () => {
      state.enabled = !state.enabled;
      updateAllUI();
      saveState();
      runFilter();
    });

    slider.addEventListener("input", (e) => {
      state.cutoffYear = parseInt(e.target.value, 10);
      syncControls(ui);
      updateToggleText(ui);
      saveState();
      runFilter();
    });

    input.addEventListener("input", (e) => {
      state.cutoffYear = parseInt(e.target.value, 10);
      syncControls(ui);
      updateToggleText(ui);
      saveState();
      runFilter();
    });

    ui.querySelectorAll("button[data-year]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.cutoffYear = parseInt(btn.dataset.year, 10);
        syncControls(ui);
        updateToggleText(ui);
        saveState();
        runFilter();
      });
    });

    mode.addEventListener("change", (e) => {
      state.mode = e.target.value;
      saveState();
      runFilter();
    });

    const channelInput = ui.querySelector("#chronolock-channel-input");
    const channelAddBtn = ui.querySelector("#chronolock-channel-add");
    const keywordInput = ui.querySelector("#chronolock-keyword-input");
    const keywordAddBtn = ui.querySelector("#chronolock-keyword-add");

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
    if ((!state.blockedChannels || state.blockedChannels.length === 0) &&
        (!state.blockedKeywords || state.blockedKeywords.length === 0)) {
      return false;
    }

    const details = extractVideoDetails(v);
    const chLower = (details.channelName || "").toLowerCase();
    const titleLower = (details.videoTitle || "").toLowerCase();
    const fullLower = (details.fullText || "").toLowerCase();

    // Check channel
    if (chLower && state.blockedChannels.length > 0) {
      for (const blocked of state.blockedChannels) {
        const b = blocked.toLowerCase().trim();
        if (b && (chLower === b || chLower.includes(b))) {
          return true;
        }
      }
    }

    // Check keyword against video title and full card text
    if (state.blockedKeywords.length > 0) {
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

      if (!state.enabled) {
        return;
      }

      // Check custom channel & keyword blocklists
      if (isBlockedByChannelOrKeyword(v)) {
        applyMode(v);
        return;
      }

      // Check year cutoff
      const text = extractVideoDateText(v);
      const year = getYear(text);

      if (year !== null && year > state.cutoffYear) {
        applyMode(v);
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
