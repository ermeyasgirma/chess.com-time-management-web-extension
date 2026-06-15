# Privacy Policy

Chess.com Time Manager is designed to run locally in the browser.

## Data Collected

The extension does not collect, transmit, sell, or share personal data.

It reads limited page information from Chess.com game pages so it can detect:

- whether a live game appears to be active
- whether the player clock appears active
- whether a move-time warning threshold has been reached

This information is processed locally in the browser tab.

## Data Stored

The extension stores user settings with Chrome extension storage:

- warnings enabled or disabled
- warning threshold in seconds
- warning output mode
- warning volume
- warning cooldown
- maximum warnings per move
- debug overlay enabled or disabled

These settings may sync through Chrome if browser sync is enabled for the user. The extension does not send these settings to any project-owned server.

## Network Activity

The extension does not make network requests.

It does not send game state, Chess.com page data, account information, settings, or usage data to an external service.

The warning sound is bundled locally at `public/audio/warning.mp3`; it is not streamed or fetched from a third-party service at runtime.

## Permissions

The extension currently uses:

- `storage`: saves user settings.
- Chess.com host access: runs content scripts only on Chess.com pages.

The project should keep permissions narrow. Any new permission should have a clear feature reason before being added.

## Debug Overlay

The debug overlay is disabled by default. When enabled, it displays local diagnostic state in the current Chess.com tab. It does not transmit that state anywhere.

## Security Considerations

The extension should continue to avoid:

- remote code execution or remotely hosted scripts
- broad host permissions beyond Chess.com
- collecting game data beyond what is needed for local time reminders
- storing sensitive Chess.com account information
- using unlicensed celebrity voices, likenesses, names, or branded audio

Any replacement audio assets should be bundled, licensed, and reviewed before release.
