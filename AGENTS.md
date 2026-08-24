# Agent Notes

This file gives future coding agents the minimum context needed to work on the project quickly.

## Product Boundary

Chess.com Time Manager is a time-management reminder for Chess.com live games. It must not provide move suggestions, engine analysis, opponent evaluation, or anything that could be interpreted as chess assistance.

Do not add famous-player voices, names, likenesses, or implied endorsements unless explicit rights have been granted.

## Current Architecture

- Manifest V3 Chrome extension with no build step.
- Plain JavaScript is intentional for now so the repo can be loaded directly as an unpacked extension.
- `manifest.json` loads content scripts on Chess.com pages.
- `src/content/chesscom-detector.js` detects active live-game pages.
- `src/content/chesscom-turn-detector.js` detects whether the player clock appears active.
- `src/content/live-game-content-script.js` integrates page detection, turn detection, timer updates, and warning decisions.
- `src/content/warning-overlay.js` owns visual/audio warning output.
- `src/content/debug-overlay.js` owns the optional diagnostic panel.
- `src/shared/settings.js` owns persisted settings and validation.
- `src/shared/move-timer.js`, `src/shared/warning-controller.js`, and `src/shared/warning-output.js` are pure modules covered by unit tests.
- `src/popup/` contains the popup HTML/CSS/JS for user settings.

## Important Settings

Defaults live in `src/shared/settings.js`:

- warnings enabled
- debug overlay disabled
- warning mode `visual-and-audio`
- warning volume `80%`
- move threshold `45s`
- cooldown `8s`
- max warnings per move `1`

Existing stored settings may not have newer keys, so keep `normalizeSettings` backward-compatible.

## Testing

Run:

```bash
npm test
```

Manual validation is documented in `docs/manual-validation.md`. Release/package notes are in `docs/release-checklist.md` and `docs/chrome-web-store.md`.

## Extension Loading

To test manually:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load this repository as an unpacked extension.
4. Reload the extension after edits.
5. Open Chess.com and use the popup/debug overlay to validate behavior.

## Security And Privacy Rules

- Keep permissions narrow: storage plus Chess.com content-script access.
- Do not add a backend for the MVP.
- Do not add runtime network requests.
- Keep audio and icons bundled locally.
- Use `textContent`/DOM APIs rather than injecting raw HTML.
- Keep `web_accessible_resources` scoped to the specific bundled assets needed on Chess.com.

## Common Change Areas

- If Chess.com detection breaks, start in `src/content/chesscom-detector.js` and `src/content/chesscom-turn-detector.js`.
- If a warning fires too often or not enough, start in `src/shared/warning-controller.js`.
- If the output mode or volume behaves incorrectly, start in `src/shared/warning-output.js` and `src/content/warning-overlay.js`.
- If settings do not persist or existing users lose defaults, start in `src/shared/settings.js`.
