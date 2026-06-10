# Chrome Release Checklist

Use this checklist before sharing or publishing a build.

## Local Verification

- Run `npm test`.
- Load the repo as an unpacked extension in `chrome://extensions`.
- Open Chess.com and confirm the extension does not run on unrelated sites.
- Open the popup and confirm settings save correctly.
- Change the warning threshold and confirm the debug overlay shows the updated value when enabled.
- Enable the debug overlay only for testing.
- Use "Test warning" from the debug overlay to confirm the visual warning renders.
- Test at least one real Chess.com live game and confirm turn detection behaves as expected.

## Privacy And Permissions

- Confirm `manifest.json` only requests necessary permissions.
- Confirm host access is limited to Chess.com.
- Confirm no network requests were added.
- Review `docs/privacy.md` and update it if the feature set changed.
- Confirm no private account data or full game history is stored.

## Assets And Legal

- Confirm icons are included before publishing.
- Confirm audio assets are original, licensed, or user-provided.
- Do not include famous-player voice clips, names, or likenesses without explicit permission.

## Package

This project currently has no build step. To package the unpacked extension:

1. Confirm the worktree is clean.
2. Run `npm test`.
3. Create a zip from the repository contents, excluding development-only files.

Example:

```bash
git archive --format=zip --output chess-time-manager.zip HEAD
```

## Chrome Web Store Draft

- Upload the zip.
- Provide a clear single-purpose description.
- Complete the privacy questionnaire accurately.
- Include screenshots of the popup and warning behavior.
- Explain that the extension is a time-management reminder, not chess assistance.
