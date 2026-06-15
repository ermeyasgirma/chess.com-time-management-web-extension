# Manual Validation

Use this checklist when testing the unpacked extension in Chrome.

## Before Testing

- Run `npm test`.
- Open `chrome://extensions`.
- Enable Developer mode.
- Click "Load unpacked" and select the repository folder.
- After code changes, click the extension reload button in `chrome://extensions`.

## Popup Smoke Test

- Open the extension popup.
- Confirm warnings are enabled by default.
- Confirm the threshold defaults to `15` seconds.
- Change "Warning output" between "Visual + sound", "Sound only", and "Visual only".
- Move the volume slider and confirm the sound status updates.
- Click "Test sound" and confirm the bundled beep plays when sound is enabled.
- Set output to "Visual only" and confirm "Test sound" reports that sound is off.
- Reset defaults and confirm output returns to "Visual + sound" at `80%` volume.

## Chess.com Page Smoke Test

- Open a Chess.com page that is not a live game and confirm no warning fires.
- Open a live Chess.com game.
- Enable "Show debug overlay" in the popup.
- Confirm the debug overlay reports:
  - extension modules loaded
  - live-game detection state
  - user-turn detection state
  - timer state
  - warning mode and audio volume
- Click "Run self-test" and confirm the module self-test passes.
- Click "Test warning" and confirm the configured output path runs.

## Real Game Timing Test

- Set the warning threshold to a low value such as `3` seconds.
- Start or join a live Chess.com game.
- Wait for your turn and avoid moving until the threshold is crossed.
- Confirm a warning fires once for the move.
- Make a move and confirm the timer resets on the opponent's turn.
- On your next turn, confirm the timer starts again.
- Set output to "Sound only" and confirm the visual banner does not show.
- Set output to "Visual only" and confirm audio does not play.

## Known Manual Checks

- Browser audio can be blocked if Chrome decides the page has no user activation. This is unlikely during a real game because the user interacts with the board, but validate it before release.
- Chess.com DOM selectors can change. If live-game or turn detection looks wrong, start with `src/content/chesscom-detector.js` and `src/content/chesscom-turn-detector.js`.
- Do not validate with engine analysis, move suggestions, or any behavior that changes the product boundary from time reminders.
