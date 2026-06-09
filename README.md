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

1. Scaffold the Manifest V3 TypeScript extension.
2. Implement the move timer and warning logic as pure TypeScript modules.
3. Add unit tests for timer state changes and warning thresholds.
4. Wire the logic into a Chess.com content script.
5. Add popup settings.
6. Add audio playback.
7. Test against real Chess.com live games and adjust DOM detection.

The most fragile part will likely be Chess.com page detection because the site's DOM can change. Keep that logic isolated in the detector module (`src/content/chesscom-detector.js` today, eventually `chesscom-detector.ts`) so it is easy to update.

## Current Implementation

The first implementation slice detects Chess.com live games as an unpacked Manifest V3 extension with no external dependencies.

Current files:

- `manifest.json`: loads the content scripts on Chess.com pages.
- `src/content/chesscom-detector.js`: isolated live-game detection logic.
- `src/content/live-game-content-script.js`: runs detection in the browser, watches DOM changes, and publishes status changes.
- `src/shared/move-timer.js`: pure state machine for tracking elapsed time on the user's current move.
- `src/shared/warning-controller.js`: pure warning decision logic for thresholds, cooldowns, and per-move warning limits.
- `tests/unit/chesscom-detector.test.js`: unit tests for URL and DOM detection behavior.
- `tests/unit/move-timer.test.js`: unit tests for move timer transitions.
- `tests/unit/warning-controller.test.js`: unit tests for warning threshold and cooldown behavior.

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
6. Check the page console for `[Chess Time Manager] Live game detection:` logs.

The content script also writes detection state onto the page root element:

```text
data-chess-time-manager-status="active-live-game"
data-chess-time-manager-is-live-game="true"
```

This initial slice uses plain JavaScript so the extension can be loaded directly before build tooling is introduced. When the project is scaffolded with WXT or Plasmo, the detector should be moved to TypeScript while keeping the same isolated module boundary.

## Timer And Warning Logic

The second implementation slice adds the core timing behavior without wiring it to Chess.com yet.

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

The next implementation step should be Chess.com-specific user-turn detection. That layer should translate page state into simple timer events such as:

```text
user-turn-started
tick
user-turn-ended
game-ended
reset
```
