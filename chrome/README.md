# WebFilter (Chrome / Chromium Edition)

<p align="center">
  <img src="icons/chronolocklogo.png" width="160" />
</p>

A lightweight extension for filtering YouTube videos by upload age, channels, and keywords, ported for Google Chrome and Chromium browsers (Manifest V3).

WebFilter allows you to hide, dim, or fade videos newer than a selected cutoff year, reshape YouTube, block unwanted channels, and filter keyword topics.

---

## Features

* **Manifest V3 Compliant**: Built to meet modern Chrome extension standards.
* **Master & Per-Feature Toggles**:
  * Global WebFilter toggle
  * Independent Year cutoff filter toggle
  * Independent Channel block toggle
  * Independent Keyword block toggle
* **Filter by Year**: Hide, dim, or fade videos newer than a selected cutoff year.
* **Channel Blocking**: Block channels via the panel or via the on-hover video card **🚫 Block Channel** button.
* **Keyword Blocking**: Filter out videos containing specific words or phrases.
* **Three Filter Modes**:
  * **Hide** — completely removes filtered videos from the layout
  * **Dim** — desaturates and lowers opacity
  * **Fade** — suppresses videos visually while keeping layout space
* **Floating In-Page Glassmorphic Panel**: Sleek, collapsible control widget directly on YouTube.
* **Sync Storage**: Settings persist seamlessly using `chrome.storage.sync` with local fallback.
* **Zero Bloat & Zero Telemetry**: Lightweight vanilla JavaScript with no tracking, external scripts, or build tools required.

---

## Installation (Chrome, Brave, Edge, Opera)

1. Open Google Chrome (or any Chromium-based browser).
2. Navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select this `chrome` directory (containing `manifest.json`, `content.js`, and `icons/`).
6. Navigate to [YouTube](https://www.youtube.com) and you will see the WebFilter floating widget in the lower right corner.

---

## License

WebFilter is licensed under the MIT License.
