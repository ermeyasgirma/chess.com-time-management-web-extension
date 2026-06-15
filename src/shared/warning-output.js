/*
 * Decides which warning outputs should run and converts volume settings for playback.
 * Structure: shared module wrapper, mode constants, normalization helpers, and output predicates.
 */

(function attachWarningOutput(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ChessTimeManagerWarningOutput = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createWarningOutputApi() {
  const WARNING_MODES = Object.freeze({
    VISUAL_AND_AUDIO: "visual-and-audio",
    VISUAL_ONLY: "visual-only",
    AUDIO_ONLY: "audio-only"
  });
  const DEFAULT_VOLUME_PERCENT = 80;
  const VALID_WARNING_MODES = new Set(Object.values(WARNING_MODES));

  function toFiniteNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function normalizeWarningMode(value) {
    return VALID_WARNING_MODES.has(value) ? value : WARNING_MODES.VISUAL_AND_AUDIO;
  }

  function normalizeVolumePercent(value) {
    const safeValue = toFiniteNumber(value, DEFAULT_VOLUME_PERCENT);
    return Math.min(100, Math.max(0, safeValue));
  }

  function shouldShowVisualWarning(settings) {
    const mode = normalizeWarningMode(settings && settings.warningMode);

    return (
      mode === WARNING_MODES.VISUAL_AND_AUDIO ||
      mode === WARNING_MODES.VISUAL_ONLY
    );
  }

  function shouldPlayWarningAudio(settings) {
    const mode = normalizeWarningMode(settings && settings.warningMode);
    const volumePercent = normalizeVolumePercent(settings && settings.volumePercent);

    return (
      volumePercent > 0 &&
      (mode === WARNING_MODES.VISUAL_AND_AUDIO || mode === WARNING_MODES.AUDIO_ONLY)
    );
  }

  function getAudioVolume(settings) {
    return normalizeVolumePercent(settings && settings.volumePercent) / 100;
  }

  return {
    DEFAULT_VOLUME_PERCENT,
    WARNING_MODES,
    getAudioVolume,
    normalizeVolumePercent,
    normalizeWarningMode,
    shouldPlayWarningAudio,
    shouldShowVisualWarning
  };
});
