# Warning Toast and Default Threshold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move visual move-time warnings to a compact top-center toast and change the default warning threshold to 45 seconds.

**Architecture:** Keep warning behavior in the existing content-script modules. `warning-overlay.js` will change only its shadow-DOM CSS from a full-viewport backdrop to a top-center toast; it will still receive the same warning event and retain the existing auto-dismiss/audio path. `settings.js` remains the canonical source of the 45-second default, while fallback defaults in dependent modules stay aligned for standalone loading.

**Tech Stack:** Manifest V3 Chrome extension, plain JavaScript, Shadow DOM, Node built-in test runner.

## Global Constraints

- Preserve the product boundary: time reminders only, with no chess advice or analysis.
- Do not add dependencies, permissions, network requests, settings, or a build step.
- Existing saved user thresholds must not be migrated or overwritten.
- The popup initial state and Reset action must use a 45-second threshold.
- Visual warnings must remain non-interactive, auto-dismiss after 3.5 seconds, and not cover or dim the board center.

---

## File Structure

- Modify `src/content/warning-overlay.js`: replace full-viewport centered overlay styles with compact top-center toast styles.
- Modify `src/shared/settings.js`: make 45 seconds the canonical persisted-settings default.
- Modify `src/shared/warning-controller.js`, `src/content/live-game-content-script.js`, and `src/content/debug-overlay.js`: align module fallback defaults with the canonical setting.
- Modify `tests/unit/settings.test.js`: assert the new canonical default and form conversion.
- Modify `README.md`, `AGENTS.md`, and `docs/manual-validation.md`: state the new default and required manual visual validation.

### Task 1: Change and Test the Canonical Default Threshold

**Files:**
- Modify: `tests/unit/settings.test.js:17-25`
- Modify: `src/shared/settings.js:22-30`
- Modify: `src/shared/warning-controller.js:15-20`
- Modify: `src/content/live-game-content-script.js:31-40`
- Modify: `src/content/debug-overlay.js:22-32`

**Interfaces:**
- Consumes: `normalizeSettings()` and `DEFAULT_SETTINGS` from `src/shared/settings.js`.
- Produces: `DEFAULT_SETTINGS.thresholdMs === 45000`; module fallbacks return `thresholdMs: 45000` when the settings module is unavailable.

- [ ] **Step 1: Write the failing default-settings test**

Replace the first test in `tests/unit/settings.test.js` with:

```js
test("defaults to a 45 second warning threshold", () => {
  const settings = normalizeSettings();

  assert.equal(settings.thresholdMs, 45000);
  assert.equal(settings.enabled, true);
  assert.equal(settings.debugOverlayEnabled, false);
  assert.equal(settings.warningMode, WARNING_MODES.VISUAL_AND_AUDIO);
  assert.equal(settings.volumePercent, 80);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/unit/settings.test.js`

Expected: FAIL in `defaults to a 45 second warning threshold` because the actual default remains `15000`.

- [ ] **Step 3: Implement the aligned 45-second defaults**

Change the threshold field in each default object below from `15000` to `45000`:

```js
// src/shared/settings.js
const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  debugOverlayEnabled: false,
  warningMode: WARNING_MODES.VISUAL_AND_AUDIO,
  volumePercent: 80,
  thresholdMs: 45000,
  cooldownMs: 8000,
  maxWarningsPerMove: 1
});
```

```js
// src/shared/warning-controller.js
const DEFAULT_WARNING_SETTINGS = Object.freeze({
  enabled: true,
  thresholdMs: 45000,
  cooldownMs: 8000,
  maxWarningsPerMove: 1
});
```

Also change `thresholdMs: 15000` to `thresholdMs: 45000` in the fallback objects in `src/content/live-game-content-script.js` and `src/content/debug-overlay.js`. Do not change explicit 15-second test fixtures that exercise warning behavior rather than defaults.

- [ ] **Step 4: Run focused tests to verify the default change**

Run: `node --test tests/unit/settings.test.js tests/unit/warning-controller.test.js`

Expected: PASS, with the settings default test reporting 45 seconds and warning-controller behavior otherwise unchanged.

- [ ] **Step 5: Commit the default-threshold change**

```bash
git add src/shared/settings.js src/shared/warning-controller.js src/content/live-game-content-script.js src/content/debug-overlay.js tests/unit/settings.test.js
git commit -m "Default move warnings to 45 seconds"
```

### Task 2: Convert the Centered Overlay into a Top-Center Toast

**Files:**
- Modify: `src/content/warning-overlay.js:55-113`

**Interfaces:**
- Consumes: existing `showWarning(detail)` event payload with `title`, `message`, and `detail` strings.
- Produces: the same `chess-time-manager-warning-triggered` visual output, positioned at the top center with no full-viewport backdrop.

- [ ] **Step 1: Define the manual acceptance case before changing CSS**

