# Neuro Exam Toolkit — GitHub Pages PWA

## Android install

Open the GitHub Pages URL in Chrome. Once Chrome recognizes the PWA, use **Install app** from Chrome's menu or the install control shown by Chrome. The app opens in a standalone window after installation.

## iPhone / iPad install

Open the GitHub Pages URL in Safari, tap **Share → Add to Home Screen**, leave **Open as Web App** enabled, then tap **Add**.

## Offline behavior

- The complete app UI, maneuver catalog, glossary, favorites logic, settings, and built-in interactive tools are cached locally by `service-worker.js`.
- Favorites and settings use browser `localStorage` and remain on that device/browser until its site data is cleared.
- The app requests persistent browser storage when the browser supports it; browsers still retain ultimate control over storage eviction.
- The official NINDS NIHSS PDF and Wikimedia Ishihara plates are prefetched/cached best-effort while online. Use **Settings → App & offline → Prepare validated stimuli for offline use** once after deployment.
- External literature links are not copied into the app and require internet access.
- Camera/torch capability depends on the browser/device and is most reliable when the app is served over HTTPS rather than opened as a local `file://` file.

## Updating the app

Whenever you replace `index.html` or other app assets, increment the cache names near the top of `service-worker.js`, e.g.:

`neuro-exam-toolkit-app-v1` → `neuro-exam-toolkit-app-v2`

and likewise for the validated resource cache if that list changes. This ensures installed copies discard stale cached files.

## Privacy

The app has no backend and sends no saved favorites/settings to a server. Do not add patient identifiers or PHI to local app features without a separate security/privacy design review.
