const DEFAULT_STATE = {
  enabled: true,
  yearFilterEnabled: true,
  channelFilterEnabled: true,
  keywordFilterEnabled: true,
  cutoffYear: 2018,
  mode: "hidden",
  blockedChannels: [],
  blockedKeywords: []
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

const MATCHED_URLS = [
  "*://*.youtube.com/*",
  "*://youtube.com/*",
  "*://*.twitter.com/*",
  "*://twitter.com/*",
  "*://*.x.com/*",
  "*://x.com/*"
];

function isSupportedUrl(url) {
  if (!url) return false;
  return (
    url.includes("youtube.com") ||
    url.includes("twitter.com") ||
    url.includes("x.com")
  );
}

// Set badge and auto-inject into existing supported tabs on install
chrome.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  updateBadge(state.enabled);

  try {
    const tabs = await chrome.tabs.query({ url: MATCHED_URLS });
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
// Now: Opens/toggles the WebFilter dock UI on the current tab (YouTube or Twitter/X)
chrome.action.onClicked.addListener(async (tab) => {
  const state = await getState();

  if (tab?.id && isSupportedUrl(tab.url)) {
    chrome.tabs.sendMessage(tab.id, {
      type: "WEBFILTER_TOGGLE_UI",
      state
    }).catch(() => {
      // Content script may not be loaded yet; inject it and retry opening UI
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {
            type: "WEBFILTER_TOGGLE_UI",
            state
          }).catch(() => {});
        }, 150);
      }).catch(() => {});
    });
  } else {
    // If clicked on another site or empty tab, open YouTube as default
    chrome.tabs.create({ url: "https://www.youtube.com" });
  }
});
