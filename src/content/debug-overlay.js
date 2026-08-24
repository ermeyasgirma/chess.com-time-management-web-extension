/*
 * Renders a small extension debug panel on Chess.com pages.
 * Structure: load shared modules, maintain diagnostic state, run module self-tests, and render a shadow-DOM overlay.
 */

(function initChessTimeManagerDebugOverlay() {
  const detector = globalThis.ChessTimeManagerDetector;
  const turnDetector = globalThis.ChessTimeManagerTurnDetector;
  const settingsApi = globalThis.ChessTimeManagerSettings;
  const moveTimer = globalThis.ChessTimeManagerMoveTimer;
  const warningController = globalThis.ChessTimeManagerWarningController;
  const warningOutput = globalThis.ChessTimeManagerWarningOutput;
  const debugStatus = globalThis.ChessTimeManagerDebugStatus;

  if (!debugStatus) {
    console.warn("[Chess Time Manager] Debug status module was not loaded.");
    return;
  }

  const OVERLAY_ID = "chess-time-manager-debug-overlay";
  const SELF_TEST_MOVE_ID = "debug:self-test";
  const defaultSettings =
    (settingsApi && settingsApi.DEFAULT_SETTINGS) ||
    (warningController && warningController.DEFAULT_WARNING_SETTINGS) || {
      enabled: true,
      debugOverlayEnabled: false,
       thresholdMs: 45000,
      cooldownMs: 8000,
      maxWarningsPerMove: 1,
      warningMode: "visual-and-audio",
      volumePercent: 80
    };

  let latestDetection = null;
  let latestTurn = null;
  let settings = defaultSettings;
  let timerSource = "not connected";
  let timerState = moveTimer ? moveTimer.createMoveTimerState({ nowMs: Date.now() }) : null;
  let warningState = warningController ? warningController.createWarningState() : null;
  let warningEvaluation = evaluateWarning(Date.now());
  let audioStatus = {
    status: "not played",
    reason: "No warning audio has played in this tab yet."
  };
  let selfTest = {
    status: "not run",
    message: "Use the self-test to verify timer and warning modules in this tab."
  };
  let isCollapsed = false;

  function evaluateWarning(nowMs) {
    if (!warningController || !timerState || !warningState) {
      return {
        shouldWarn: false,
        reason: "module-not-loaded"
      };
    }

    return warningController.evaluateMoveWarning({
      timerState,
      warningState,
      settings,
      nowMs
    });
  }

  function runModuleSelfTest() {
    if (!moveTimer || !warningController) {
      selfTest = {
        status: "fail",
        message: "Timer or warning module is missing."
      };
      renderOverlay();
      return;
    }

    const startMs = Date.now();
    const thresholdMs = settings.thresholdMs;

    timerSource = "self-test";
    timerState = moveTimer.createMoveTimerState({ nowMs: startMs });
    timerState = moveTimer.updateMoveTimer(timerState, {
      type: "user-turn-started",
      moveId: SELF_TEST_MOVE_ID,
      nowMs: startMs
    });
    timerState = moveTimer.updateMoveTimer(timerState, {
      type: "tick",
      nowMs: startMs + thresholdMs
    });

    warningState = warningController.createWarningState();
    warningEvaluation = warningController.evaluateMoveWarning({
      timerState,
      warningState,
      settings: {
        ...settings,
        cooldownMs: 0
      },
      nowMs: startMs + thresholdMs
    });
    warningState = warningEvaluation.warningState || warningState;

    selfTest = {
      status: warningEvaluation.shouldWarn ? "pass" : "fail",
      message: warningEvaluation.shouldWarn
        ? "Timer reached threshold and warning fired."
        : `Warning did not fire: ${warningEvaluation.reason}.`
    };

    renderOverlay();
  }

  function resetModuleSelfTest() {
    const nowMs = Date.now();

    timerSource = "not connected";
    timerState = moveTimer ? moveTimer.createMoveTimerState({ nowMs }) : null;
    warningState = warningController ? warningController.createWarningState() : null;
    warningEvaluation = evaluateWarning(nowMs);
    selfTest = {
      status: "not run",
      message: "Use the self-test to verify timer and warning modules in this tab."
    };

    renderOverlay();
  }

  function testWarningOverlay() {
    document.dispatchEvent(
      new CustomEvent("chess-time-manager:warning-triggered", {
        detail: {
          title: "Move now",
          message: "This is a test warning from the debug panel.",
          detail: "The configured warning output path is working."
        }
      })
    );
  }

  function getStatus() {
    return debugStatus.buildDebugStatus({
      detection: latestDetection,
      turnDetection: latestTurn,
      timerState,
      timerSource,
      warningEvaluation,
      audioStatus,
      settings,
      selfTest,
      modules: {
        detector: Boolean(detector),
        turnDetector: Boolean(turnDetector),
        settings: Boolean(settingsApi),
        timer: Boolean(moveTimer),
        warning: Boolean(warningController),
        warningOutput: Boolean(warningOutput)
      },
      nowMs: Date.now()
    });
  }

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

  function clearOverlayRoot() {
    const host = document.getElementById(OVERLAY_ID);

    if (host && host.shadowRoot) {
      host.shadowRoot.replaceChildren();
    }
  }

  function appendStyles(shadowRoot) {
    const style = createElement("style");
    style.textContent = `
      :host {
        all: initial;
      }

      .ctm-debug {
        position: fixed;
        top: 80px;
        right: 16px;
        z-index: 2147483647;
        width: min(360px, calc(100vw - 32px));
        max-height: calc(100vh - 112px);
        overflow: auto;
        box-sizing: border-box;
        border: 1px solid #b8c2cc;
        border-left: 4px solid #2864c8;
        border-radius: 6px;
        background: #ffffff;
        color: #17202a;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.35;
      }

      .ctm-debug__header,
      .ctm-debug__actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 12px;
      }

      .ctm-debug__header {
        border-bottom: 1px solid #d7dde3;
      }

      .ctm-debug__title {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
      }

      .ctm-debug__rows {
        display: grid;
        grid-template-columns: minmax(116px, 42%) 1fr;
        gap: 0;
      }

      .ctm-debug__label,
      .ctm-debug__value {
        border-bottom: 1px solid #edf0f2;
        padding: 7px 12px;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .ctm-debug__label {
        color: #4b5560;
        font-weight: 700;
      }

      .ctm-debug__value {
        color: #17202a;
      }

      .ctm-debug__detail {
        display: block;
        margin-top: 2px;
        color: #697783;
        font-size: 11px;
        font-weight: 400;
      }

      .ctm-debug__value[data-tone="good"] {
        color: #17633a;
        font-weight: 700;
      }

      .ctm-debug__value[data-tone="warn"] {
        color: #8a5a00;
        font-weight: 700;
      }

      .ctm-debug__value[data-tone="bad"] {
        color: #a12622;
        font-weight: 700;
      }

      .ctm-debug__value[data-tone="muted"] {
        color: #697783;
      }

      .ctm-debug__button {
        appearance: none;
        border: 1px solid #aeb9c4;
        border-radius: 4px;
        background: #f6f8fa;
        color: #17202a;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        padding: 5px 8px;
      }

      .ctm-debug__button:hover {
        background: #edf2f7;
      }

      .ctm-debug__button--primary {
        border-color: #2864c8;
        background: #2864c8;
        color: #ffffff;
      }

      .ctm-debug__button--primary:hover {
        background: #1f55ad;
      }

      .ctm-debug__collapsed {
        position: fixed;
        top: 80px;
        right: 16px;
        z-index: 2147483647;
        border: 1px solid #aeb9c4;
        border-radius: 6px;
        background: #ffffff;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
        color: #17202a;
        cursor: pointer;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        font-weight: 700;
        padding: 7px 9px;
      }
    `;
    shadowRoot.appendChild(style);
  }

  function appendRows(container, rows) {
    rows.forEach((row) => {
      const label = createElement("div", "ctm-debug__label", row.label);
      const value = createElement("div", "ctm-debug__value", row.value);
      value.dataset.tone = row.tone || "neutral";

      if (row.detail) {
        value.appendChild(createElement("span", "ctm-debug__detail", row.detail));
      }

      container.appendChild(label);
      container.appendChild(value);
    });
  }

  function renderCollapsed(shadowRoot) {
    const button = createElement("button", "ctm-debug__collapsed", "CTM Debug");
    button.type = "button";
    button.addEventListener("click", () => {
      isCollapsed = false;
      renderOverlay();
    });
    shadowRoot.appendChild(button);
  }

  function renderExpanded(shadowRoot) {
    const status = getStatus();
    const panel = createElement("section", "ctm-debug");
    const header = createElement("header", "ctm-debug__header");
    const title = createElement("h2", "ctm-debug__title", status.title);
    const collapseButton = createElement("button", "ctm-debug__button", "Hide");
    const rows = createElement("div", "ctm-debug__rows");
    const actions = createElement("div", "ctm-debug__actions");
    const selfTestButton = createElement("button", "ctm-debug__button ctm-debug__button--primary", "Run self-test");
    const warningTestButton = createElement("button", "ctm-debug__button", "Test warning");
    const resetButton = createElement("button", "ctm-debug__button", "Reset");

    collapseButton.type = "button";
    selfTestButton.type = "button";
    warningTestButton.type = "button";
    resetButton.type = "button";

    collapseButton.addEventListener("click", () => {
      isCollapsed = true;
      renderOverlay();
    });
    selfTestButton.addEventListener("click", runModuleSelfTest);
    warningTestButton.addEventListener("click", testWarningOverlay);
    resetButton.addEventListener("click", resetModuleSelfTest);

    header.appendChild(title);
    header.appendChild(collapseButton);
    appendRows(rows, status.rows);
    actions.appendChild(selfTestButton);
    actions.appendChild(warningTestButton);
    actions.appendChild(resetButton);

    panel.appendChild(header);
    panel.appendChild(rows);
    panel.appendChild(actions);
    shadowRoot.appendChild(panel);
  }

  function renderOverlay() {
    if (!document.documentElement) {
      window.setTimeout(renderOverlay, 100);
      return;
    }

    if (!settings.debugOverlayEnabled) {
      clearOverlayRoot();
      return;
    }

    const shadowRoot = ensureOverlayRoot();
    shadowRoot.replaceChildren();
    appendStyles(shadowRoot);

    if (isCollapsed) {
      renderCollapsed(shadowRoot);
      return;
    }

    renderExpanded(shadowRoot);
  }

  document.addEventListener("chess-time-manager:live-game-detection", (event) => {
    latestDetection = event.detail;
    renderOverlay();
  });

  document.addEventListener("chess-time-manager:extension-state", (event) => {
    const state = event.detail || {};

    latestDetection = state.detection || latestDetection;
    latestTurn = state.turnDetection || latestTurn;
    settings = state.settings || settings;
    timerSource = state.timerSource || timerSource;
    timerState = state.timerState || timerState;
    warningEvaluation = state.warningEvaluation || warningEvaluation;
    renderOverlay();
  });

  document.addEventListener("chess-time-manager:warning-audio-status", (event) => {
    audioStatus = event.detail || audioStatus;
    renderOverlay();
  });

  function loadDebugSettings() {
    if (!settingsApi) {
      renderOverlay();
      return;
    }

    settingsApi.getSettings((loadedSettings) => {
      settings = loadedSettings;
      renderOverlay();
    });

    settingsApi.watchSettings((updatedSettings) => {
      settings = updatedSettings;
      renderOverlay();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadDebugSettings, { once: true });
  } else {
    loadDebugSettings();
  }
})();
