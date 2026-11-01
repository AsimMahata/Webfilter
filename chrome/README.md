# ChronoLock (Chrome / Chromium Edition)

<p align="center">
  <img src="icons/chronolocklogo.png" width="160" />
</p>

A lightweight extension for filtering YouTube videos by upload age, ported for Google Chrome and Chromium browsers (Manifest V3).

ChronoLock allows you to hide, dim, or fade videos newer than a selected cutoff year, reshaping YouTube into something slower, stranger, and more archival.

---

## Features

* **Manifest V3 Compliant**: Built to meet modern Chrome extension standards.
* **Filter by Year**: Hide, dim, or fade videos newer than a selected cutoff year.
* **Three Filter Modes**:
  * **Hide** — completely removes newer videos from the layout
  * **Dim** — desaturates and lowers opacity
  * **Fade** — suppresses videos visually while keeping layout space
* **Floating In-Page Control**: Sleek, glassmorphic floating control widget directly on YouTube.
* **Sync Storage**: Settings persist seamlessly using `chrome.storage.sync`.
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
6. Navigate to [YouTube](https://www.youtube.com) and you will see the ChronoLock floating widget in the lower right corner.

---

## License

ChronoLock is licensed under the MIT License.
