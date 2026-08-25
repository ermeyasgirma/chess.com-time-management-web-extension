# Chess.com Time Manager

On my journey to improving at chess, my biggest hurdle has been and still is my poor time management, which is what inspired this project. Chess.com Time Manager is a lightweight Chrome extension that helps you avoid spending too long on a move during Chess.com live games. It detects when your clock appears active, tracks the current move locally, and gives you a configurable visual or audio reminder when you reach your chosen time limit.

You do not need to worry about your account being banned by Chess.com as this extension is for time awareness only. It does not suggest moves, analyze positions, evaluate opponents, or provide any other chess assistance, thus does not violate Chess.com's fair play policy which can be found here: https://www.chess.com/legal/fair-play

## Features

- Detects active Chess.com live games and when it appears to be your turn.
- Tracks how long you spend on the current move.
- Uses a configurable warning threshold, set to **45 seconds** by default.
- Shows a compact warning at the top center of the page without covering the board.
- Supports visual and sound, sound-only, or visual-only reminders.
- Includes adjustable warning volume and a test-sound button.
- Limits reminders to avoid repeated warning spam during the same move.
- Stores your settings with Chrome extension storage.
- Includes an optional debug overlay for troubleshooting.

## Install in Chrome

The extension is currently installed as an unpacked Chrome extension.

1. Download or clone this repository to your computer.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the repository folder containing `manifest.json`.
6. Pin **Chess.com Time Manager** from Chrome's Extensions menu if you want quick access to its settings.

If you update the extension files later, return to `chrome://extensions`, click the extension's **Reload** button, and refresh any open Chess.com tabs.

## How to Use

1. Click the Chess.com Time Manager icon in Chrome.
2. Choose your warning threshold, output mode, and sound volume.
3. Click **Save**.
4. Open or join a live game on [Chess.com](https://www.chess.com/).
5. When it is your turn, the extension starts tracking the time spent on that move.
6. If you reach your chosen threshold, the configured reminder appears or plays once for that move.

Use **Test sound** in the popup to check audio before starting a game. Setting a low threshold temporarily can make it easier to confirm that reminders are working.

## Settings

The extension popup provides these controls:

- **Enable warnings:** turns move-time reminders on or off.
- **Warning threshold:** sets how many seconds you can spend on a move before receiving a reminder.
- **Warning output:** selects visual and sound, sound only, or visual only.
- **Sound volume:** controls the volume of the bundled warning sound. Setting it to `0%` disables audio.
- **Show debug overlay:** displays local diagnostic information on Chess.com pages for troubleshooting.
- **Test sound:** plays the bundled warning sound using the current mode and volume.
- **Reset:** restores the defaults, including a 45-second threshold, visual and sound reminders, and `80%` volume.

Saved settings are applied to open Chess.com tabs without requiring a page reload.

## Privacy and Fair Play

Chess.com Time Manager runs locally in your browser.

- It does not collect, transmit, sell, or share personal data.
- It does not use a backend or make runtime network requests.
- It stores only extension settings through Chrome storage.
- It runs content scripts only on Chess.com pages.
- Its warning sound and icons are bundled with the extension.
- It does not provide move suggestions, engine analysis, position evaluation, opponent analysis, or game advice.

See the full [privacy policy](docs/privacy.md) and [security notes](docs/security.md) for more information.

## Technology

- Chrome Manifest V3
- Plain JavaScript with no build step
- HTML and CSS for the popup and warning interface
- Chrome Storage API for saved settings
- Shadow DOM for isolated on-page overlays
- Node.js built-in test runner for automated tests

The extension has no runtime dependencies and can be loaded directly from this repository.

## Project Structure

```text
chess.com-time-management-web-extension/
├── manifest.json       Chrome extension configuration
├── public/
│   ├── audio/          Bundled warning sound
│   └── icons/          Extension icons
├── src/
│   ├── content/        Chess.com detection and on-page warnings
│   ├── popup/          Extension settings popup
│   └── shared/         Settings, timer, and warning logic
├── tests/unit/         Automated unit tests
└── docs/               Privacy, security, validation, and release notes
```

## Troubleshooting

### The extension does not appear to run

- Confirm it is enabled at `chrome://extensions`.
- Click **Reload** on the extension and refresh the Chess.com tab.
- Confirm you opened a live game rather than an analysis or game-review page.

### The timer or warning does not activate

- Enable **Show debug overlay** in the popup.
- Confirm the overlay reports `active-live-game` and detects the board and clocks.
- Use **Run self-test** to check the timer and warning modules.
- Use **Test warning** to check the configured visual and audio output.

Chess.com can change its page structure, which may temporarily affect game or turn detection.

### The sound does not play

- Confirm the output mode includes sound and the volume is above `0%`.
- Click **Test sound** from the extension popup.
- Interact with the Chess.com page before testing again, since Chrome may block audio before a page has received user interaction.

## Additional Information

- [Manual validation guide](docs/manual-validation.md)
- [Chrome Web Store notes](docs/chrome-web-store.md)
- [Asset credits](docs/asset-credits.md)
- [Release checklist](docs/release-checklist.md)
- [License](LICENSE)
