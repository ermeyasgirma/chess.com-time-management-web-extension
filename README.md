# chess.com-time-management-web-extension

Project overview, architecture notes, and local setup instructions for the Chess.com Time Manager extension.
The document starts with product direction, then outlines the planned structure, MVP scope, and current implementation.

A Chrome web extension to send a funny and loud reminder when Chess.com users are running low on time or spending too long on a move.

## Project Direction

The goal is to build a lightweight, privacy-friendly Chrome extension that helps Chess.com players improve time management. The extension should detect when it is the user's turn, track how long they spend on the current move, and trigger a configurable audio reminder once they exceed a chosen threshold.

This project should stay focused on time awareness only. It should not provide move suggestions, chess engine analysis, opponent evaluation, or anything that could be interpreted as cheating assistance.

## Recommended Technology

- **Chrome Manifest V3** for the extension platform.
- **TypeScript** for extension logic.
- **WXT** or **Plasmo** for scaffolding, local development, and builds.
- **React** only for popup/options UI if the UI grows beyond simple HTML.
- **Vitest** for unit tests around timer and warning behavior.
- **Playwright** later for browser-level extension testing.
- **No backend for the MVP**. Settings and audio should be local to the browser.

## Proposed Architecture

The extension should be split into a few clear areas:

- **Content script**: runs on Chess.com game pages, observes the page, detects turn changes, and tracks move duration.
- **Background service worker**: handles extension lifecycle, messaging, and shared coordination.
- **Popup UI**: quick controls such as enable/disable, threshold, volume, and test sound.
- **Options page**: expanded settings if needed later.
- **Shared modules**: settings, message types, constants, and pure timer logic.
- **Audio assets**: bundled local files or user-provided files only.

Suggested structure:

```text
chess.com-time-management-web-extension/
  package.json
  README.md
  LICENSE

  public/
    icons/
    audio/
      default-warning.mp3

  src/
    background/
      service-worker.ts

    content/
      chesscom-detector.ts
      turn-tracker.ts
      warning-controller.ts
      overlay.ts

    popup/
      Popup.tsx
      popup.css

    options/
      Options.tsx
      options.css

    offscreen/
      offscreen.html
      offscreen.ts

    shared/
      messages.ts
      settings.ts
      types.ts
      constants.ts

  tests/
    unit/
      turn-tracker.test.ts
      warning-controller.test.ts

    fixtures/
      chesscom-live-page.html

  docs/
    architecture.md
    privacy.md
    release-checklist.md
    security.md
```

## MVP Scope

The first version should aim to include:

- Detect active Chess.com live game pages.
- Detect when it is the user's turn.
- Start a timer for the current move.
- Play one bundled warning sound after a configurable threshold.
- Avoid repeated spam by using a cooldown per move.
- Provide popup settings for:
  - extension enabled/disabled
  - move-time warning threshold
  - volume
  - warning cooldown
  - test sound
- Store settings locally using Chrome extension storage.

## Important Product Notes

The original idea included a famous chess player, such as Hikaru or GothamChess, shouting at the user. That should not be shipped without explicit permission. Avoid using real names, branding, voice clips, likenesses, or impersonations unless the project has the legal right to do so.

Safer alternatives:

- Original voice recordings.
- Licensed audio packs.
- Generic funny voice prompts.
- User-uploaded local audio.
- Text-to-speech using generic voices, if allowed by the platform and store policies.

The extension should request the narrowest permissions possible. For the MVP, this likely means storage permissions and host access only for Chess.com pages.

## Development Priorities

1. Scaffold the Manifest V3 extension.
2. Implement the move timer and warning logic as pure modules.
3. Add unit tests for timer state changes and warning thresholds.
4. Wire the logic into a Chess.com content script.
5. Add popup settings.
6. Add visual and audio playback.
7. Test against real Chess.com live games and adjust DOM detection.

The most fragile part will likely be Chess.com page detection because the site's DOM can change. Keep that logic isolated in the detector module (`src/content/chesscom-detector.js` today, eventually `chesscom-detector.ts`) so it is easy to update.

## Current Implementation

The current MVP detects Chess.com live games, tracks user-turn move time, and can trigger visual and/or audio warnings as an unpacked Manifest V3 extension with no external dependencies.

Current files:

- `manifest.json`: loads the content scripts on Chess.com pages.
- `AGENTS.md`: quick orientation notes for future agentic development sessions.
- `public/icons/`: bundled extension icon assets in Chrome's expected sizes.
- `public/audio/warning.mp3`: bundled warning beep used by the audio warning path.
- `src/content/chesscom-detector.js`: isolated live-game detection logic.
- `src/content/chesscom-turn-detector.js`: conservative user-turn detection based on Chess.com clock evidence.
- `src/content/debug-overlay.js`: renders a small diagnostic panel on Chess.com pages.
- `src/content/live-game-content-script.js`: runs detection in the browser, watches DOM changes, updates timer/warning state, and publishes status changes.
- `src/content/warning-overlay.js`: renders the visual warning and plays the bundled audio warning when configured.
- `src/shared/debug-status.js`: formats diagnostic status rows for the debug overlay.
- `src/shared/move-timer.js`: pure state machine for tracking elapsed time on the user's current move.
- `src/shared/settings.js`: owns default settings, validation, Chrome storage persistence, and change watching.
- `src/shared/warning-controller.js`: pure warning decision logic for thresholds, cooldowns, and per-move warning limits.
- `src/shared/warning-output.js`: pure warning output logic for visual/audio modes and volume conversion.
- `src/popup/popup.html`: extension popup settings UI.
- `src/popup/popup.js`: saves and restores popup settings.
- `src/popup/popup.css`: styles the popup.
- `docs/privacy.md`: describes what data is processed and stored.
- `docs/release-checklist.md`: simple checklist for Chrome testing and packaging.
- `docs/security.md`: security risks and mitigations to keep in mind.
- `docs/asset-credits.md`: source and license notes for bundled icons and audio.
- `docs/manual-validation.md`: manual smoke-test flow for real Chess.com games.
- `docs/chrome-web-store.md`: Chrome Web Store draft copy and screenshot guidance.
- `tests/unit/chesscom-detector.test.js`: unit tests for URL and DOM detection behavior.
- `tests/unit/chesscom-turn-detector.test.js`: unit tests for user-turn detection heuristics.
- `tests/unit/debug-status.test.js`: unit tests for debug overlay status formatting.
- `tests/unit/move-timer.test.js`: unit tests for move timer transitions.
- `tests/unit/settings.test.js`: unit tests for settings defaults and form conversion.
- `tests/unit/warning-controller.test.js`: unit tests for warning threshold and cooldown behavior.
- `tests/unit/warning-output.test.js`: unit tests for warning output mode and volume behavior.

