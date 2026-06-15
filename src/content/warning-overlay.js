/*
 * Shows visual and/or audio warnings when the user spends too long on a move.
 * Structure: settings loading, audio playback, shadow-DOM rendering, and warning event handling.
 */

(function initChessTimeManagerWarningOverlay() {
  const settingsApi = globalThis.ChessTimeManagerSettings;
  const warningOutput = globalThis.ChessTimeManagerWarningOutput;
  const OVERLAY_ID = "chess-time-manager-warning-overlay";
  const AUTO_DISMISS_MS = 3500;
  const WARNING_AUDIO_PATH = "public/audio/warning.mp3";
  const defaultSettings = (settingsApi && settingsApi.DEFAULT_SETTINGS) || {
    warningMode: "visual-and-audio",
    volumePercent: 80
  };

  let dismissTimerId = 0;
  let settings = defaultSettings;
  let warningAudio = null;

  function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (textContent !== undefined) {
      element.textContent = textContent;
    }

    return element;
  }

  function ensureOverlayRoot() {
    let host = document.getElementById(OVERLAY_ID);

    if (!host) {
      host = document.createElement("div");
      host.id = OVERLAY_ID;
      document.documentElement.appendChild(host);
      host.attachShadow({ mode: "open" });
    }

    return host.shadowRoot;
  }

  function appendStyles(shadowRoot) {
    const style = createElement("style");
    style.textContent = `
      :host {
        all: initial;
      }

      .ctm-warning {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: grid;
        place-items: center;
        pointer-events: none;
        background: rgba(23, 32, 42, 0.16);
        font-family: Arial, Helvetica, sans-serif;
      }

      .ctm-warning__panel {
        width: min(520px, calc(100vw - 32px));
        box-sizing: border-box;
        border: 3px solid #d83b2d;
        border-radius: 8px;
        background: #ffffff;
        color: #17202a;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.3);
        padding: 24px;
        text-align: center;
        animation: ctm-warning-pop 180ms ease-out;
      }

      .ctm-warning__title {
        margin: 0;
        color: #a12622;
        font-size: 34px;
        font-weight: 800;
        letter-spacing: 0;
        line-height: 1.05;
        text-transform: uppercase;
      }

      .ctm-warning__message {
        margin: 10px 0 0;
        color: #17202a;
        font-size: 16px;
        font-weight: 700;
        line-height: 1.35;
      }

      .ctm-warning__detail {
        margin: 6px 0 0;
        color: #4b5560;
        font-size: 13px;
        line-height: 1.35;
      }

      @keyframes ctm-warning-pop {
        from {
          opacity: 0;
          transform: scale(0.96);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    shadowRoot.appendChild(style);
  }

  function clearOverlay() {
    const host = document.getElementById(OVERLAY_ID);

    if (host && host.shadowRoot) {
      host.shadowRoot.replaceChildren();
    }

    if (dismissTimerId) {
      window.clearTimeout(dismissTimerId);
      dismissTimerId = 0;
    }
  }

  function getWarningText(detail) {
    const safeDetail = detail || {};

    return {
      title: safeDetail.title || "Move now",
      message:
        safeDetail.message ||
        "You have spent too long on this move. Make a practical decision.",
      detail: safeDetail.detail || ""
    };
  }

  function getAudioUrl() {
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      typeof chrome.runtime.getURL === "function"
    ) {
      return chrome.runtime.getURL(WARNING_AUDIO_PATH);
    }

    return WARNING_AUDIO_PATH;
  }

  function publishAudioStatus(status, reason) {
    document.dispatchEvent(
      new CustomEvent("chess-time-manager:warning-audio-status", {
        detail: {
          status,
          reason: reason || "",
          volumePercent: settings.volumePercent,
          warningMode: settings.warningMode
        }
      })
    );
  }

  function shouldShowVisualWarning() {
    if (warningOutput) {
      return warningOutput.shouldShowVisualWarning(settings);
    }

    return settings.warningMode !== "audio-only";
  }

  function shouldPlayWarningAudio() {
    if (warningOutput) {
      return warningOutput.shouldPlayWarningAudio(settings);
    }

    return settings.warningMode !== "visual-only" && settings.volumePercent > 0;
  }

  function getAudioVolume() {
    if (warningOutput) {
      return warningOutput.getAudioVolume(settings);
    }

    return Math.min(1, Math.max(0, Number(settings.volumePercent) / 100 || 0.8));
  }

  function playWarningAudio() {
    if (!shouldPlayWarningAudio()) {
      publishAudioStatus("skipped", "audio disabled by settings");
      return;
    }

    if (!warningAudio) {
      warningAudio = new Audio(getAudioUrl());
      warningAudio.preload = "auto";
    }

    try {
      warningAudio.volume = getAudioVolume();
      warningAudio.currentTime = 0;

      const playResult = warningAudio.play();

      if (playResult && typeof playResult.catch === "function") {
        playResult
          .then(() => publishAudioStatus("playing", "audio started"))
          .catch((error) => {
            publishAudioStatus(
              "blocked",
              error && error.message ? error.message : "browser blocked audio"
            );
          });
        return;
      }

      publishAudioStatus("playing", "audio started");
    } catch (error) {
      publishAudioStatus(
        "error",
        error && error.message ? error.message : "audio playback failed"
      );
    }
  }

  function showWarning(detail) {
    const shadowRoot = ensureOverlayRoot();
    const warningText = getWarningText(detail);
    const overlay = createElement("section", "ctm-warning");
    const panel = createElement("div", "ctm-warning__panel");

    shadowRoot.replaceChildren();
    appendStyles(shadowRoot);

    panel.appendChild(createElement("h2", "ctm-warning__title", warningText.title));
    panel.appendChild(createElement("p", "ctm-warning__message", warningText.message));

    if (warningText.detail) {
      panel.appendChild(createElement("p", "ctm-warning__detail", warningText.detail));
    }

    overlay.appendChild(panel);
    shadowRoot.appendChild(overlay);

    if (dismissTimerId) {
      window.clearTimeout(dismissTimerId);
    }

    dismissTimerId = window.setTimeout(clearOverlay, AUTO_DISMISS_MS);
  }

  function handleWarning(detail) {
    if (shouldShowVisualWarning()) {
      showWarning(detail);
    } else {
      clearOverlay();
    }

    playWarningAudio();
  }

  function loadSettings() {
    if (!settingsApi) {
      return;
    }

    settingsApi.getSettings((loadedSettings) => {
      settings = loadedSettings;
    });

    settingsApi.watchSettings((updatedSettings) => {
      settings = updatedSettings;
    });
  }

  document.addEventListener("chess-time-manager:warning-triggered", (event) => {
    handleWarning(event.detail);
  });

  loadSettings();
})();
