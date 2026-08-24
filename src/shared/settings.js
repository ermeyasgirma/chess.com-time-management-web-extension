/*
 * Owns extension settings defaults, validation, persistence, and change watching.
 * Structure: shared module wrapper, default values, normalization helpers, storage helpers, and public API.
 */

(function attachSettings(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ChessTimeManagerSettings = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSettingsApi() {
  const STORAGE_KEY = "chessTimeManagerSettings";
  const WARNING_MODES = Object.freeze({
    VISUAL_AND_AUDIO: "visual-and-audio",
    VISUAL_ONLY: "visual-only",
    AUDIO_ONLY: "audio-only"
  });
  const VALID_WARNING_MODES = new Set(Object.values(WARNING_MODES));
  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    debugOverlayEnabled: false,
    warningMode: WARNING_MODES.VISUAL_AND_AUDIO,
    volumePercent: 80,
    thresholdMs: 45000,
    cooldownMs: 8000,
    maxWarningsPerMove: 1
  });

  function toFiniteNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function clampNumber(value, minimum, maximum, fallback) {
    const safeValue = Math.max(minimum, toFiniteNumber(value, fallback));

    if (Number.isFinite(maximum)) {
      return Math.min(maximum, safeValue);
    }

    return safeValue;
  }

  function normalizeSettings(settings) {
    const rawSettings = settings || {};
    const warningMode = VALID_WARNING_MODES.has(rawSettings.warningMode)
      ? rawSettings.warningMode
      : DEFAULT_SETTINGS.warningMode;

    return {
      enabled: rawSettings.enabled !== false,
      debugOverlayEnabled: rawSettings.debugOverlayEnabled === true,
      warningMode,
      volumePercent: clampNumber(
        rawSettings.volumePercent,
        0,
        100,
        DEFAULT_SETTINGS.volumePercent
      ),
      thresholdMs: clampNumber(
        rawSettings.thresholdMs,
        1000,
        300000,
        DEFAULT_SETTINGS.thresholdMs
      ),
      cooldownMs: clampNumber(
        rawSettings.cooldownMs,
        0,
        60000,
        DEFAULT_SETTINGS.cooldownMs
      ),
      maxWarningsPerMove: clampNumber(
        rawSettings.maxWarningsPerMove,
        1,
        5,
        DEFAULT_SETTINGS.maxWarningsPerMove
      )
    };
  }

  function settingsToFormValues(settings) {
    const normalizedSettings = normalizeSettings(settings);

    return {
      enabled: normalizedSettings.enabled,
      debugOverlayEnabled: normalizedSettings.debugOverlayEnabled,
      warningMode: normalizedSettings.warningMode,
      volumePercent: Math.round(normalizedSettings.volumePercent),
      thresholdSeconds: Math.round(normalizedSettings.thresholdMs / 1000)
    };
  }

  function formValuesToSettings(values) {
    const safeValues = values || {};

    return normalizeSettings({
      ...DEFAULT_SETTINGS,
      enabled: safeValues.enabled !== false,
      debugOverlayEnabled: safeValues.debugOverlayEnabled === true,
      warningMode: safeValues.warningMode,
      volumePercent: Number(safeValues.volumePercent),
      thresholdMs: Number(safeValues.thresholdSeconds) * 1000
    });
  }

  function getChromeStorageArea() {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.sync
    ) {
      return null;
    }

    return chrome.storage.sync;
  }

  function getSettings(callback) {
    const storageArea = getChromeStorageArea();

    if (!storageArea) {
      callback(normalizeSettings(DEFAULT_SETTINGS));
      return;
    }

    storageArea.get(STORAGE_KEY, (result) => {
      const storedSettings = result && result[STORAGE_KEY];
      callback(normalizeSettings(storedSettings));
    });
  }

  function saveSettings(settings, callback) {
    const storageArea = getChromeStorageArea();
    const normalizedSettings = normalizeSettings(settings);

    if (!storageArea) {
      if (callback) {
        callback(normalizedSettings);
      }
      return;
    }

    storageArea.set({ [STORAGE_KEY]: normalizedSettings }, () => {
      if (callback) {
        callback(normalizedSettings);
      }
    });
  }

  function watchSettings(callback) {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.onChanged ||
      typeof chrome.storage.onChanged.addListener !== "function"
    ) {
      return function noopUnsubscribe() {};
    }

    const listener = (changes, areaName) => {
      if (areaName !== "sync" || !changes[STORAGE_KEY]) {
        return;
      }

      callback(normalizeSettings(changes[STORAGE_KEY].newValue));
    };

    chrome.storage.onChanged.addListener(listener);

    return function unsubscribe() {
      if (typeof chrome.storage.onChanged.removeListener === "function") {
        chrome.storage.onChanged.removeListener(listener);
      }
    };
  }

  return {
    DEFAULT_SETTINGS,
    STORAGE_KEY,
    WARNING_MODES,
    formValuesToSettings,
    getSettings,
    normalizeSettings,
    saveSettings,
    settingsToFormValues,
    watchSettings
  };
});