To test locally:

```bash
npm test
```

To try it in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose "Load unpacked".
4. Select this repository folder.
5. Open a Chess.com live game.
6. Click the extension icon to open the popup and change the warning threshold, warning output mode, or volume.
7. Click "Test sound" in the popup to confirm the bundled audio can play.
8. Enable "Show debug overlay" in the popup if you want to inspect extension state.
9. Click "Test warning" in the debug panel to confirm the configured warning output path works.
10. Check the page console for `[Chess Time Manager] Live game detection:` logs if deeper debugging is needed.

The content script also writes detection state onto the page root element:

```text
data-chess-time-manager-status="active-live-game"
data-chess-time-manager-is-live-game="true"
```

This initial slice uses plain JavaScript so the extension can be loaded directly before build tooling is introduced. When the project is scaffolded with WXT or Plasmo, the detector should be moved to TypeScript while keeping the same isolated module boundary.

## Debug Overlay

The extension can render a small debug overlay on Chess.com pages. It is disabled by default and can be enabled from the popup with "Show debug overlay". This is intended as a temporary development tool so each project stage can be checked manually while the extension is loaded.

The overlay currently shows:

- whether the extension scripts loaded
- whether the detector, timer, warning, and warning-output modules loaded
- whether the current page is on Chess.com
- live-game detection status
- board and clock evidence
- user-turn detection status
- move timer state
- latest warning decision
- threshold, cooldown, warning mode, and volume settings
- latest audio playback status
- module self-test status

The "Run self-test" button runs the timer and warning modules in the content-script context. It starts a synthetic move, advances it to the warning threshold, and verifies that the warning controller fires. This confirms the timer and warning stages work inside the loaded extension even before Chess.com-specific user-turn detection is implemented.

The "Test warning" button triggers the same configured warning output path used by real move-time warnings. This gives a simple manual smoke test even if you are not in an active game.

The debug overlay can be hidden with "Hide" and restored with the compact "CTM Debug" button.

## Popup Settings

The warning threshold defaults to 45 seconds. The extension popup lets the user:

- enable or disable warnings
- change the warning threshold in seconds
- choose visual + sound, sound only, or visual only output
- change warning sound volume
- test the bundled warning sound
- show or hide the debug overlay
- reset back to the defaults

Settings are stored with Chrome extension storage and are picked up by open Chess.com tabs without requiring a page reload. The debug overlay displays the currently active threshold, cooldown, output mode, and volume values.

## Turn Detection Integration

The extension now includes a Chess.com-specific turn detector. It uses conservative DOM evidence from the player's bottom clock and the opponent's top clock:

- bottom/player clock active: `user-turn-started`
- top/opponent clock active: `opponent-turn-started`
- game-over UI detected: `game-ended`
- no clear clock signal: `tick`
- no active live game: `reset`

`src/content/live-game-content-script.js` is the current integration layer. It combines:

- live-game detection
- turn detection
- move timer updates
- warning evaluation
- debug overlay state publishing

The integration publishes a `chess-time-manager:extension-state` event on the page document so the debug overlay can inspect every stage without owning the detection logic.

## Timer And Warning Logic

The current implementation keeps core timing behavior in pure modules and wires those modules into the Chess.com content script.

`src/shared/move-timer.js` tracks:

- whether it is currently the user's turn
- the current move id
- when the current turn started
- elapsed time for the current move
- duplicate start events for the same move, without resetting the timer
- transitions back to opponent turn, game over, or idle

`src/shared/warning-controller.js` decides whether a warning should fire from:

- the current timer state
- whether warnings are enabled
- the configured move-time threshold
- a global warning cooldown
- the maximum number of warnings allowed per move

The turn detection layer translates page state into simple timer events:

```text
user-turn-started
tick
user-turn-ended
game-ended
reset
```

The warning output path supports a visual banner, bundled audio playback, or both. Audio uses `public/audio/warning.mp3`, is controlled by the popup volume setting, and is exposed to Chess.com tabs through the narrow `web_accessible_resources` entry in `manifest.json`.

## Packaging

Run the tests before packaging:

```bash
npm test
```

Create a Chrome-ready zip from the current working tree:

```bash
npm run package:chrome
```

See `docs/release-checklist.md` and `docs/chrome-web-store.md` before uploading a build.
