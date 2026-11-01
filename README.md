# WEBFILTER

<p align="center">
  <img src="icons/chronolocklogo.png" width="200" />
</p>

A lightweight, modern browser extension (Manifest V3) for filtering YouTube videos by upload age, channels, and keywords.

WebFilter allows you to hide, dim, or fade videos newer than a selected cutoff year, while giving you granular control over blocked channels and keyword filtering. Built for nostalgia, intentional browsing, old internet archaeology, and resisting platform algorithmic pressure.

![WebFilter UI](screenshots/Screenshot1.png)

---

## Features

* **Manifest V3 Compliant**: Built for Chrome, Brave, Edge, Opera, and modern Firefox.
* **Master & Per-Feature Toggles**:
  * Toggle WebFilter globally on or off
  * Individually toggle Year cutoff filtering
  * Individually toggle Channel blocking
  * Individually toggle Keyword/phrase blocking
* **Year Cutoff Filtering**:
  * Filter videos newer than a chosen year (slider, numeric input, or quick presets: `'05`, `'07`, `2012`, `2016`, `2018`)
  * Three filtering modes:
    * **Hide** — removes videos entirely from layout
    * **Dim** — desaturates and lowers opacity
    * **Fade** — visually suppresses videos without removing layout space
* **Channel Blocking**:
  * Block specific channels directly from the in-page panel
  * Hover over any video card on YouTube to reveal a one-click **🚫 Block Channel** button
  * Manage blocked channels with removable chips
* **Keyword & Phrase Blocking**:
  * Block videos matching specific keywords in titles or metadata
  * Easily manage and remove keywords
* **Floating In-Page Glassmorphic Panel**: Sleek, collapsible interface directly on YouTube
* **No Telemetry, No Tracking, No Data Collection**

![WebFilter UI](screenshots/screenshot2.png)
![WebFilter UI](screenshots/screenshot3.png)

---

## Installation

### Chrome, Brave, Edge, Opera (Unpacked)

1. Open your browser and go to `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the root folder of this repository.
5. Open [YouTube](https://www.youtube.com) and the WebFilter control panel will appear in the lower-right corner.

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
