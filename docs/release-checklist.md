# Chrome Release Checklist

Use this checklist before sharing or publishing a build.

## Local Verification

- Run `npm test`.
- Load the repo as an unpacked extension in `chrome://extensions`.
- Open Chess.com and confirm the extension does not run on unrelated sites.
- Open the popup and confirm settings save correctly.
- Change the warning threshold and confirm the debug overlay shows the updated value when enabled.
- Change warning output mode and volume, then confirm the popup "Test sound" button behaves correctly.
- Enable the debug overlay only for testing.
- Use "Test warning" from the debug overlay to confirm the configured warning output path runs.
- Test at least one real Chess.com live game and confirm turn detection behaves as expected.
- Follow `docs/manual-validation.md` for the full smoke-test flow.

## Privacy And Permissions

- Confirm `manifest.json` only requests necessary permissions.
- Confirm host access is limited to Chess.com.
- Confirm no runtime network requests were added.
- Confirm `web_accessible_resources` exposes only the bundled warning sound and only to Chess.com pages.
- Review `docs/privacy.md` and update it if the feature set changed.
- Confirm no private account data or full game history is stored.

## Assets And Legal

- Confirm icons are included before publishing.
- Confirm audio assets are original, licensed, or user-provided.
- Confirm `docs/asset-credits.md` is current for bundled icons and audio.
- Do not include famous-player voice clips, names, or likenesses without explicit permission.

## Package

This project currently has no build step. To package the unpacked extension:

1. Confirm the worktree is clean.
2. Run `npm test`.
3. Create a zip from the extension files, excluding tests and development-only files.

Example:

```bash
npm run package:chrome
```

## Chrome Web Store Draft

- Upload the zip.
- Provide a clear single-purpose description.
- Complete the privacy questionnaire accurately.
- Include screenshots of the popup and warning behavior.
- Explain that the extension is a time-management reminder, not chess assistance.
- Use `docs/chrome-web-store.md` as the draft source for listing copy and screenshot coverage.
