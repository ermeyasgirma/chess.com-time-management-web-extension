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
  const thresholdInput = document.getElementById("threshold-seconds");
  const form = document.getElementById("settings-form");
  const resetButton = document.getElementById("reset-defaults");
  const status = document.getElementById("status");

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
    thresholdInput.value = String(values.thresholdSeconds);
  }

  function getSettingsFromForm() {
    return settingsApi.formValuesToSettings({
      enabled: enabledInput.checked,
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
