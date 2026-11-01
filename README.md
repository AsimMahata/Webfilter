# WEBFILTER

<p align="center">
  <img src="icons/chronolocklogo.png" width="200" />
</p>

A lightweight, modern browser extension (Manifest V3) for filtering **YouTube** videos and **Twitter / X** tweets by upload age, channels/authors, and keywords.

WebFilter allows you to hide, dim, or fade items newer than a selected cutoff year, while giving you granular control over blocked channels/authors and keyword filtering. Built for nostalgia, intentional browsing, clean feeds, and resisting platform algorithmic pressure.

![WebFilter UI](screenshots/Screenshot1.png)

---

## Features

* **Manifest V3 Compliant**: Built for Chrome, Brave, Edge, Opera, and modern Firefox.
* **YouTube & Twitter / X Support**:
  * Seamlessly filters YouTube video feeds, shorts, search results, and recommendations.
  * Filters Twitter / X home feeds, timeline tweets, search results, and replies by tweet age, author (@handle or display name), and keywords.
* **Master & Per-Feature Toggles**:
  * Toggle WebFilter globally on or off
  * Individually toggle Year cutoff filtering
  * Individually toggle Channel / Author blocking
  * Individually toggle Keyword/phrase blocking
* **Granular Item Management & Live Search**:
  * **Search**: Real-time search filter in both channels/authors and keywords lists.
  * **Individual Item Toggles**: Disable or enable individual keywords or channels without deleting them.
  * **Delete**: Remove any item with a single click.
* **Click-to-Open Extension Icon**:
  * Clicking the pinned extension icon in your browser toolbar instantly toggles/opens the in-page WebFilter dock UI on YouTube and Twitter/X.
* **Year Cutoff Filtering**:
  * Filter items newer than a chosen year (slider, numeric input, or quick presets: `'06`, `2010`, `2015`, `2018`, `2020`)
  * Three filtering modes:
    * **Hide** — removes items entirely from layout
    * **Dim** — desaturates and lowers opacity
    * **Fade** — visually suppresses items without breaking layout space
* **Channel / Author Blocking**:
  * Block specific channels or Twitter authors directly from the in-page panel.
  * Hover over any video card or tweet to reveal a one-click **🚫 Block Channel / Block Author** button.
* **Keyword & Phrase Blocking**:
  * Block items matching specific keywords in titles, tweet text, or metadata.
* **Floating In-Page Glassmorphic Panel**: Sleek, collapsible interface directly on YouTube and Twitter/X. Automatically hides during fullscreen video playback on YouTube.
* **No Telemetry, No Tracking, No Data Collection**

![WebFilter UI](screenshots/screenshot2.png)
![WebFilter UI](screenshots/screenshot3.png)

---

## Installation

### Chrome, Brave, Edge, Opera (Unpacked)

1. Open your browser and go to `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the root folder of this repository (or your worktree folder).
5. Open [YouTube](https://www.youtube.com) or [Twitter / X](https://x.com) — the WebFilter control panel will appear in the lower-right corner. You can also click the extension toolbar icon at any time to open the panel!

---

### Firefox (Developer Mode / Temporary)

1. Open Firefox.
2. Navigate to:
   ```text
   about:debugging#/runtime/this-firefox
   ```
3. Click **Load Temporary Add-on**.
4. Select `manifest.json` inside the root folder.

---

## License

WebFilter is licensed under the MIT License. See [LICENSE](LICENSE) for details.

Copyright (c) 2026 Asim.
