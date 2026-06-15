# Security Notes

This document tracks practical security concerns for the project.

## Current Security Posture

- The extension has no backend.
- The extension makes no network requests.
- Settings are stored with Chrome extension storage.
- Content scripts are limited to Chess.com host matches.
- UI is rendered with DOM APIs and `textContent`, not raw HTML injection.
- Warning audio is bundled locally and exposed only to Chess.com matches through `web_accessible_resources`.

## Main Risks

### Chess.com DOM Fragility

Turn detection depends on Chess.com DOM selectors and class names. If these change, the extension may fail to warn or may warn at the wrong time.

Mitigation:

- keep detection isolated in `src/content/chesscom-turn-detector.js`
- keep the debug overlay available for manual validation
- test against real live games before release

### Overbroad Permissions

Adding broad host permissions would increase review and privacy risk.

Mitigation:

- keep host access scoped to Chess.com
- document any new permission before adding it

### Remote Code Or Assets

Remote scripts or remote audio assets would increase supply-chain and privacy risk.

Mitigation:

- bundle extension code locally
- bundle or user-provide audio files
- avoid remote execution and remote asset loading

### Web Accessible Audio

The bundled MP3 must be web-accessible so a content script can play it on Chess.com pages.

Mitigation:

- expose only `public/audio/warning.mp3`
- scope matches to Chess.com only
- do not make broad asset directories web-accessible

### User Trust And Store Policy

The extension must not provide chess assistance during games.

Mitigation:

- do not add engine evaluation
- do not suggest moves
- do not analyze opponent behavior
- describe the extension as a time-management reminder only

### Intellectual Property

Famous-player voices, names, likenesses, or branded clips may create IP, publicity-rights, or impersonation issues.

Mitigation:

- use original or licensed audio
- avoid implying endorsement
- avoid celebrity voice cloning

### Debug UI Exposure

The debug overlay shows local detection state on the page and may be distracting or confusing in normal use.

Mitigation:

- keep debug overlay disabled by default
- gate debug visibility behind the popup setting
- hide debug controls before any public release if needed
