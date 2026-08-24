# Warning Toast and Default Threshold Design

## Purpose

Keep move-time reminders visible without obscuring the center of the Chess.com board, and make the initial reminder less aggressive.

## Visual Warning

Replace the current full-viewport, centered warning overlay with a compact toast positioned at the top center of the viewport. The toast will retain the existing title, message, threshold detail, red visual treatment, and 3.5-second auto-dismiss. It will not add a page-dimming backdrop and will remain non-interactive so it cannot prevent board input.

The toast will use viewport-aware width and spacing so it remains visible on smaller screens without horizontal overflow.

## Default Threshold

Change the default move-warning threshold from 15 seconds to 45 seconds. Settings normalization will continue to supply this value when a user has no saved threshold. Existing user-selected thresholds will remain unchanged. Resetting settings will use the new 45-second default.

## Scope

Change only warning-overlay styling, default-setting values and their tests, and documentation that explicitly states the default threshold. Preserve all existing timer, warning, audio, and settings behavior otherwise.

## Verification

Add or update unit tests for the 45-second default and retain the existing warning-output test coverage. Run the full `npm test` suite. Manual validation will confirm the toast appears at the top center, does not dim or cover the board center, auto-dismisses, and the popup starts and resets to 45 seconds.