In a loaded unpacked extension, set warning threshold to `3` seconds, select **Visual only**, and use the debug overlay's **Test warning** button. Record that the current warning covers the board center. This is the manual regression case the CSS change must eliminate.

- [ ] **Step 2: Replace the full-screen overlay CSS with compact toast CSS**

In `appendStyles`, replace the `.ctm-warning` rule with:

```css
.ctm-warning {
  position: fixed;
  top: 16px;
  left: 50%;
  z-index: 2147483646;
  width: min(440px, calc(100vw - 32px));
  transform: translateX(-50%);
  pointer-events: none;
  font-family: Arial, Helvetica, sans-serif;
}
```

Update `.ctm-warning__panel` to remove the centered-overlay sizing and use compact spacing:

```css
.ctm-warning__panel {
  box-sizing: border-box;
  border: 3px solid #d83b2d;
  border-radius: 8px;
  background: #ffffff;
  color: #17202a;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
  padding: 14px 18px;
  text-align: center;
  animation: ctm-warning-pop 180ms ease-out;
}
```

Reduce the heading and message typography to match toast density without changing wording:

```css
.ctm-warning__title {
  margin: 0;
  color: #a12622;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.05;
  text-transform: uppercase;
}

.ctm-warning__message {
  margin: 6px 0 0;
  color: #17202a;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}
```

Keep the detail rule, `pointer-events: none`, warning event listener, auto-dismiss duration, and audio logic unchanged.

- [ ] **Step 3: Run the full automated test suite**

Run: `npm test`

Expected: PASS with no failures. This repository has no DOM-level overlay test harness, so the CSS placement is verified by the manual acceptance case in the next step.

- [ ] **Step 4: Run the manual visual acceptance case**

Reload the extension in `chrome://extensions`, refresh a Chess.com game page, enable the debug overlay, and click **Test warning**. Verify all of the following:

1. The toast is horizontally centered at the top of the viewport.
2. There is no page-dimming backdrop.
3. The board center remains visible and can be clicked while the toast is displayed.
4. The toast disappears after about 3.5 seconds.
5. Sound behavior is unchanged when visual-and-audio mode is enabled.

- [ ] **Step 5: Commit the toast change**

```bash
git add src/content/warning-overlay.js
git commit -m "Move warning banner above the board"
```

### Task 3: Update User-Facing Defaults and Validation Instructions

**Files:**
- Modify: `README.md:225`
- Modify: `AGENTS.md:33`
- Modify: `docs/manual-validation.md:15-22,35-47`

**Interfaces:**
- Consumes: the finalized 45-second default and top-center toast behavior from Tasks 1 and 2.
- Produces: documentation consistent with the shipped settings and manual validation steps.

- [ ] **Step 1: Update default-threshold references**

Make these exact documentation substitutions:

```md
<!-- README.md -->
The warning threshold defaults to 45 seconds.

<!-- AGENTS.md -->
- move threshold `45s`

<!-- docs/manual-validation.md -->
- Confirm the threshold defaults to `45` seconds.
```

- [ ] **Step 2: Add toast-specific manual validation requirements**

After the **Test warning** instruction in the Chess.com page smoke test, add:

```md
- Confirm the visual warning is a compact toast at the top center of the viewport.
- Confirm the warning does not dim or cover the center of the board and does not block board interaction.
```

Update the Reset-defaults instruction to state it returns the threshold to `45` seconds as well as visual-and-audio mode at `80%` volume.

- [ ] **Step 3: Verify documentation and source are consistent**

Run:

```bash
grep -R -n -E 'defaults to 15 seconds|threshold defaults to `15`|move threshold `15s`' README.md AGENTS.md docs src tests || true
npm test
```

Expected: no outdated default-threshold statements in the checked source/docs, and all tests pass.

- [ ] **Step 4: Commit the documentation changes**

```bash
git add README.md AGENTS.md docs/manual-validation.md
git commit -m "Document 45 second warning default"
```

### Task 4: Final Verification and Delivery

**Files:**
- Verify only: all modified files from Tasks 1-3.

**Interfaces:**
- Consumes: completed commits from Tasks 1-3.
- Produces: a clean, verified working tree suitable for user testing or release packaging.

- [ ] **Step 1: Inspect the complete change set**

Run:

```bash
git diff HEAD~3..HEAD --check
git log --oneline -3
git status --short --branch
```

Expected: no whitespace errors, the three task commits are present, and no unintended files are modified.

- [ ] **Step 2: Re-run the complete test suite**

Run: `npm test`

Expected: all unit tests pass with zero failures.

- [ ] **Step 3: State the manual validation result accurately**

Report whether the live Chrome validation from Task 2 succeeded. If it was not run, state it as a required remaining manual check; do not claim that board interaction was verified from unit tests.
