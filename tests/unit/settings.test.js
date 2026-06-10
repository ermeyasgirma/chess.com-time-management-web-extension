/*
 * Unit tests for settings defaults and form conversion.
 * Structure: default normalization, value clamping, form conversion, and reset behavior.
 */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_SETTINGS,
  formValuesToSettings,
  normalizeSettings,
  settingsToFormValues
} = require("../../src/shared/settings.js");

test("defaults to a 15 second warning threshold", () => {
  const settings = normalizeSettings();

  assert.equal(settings.thresholdMs, 15000);
  assert.equal(settings.enabled, true);
});

test("clamps unsafe threshold values", () => {
  assert.equal(normalizeSettings({ thresholdMs: 100 }).thresholdMs, 1000);
  assert.equal(normalizeSettings({ thresholdMs: 999999 }).thresholdMs, 300000);
});

test("converts popup form values to stored settings", () => {
  const settings = formValuesToSettings({
    enabled: false,
    thresholdSeconds: 20
  });

  assert.equal(settings.enabled, false);
  assert.equal(settings.thresholdMs, 20000);
});

test("converts stored settings to popup form values", () => {
  const values = settingsToFormValues({
    ...DEFAULT_SETTINGS,
    thresholdMs: 45000
  });

  assert.equal(values.enabled, true);
  assert.equal(values.thresholdSeconds, 45);
});
