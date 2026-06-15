# Chrome Web Store Notes

This document keeps the store-facing release details in one place.

## Single-Purpose Description

Chess.com Time Manager helps players manage move time during Chess.com live games. It detects when the user's clock appears active, tracks the current move duration locally, and triggers a configurable visual and/or audio reminder after the chosen threshold.

## Short Description Draft

Configurable move-time reminders for Chess.com live games.

## Longer Description Draft

Chess.com Time Manager is a lightweight reminder extension for players who spend too long on individual moves. During Chess.com live games, it watches local page state to detect when it appears to be your turn, starts a move timer, and warns you after your chosen threshold.

Features:

- configurable warning threshold
- visual + sound, sound only, or visual only reminders
- configurable warning volume
- local settings storage
- optional debug overlay for development and troubleshooting

This extension does not provide chess engine analysis, move suggestions, opponent evaluation, or game advice. It is only a time-management reminder.

## Privacy Summary Draft

The extension runs locally in the browser. It does not collect, transmit, sell, or share personal data. It stores settings using Chrome extension storage and runs content scripts only on Chess.com pages.

## Screenshot Checklist

Capture screenshots after loading the unpacked extension:

- popup with default settings
- popup showing the warning output and volume controls
- Chess.com page with debug overlay enabled
- test warning visible on a Chess.com page

Before taking screenshots, avoid showing private Chess.com account details, chat messages, or opponent-identifying information.

## Package Command

Build the upload zip from the current working tree:

```bash
npm run package:chrome
```

Upload `chess-time-manager.zip` to the Chrome Web Store draft.

## Store Review Notes

- Requested permissions should stay limited to `storage` and Chess.com content-script host access.
- The bundled audio file is local and credited in `docs/asset-credits.md`.
- The extension should not include famous-player voices, names, likenesses, or implied endorsements.
- The listing should describe the extension as a time reminder, not a chess assistant.
