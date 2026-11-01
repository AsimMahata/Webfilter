const DEFAULT_STATE = {
  enabled: true,
  cutoffYear: 2018,
  mode: "hidden"
};

async function getState() {
  try {
    const res = await chrome.storage.sync.get("chronolock");
    if (res?.chronolock) return { ...DEFAULT_STATE, ...res.chronolock };
  } catch (e) {
    try {
      const localRes = await chrome.storage.local.get("chronolock");
      if (localRes?.chronolock) return { ...DEFAULT_STATE, ...localRes.chronolock };
    } catch (_) {}
  }
  return { ...DEFAULT_STATE };
}

async function saveState(state) {
  try {
    await chrome.storage.sync.set({ chronolock: state });
  } catch (e) {
    try {
      await chrome.storage.local.set({ chronolock: state });
    } catch (_) {}
  }
}

function updateBadge(enabled, tabId) {
  const text = enabled ? "ON" : "OFF";
  const color = enabled ? "#34a853" : "#757575";

  if (tabId) {
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color, tabId });
  } else {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
  }
}

// Set badge and auto-inject into existing YouTube tabs on install
chrome.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  updateBadge(state.enabled);

  try {
    const tabs = await chrome.tabs.query({
      url: ["*://*.youtube.com/*", "*://youtube.com/*"]
    });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        }).catch(() => {});
      }
    }
  } catch (e) {
    // Ignore permissions/tab errors
  }
});

// Update badge when storage changes anywhere
chrome.storage.onChanged.addListener((changes, area) => {
  if (changes.chronolock?.newValue) {
    updateBadge(Boolean(changes.chronolock.newValue.enabled));
  }
});

// Handle clicking the extension icon in Chrome toolbar
chrome.action.onClicked.addListener(async (tab) => {
  const state = await getState();
  state.enabled = !state.enabled;

  await saveState(state);
  updateBadge(state.enabled);

  const isYouTube = tab?.url && (
    tab.url.includes("youtube.com") ||
    tab.url.startsWith("https://www.youtube.com") ||
    tab.url.startsWith("https://youtube.com")
  );

  if (isYouTube && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: "CHRONOLOCK_TOGGLE",
      state
    }).catch(() => {
      // Content script may not be loaded yet, inject it
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }).catch(() => {});
    });
  } else if (!isYouTube) {
    // Open YouTube if user clicked toolbar icon while on another site
    chrome.tabs.create({ url: "https://www.youtube.com" });
  }
});
