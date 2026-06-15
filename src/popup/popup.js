/*
 * Connects the popup settings form to persisted extension settings.
 * Structure: DOM lookups, rendering, audio preview, save/reset handlers, and initial load.
 */

(function initSettingsPopup() {
  const settingsApi = globalThis.ChessTimeManagerSettings;

  if (!settingsApi) {
    return;
  }

  const enabledInput = document.getElementById("enabled");
  const debugOverlayInput = document.getElementById("debug-overlay-enabled");
  const thresholdInput = document.getElementById("threshold-seconds");
  const warningModeInput = document.getElementById("warning-mode");
  const volumeInput = document.getElementById("volume-percent");
  const volumeValue = document.getElementById("volume-value");
  const form = document.getElementById("settings-form");
  const resetButton = document.getElementById("reset-defaults");
  const testSoundButton = document.getElementById("test-sound");
  const status = document.getElementById("status");
  const warningsStatus = document.getElementById("warnings-status");
  const thresholdStatus = document.getElementById("threshold-status");
  const debugStatus = document.getElementById("debug-status");
  const soundStatus = document.getElementById("sound-status");
  const warningAudioPath = "public/audio/warning.mp3";

  let testAudio = null;

  function setStatus(message) {
    status.textContent = message;

    window.setTimeout(() => {
      if (status.textContent === message) {
        status.textContent = "";
      }
    }, 1800);
  }

  function renderSettings(settings) {
    const values = settingsApi.settingsToFormValues(settings);

    enabledInput.checked = values.enabled;
    debugOverlayInput.checked = values.debugOverlayEnabled;
    thresholdInput.value = String(values.thresholdSeconds);
    warningModeInput.value = values.warningMode;
    volumeInput.value = String(values.volumePercent);
    volumeValue.textContent = `${values.volumePercent}%`;
    warningsStatus.textContent = values.enabled ? "On" : "Off";
    thresholdStatus.textContent = `${values.thresholdSeconds}s`;
    debugStatus.textContent = values.debugOverlayEnabled ? "On" : "Off";
    soundStatus.textContent =
      values.warningMode === settingsApi.WARNING_MODES.VISUAL_ONLY ||
      values.volumePercent === 0
        ? "Off"
        : `${values.volumePercent}%`;
  }

  function getSettingsFromForm() {
    return settingsApi.formValuesToSettings({
      enabled: enabledInput.checked,
      debugOverlayEnabled: debugOverlayInput.checked,
      warningMode: warningModeInput.value,
      volumePercent: Number(volumeInput.value),
      thresholdSeconds: Number(thresholdInput.value)
    });
  }

  function getAudioUrl() {
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      typeof chrome.runtime.getURL === "function"
    ) {
      return chrome.runtime.getURL(warningAudioPath);
    }

    return `../../${warningAudioPath}`;
  }

  function updateVolumeLabel() {
    const settings = getSettingsFromForm();
    volumeInput.value = String(settings.volumePercent);
    volumeValue.textContent = `${settings.volumePercent}%`;
    soundStatus.textContent =
      settings.warningMode === settingsApi.WARNING_MODES.VISUAL_ONLY ||
      settings.volumePercent === 0
        ? "Off"
        : `${settings.volumePercent}%`;
  }

  function playTestSound() {
    const settings = getSettingsFromForm();

    if (
      settings.warningMode === settingsApi.WARNING_MODES.VISUAL_ONLY ||
      settings.volumePercent === 0
    ) {
      setStatus("Sound is off");
      return;
    }

    if (!testAudio) {
      testAudio = new Audio(getAudioUrl());
      testAudio.preload = "auto";
    }

    testAudio.volume = settings.volumePercent / 100;
    testAudio.currentTime = 0;

    const playResult = testAudio.play();

    if (playResult && typeof playResult.catch === "function") {
      playResult
        .then(() => setStatus("Playing test sound"))
        .catch(() => setStatus("Sound blocked by browser"));
      return;
    }

    setStatus("Playing test sound");
  }

  function saveCurrentSettings() {
    settingsApi.saveSettings(getSettingsFromForm(), (settings) => {
      renderSettings(settings);
      setStatus("Saved");
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCurrentSettings();
  });

  resetButton.addEventListener("click", () => {
    settingsApi.saveSettings(settingsApi.DEFAULT_SETTINGS, (settings) => {
      renderSettings(settings);
      setStatus("Reset to defaults");
    });
  });

  testSoundButton.addEventListener("click", playTestSound);
  volumeInput.addEventListener("input", updateVolumeLabel);
  warningModeInput.addEventListener("change", updateVolumeLabel);

  settingsApi.getSettings(renderSettings);
})();
