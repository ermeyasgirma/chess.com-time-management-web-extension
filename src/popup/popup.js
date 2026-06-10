/*
 * Connects the popup settings form to persisted extension settings.
 * Structure: DOM lookups, rendering, save/reset handlers, and initial load.
 */

(function initSettingsPopup() {
  const settingsApi = globalThis.ChessTimeManagerSettings;

  if (!settingsApi) {
    return;
  }

  const enabledInput = document.getElementById("enabled");
  const debugOverlayInput = document.getElementById("debug-overlay-enabled");
  const thresholdInput = document.getElementById("threshold-seconds");
  const form = document.getElementById("settings-form");
  const resetButton = document.getElementById("reset-defaults");
  const status = document.getElementById("status");
  const warningsStatus = document.getElementById("warnings-status");
  const thresholdStatus = document.getElementById("threshold-status");
  const debugStatus = document.getElementById("debug-status");

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
    warningsStatus.textContent = values.enabled ? "On" : "Off";
    thresholdStatus.textContent = `${values.thresholdSeconds}s`;
    debugStatus.textContent = values.debugOverlayEnabled ? "On" : "Off";
  }

  function getSettingsFromForm() {
    return settingsApi.formValuesToSettings({
      enabled: enabledInput.checked,
      debugOverlayEnabled: debugOverlayInput.checked,
      thresholdSeconds: Number(thresholdInput.value)
    });
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

  settingsApi.getSettings(renderSettings);
})();
