/*
 * Unit tests for warning output mode and volume decisions.
 * Structure: mode normalization, volume conversion, visual output, and audio output behavior.
 */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  WARNING_MODES,
  getAudioVolume,
  normalizeVolumePercent,
  normalizeWarningMode,
  shouldPlayWarningAudio,
  shouldShowVisualWarning
} = require("../../src/shared/warning-output.js");

test("normalizes warning output modes", () => {
  assert.equal(
    normalizeWarningMode(WARNING_MODES.AUDIO_ONLY),
    WARNING_MODES.AUDIO_ONLY
  );
  assert.equal(normalizeWarningMode("invalid"), WARNING_MODES.VISUAL_AND_AUDIO);
});

test("normalizes volume percentages and converts to audio volume", () => {
  assert.equal(normalizeVolumePercent(-10), 0);
  assert.equal(normalizeVolumePercent(125), 100);
  assert.equal(getAudioVolume({ volumePercent: 35 }), 0.35);
});

test("detects visual warning modes", () => {
  assert.equal(
    shouldShowVisualWarning({ warningMode: WARNING_MODES.VISUAL_AND_AUDIO }),
    true
  );
  assert.equal(
    shouldShowVisualWarning({ warningMode: WARNING_MODES.VISUAL_ONLY }),
    true
  );
  assert.equal(
    shouldShowVisualWarning({ warningMode: WARNING_MODES.AUDIO_ONLY }),
    false
  );
});

test("detects audio warning modes", () => {
  assert.equal(
    shouldPlayWarningAudio({
      warningMode: WARNING_MODES.VISUAL_AND_AUDIO,
      volumePercent: 80
    }),
    true
  );
  assert.equal(
    shouldPlayWarningAudio({
      warningMode: WARNING_MODES.AUDIO_ONLY,
      volumePercent: 80
    }),
    true
  );
  assert.equal(
    shouldPlayWarningAudio({
      warningMode: WARNING_MODES.VISUAL_ONLY,
      volumePercent: 80
    }),
    false
  );
  assert.equal(
    shouldPlayWarningAudio({
      warningMode: WARNING_MODES.AUDIO_ONLY,
      volumePercent: 0
    }),
    false
  );
});
