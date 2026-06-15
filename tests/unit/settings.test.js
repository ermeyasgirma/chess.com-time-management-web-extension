/*
 * Unit tests for settings defaults and form conversion.
 * Structure: default normalization, value clamping, form conversion, and reset behavior.
 */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_SETTINGS,
  WARNING_MODES,
  formValuesToSettings,
  normalizeSettings,
  settingsToFormValues
} = require("../../src/shared/settings.js");

test("defaults to a 15 second warning threshold", () => {
  const settings = normalizeSettings();

  assert.equal(settings.thresholdMs, 15000);
  assert.equal(settings.enabled, true);
  assert.equal(settings.debugOverlayEnabled, false);
  assert.equal(settings.warningMode, WARNING_MODES.VISUAL_AND_AUDIO);
  assert.equal(settings.volumePercent, 80);
});

test("clamps unsafe threshold values", () => {
  assert.equal(normalizeSettings({ thresholdMs: 100 }).thresholdMs, 1000);
  assert.equal(normalizeSettings({ thresholdMs: 999999 }).thresholdMs, 300000);
});

test("normalizes warning output settings", () => {
  const settings = normalizeSettings({
    warningMode: "not-a-mode",
    volumePercent: 120
  });

  assert.equal(settings.warningMode, WARNING_MODES.VISUAL_AND_AUDIO);
  assert.equal(settings.volumePercent, 100);
  assert.equal(normalizeSettings({ volumePercent: -10 }).volumePercent, 0);
});

test("converts popup form values to stored settings", () => {
  const settings = formValuesToSettings({
    enabled: false,
    debugOverlayEnabled: true,
    warningMode: WARNING_MODES.AUDIO_ONLY,
    volumePercent: 35,
    thresholdSeconds: 20
  });

  assert.equal(settings.enabled, false);
  assert.equal(settings.debugOverlayEnabled, true);
  assert.equal(settings.warningMode, WARNING_MODES.AUDIO_ONLY);
  assert.equal(settings.volumePercent, 35);
  assert.equal(settings.thresholdMs, 20000);
});

test("converts stored settings to popup form values", () => {
  const values = settingsToFormValues({
    ...DEFAULT_SETTINGS,
    warningMode: WARNING_MODES.VISUAL_ONLY,
    volumePercent: 55,
    thresholdMs: 45000
  });

  assert.equal(values.enabled, true);
  assert.equal(values.debugOverlayEnabled, false);
  assert.equal(values.warningMode, WARNING_MODES.VISUAL_ONLY);
  assert.equal(values.volumePercent, 55);
  assert.equal(values.thresholdSeconds, 45);
});
