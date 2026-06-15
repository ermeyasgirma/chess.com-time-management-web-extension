/*
 * Runs extension detection and timing inside matching Chess.com tabs.
 * Structure: load modules, detect live game and turn state, update timer/warning state, and publish debug events.
 */

(function initLiveGameContentScript() {
  const detector = globalThis.ChessTimeManagerDetector;
  const turnDetector = globalThis.ChessTimeManagerTurnDetector;
  const settingsApi = globalThis.ChessTimeManagerSettings;
  const moveTimer = globalThis.ChessTimeManagerMoveTimer;
  const warningController = globalThis.ChessTimeManagerWarningController;
  const warningOutput = globalThis.ChessTimeManagerWarningOutput;

  if (!detector) {
    console.warn("[Chess Time Manager] Live game detector was not loaded.");
    return;
  }

  const STATUS_ATTRIBUTE = "data-chess-time-manager-status";
  const IS_LIVE_GAME_ATTRIBUTE = "data-chess-time-manager-is-live-game";
  const TURN_STATUS_ATTRIBUTE = "data-chess-time-manager-turn-status";
  const IS_USER_TURN_ATTRIBUTE = "data-chess-time-manager-is-user-turn";
  const WARNING_STATUS_ATTRIBUTE = "data-chess-time-manager-warning-status";
  const LOCATION_CHECK_INTERVAL_MS = 1000;
  const MUTATION_DEBOUNCE_MS = 150;
  const TIMER_TICK_INTERVAL_MS = 1000;
  const TIMER_SOURCE = "chess.com-page";
  const defaultSettings =
    (settingsApi && settingsApi.DEFAULT_SETTINGS) ||
    (warningController && warningController.DEFAULT_WARNING_SETTINGS) || {
      enabled: true,
      thresholdMs: 15000,
      cooldownMs: 8000,
      maxWarningsPerMove: 1,
      warningMode: "visual-and-audio",
      volumePercent: 80
    };

  let lastSignature = "";
  let lastHref = window.location.href;
  let scheduledDetectionId = 0;
  let settings = defaultSettings;
  let latestDetection = null;
  let latestTurn = null;
  let timerState = moveTimer ? moveTimer.createMoveTimerState({ nowMs: Date.now() }) : null;
  let warningState = warningController ? warningController.createWarningState() : null;
  let warningEvaluation = {
    shouldWarn: false,
    reason: "not-evaluated"
  };

  function getDetectionSignature(result, turnResult, warningResult) {
    // Only include fields that change whether downstream code should react.
    return JSON.stringify({
      href: result.url.href,
      status: result.status,
      turnStatus: turnResult ? turnResult.status : "turn-detector-missing",
      moveId: turnResult ? turnResult.moveId : null,
      timerStatus: timerState ? timerState.status : "timer-missing",
      warningReason: warningResult ? warningResult.reason : "warning-missing",
      boardSelector: result.evidence.boardSelector,
      clockMatchCount: result.evidence.clockMatchCount,
      livePanelSelector: result.evidence.livePanelSelector
    });
  }

  function publishDetection(result) {
    // Attributes make the current detection state easy to inspect in DevTools.
    document.documentElement.setAttribute(STATUS_ATTRIBUTE, result.status);
    document.documentElement.setAttribute(
      IS_LIVE_GAME_ATTRIBUTE,
      String(result.isLiveGame)
    );

    document.dispatchEvent(
      new CustomEvent("chess-time-manager:live-game-detection", {
        detail: result
      })
    );
  }

  function createMissingTurnResult(reason) {
    return {
      status: "unavailable",
      isUserTurn: false,
      timerEventType: "tick",
      moveId: latestTurn ? latestTurn.moveId : null,
      turnSequence: latestTurn ? latestTurn.turnSequence : 0,
      reason,
      evidence: {}
    };
  }

  function getTimerEvent(turnResult, nowMs) {
    const event = {
      type: turnResult.timerEventType || "tick",
      nowMs
    };

    if (event.type === "user-turn-started") {
      event.moveId = turnResult.moveId;
    }

    return event;
  }

  function updateTimerAndWarning(turnResult, nowMs) {
    const timerEvent = getTimerEvent(turnResult, nowMs);

    if (moveTimer && timerState) {
      timerState = moveTimer.updateMoveTimer(timerState, timerEvent);
    }

    if (warningController && warningState && timerState) {
      if (timerEvent.type === "reset" || timerEvent.type === "game-ended") {
        warningState = warningController.createWarningState();
      }

      warningEvaluation = warningController.evaluateMoveWarning({
        timerState,
        warningState,
        settings,
        nowMs
      });
      warningState = warningEvaluation.warningState || warningState;
      return;
    }

    warningEvaluation = {
      shouldWarn: false,
      reason: "module-not-loaded"
    };
  }

  function publishExtensionState() {
    document.documentElement.setAttribute(
      TURN_STATUS_ATTRIBUTE,
      latestTurn ? latestTurn.status : "unknown"
    );
    document.documentElement.setAttribute(
      IS_USER_TURN_ATTRIBUTE,
      String(Boolean(latestTurn && latestTurn.isUserTurn))
    );
    document.documentElement.setAttribute(
      WARNING_STATUS_ATTRIBUTE,
      warningEvaluation ? warningEvaluation.reason : "not-evaluated"
    );

    document.dispatchEvent(
      new CustomEvent("chess-time-manager:extension-state", {
        detail: {
          detection: latestDetection,
          turnDetection: latestTurn,
          timerState,
          timerSource: TIMER_SOURCE,
          warningEvaluation,
          settings,
          modules: {
            detector: Boolean(detector),
            turnDetector: Boolean(turnDetector),
            settings: Boolean(settingsApi),
            timer: Boolean(moveTimer),
            warning: Boolean(warningController),
            warningOutput: Boolean(warningOutput)
          }
        }
      })
    );
  }

  function publishWarning() {
    const elapsedMs = timerState ? timerState.elapsedMs : 0;
    const elapsedSeconds = Math.round(elapsedMs / 1000);

    document.dispatchEvent(
      new CustomEvent("chess-time-manager:warning-triggered", {
        detail: {
          title: "Move now",
          message: "You have spent too long on this move.",
          detail: `${elapsedSeconds}s elapsed. Threshold: ${Math.round(
            settings.thresholdMs / 1000
          )}s.`
        }
      })
    );
  }

  function runDetection() {
    scheduledDetectionId = 0;

    const nowMs = Date.now();
    const result = detector.detectChessComLiveGame();
    const turnResult = turnDetector
      ? turnDetector.detectChessComTurn({
          document,
          liveGameDetection: result,
          previousTurn: latestTurn
        })
      : createMissingTurnResult("Turn detector module was not loaded.");

    latestDetection = result;
    latestTurn = turnResult;
    updateTimerAndWarning(turnResult, nowMs);

    const signature = getDetectionSignature(result, turnResult, warningEvaluation);

    if (signature === lastSignature) {
      publishExtensionState();
      return;
    }

    lastSignature = signature;
    publishDetection(result);
    publishExtensionState();
    console.info("[Chess Time Manager] Live game detection:", result);
    console.info("[Chess Time Manager] Turn detection:", turnResult);

    if (warningEvaluation.shouldWarn) {
      publishWarning();
      console.info("[Chess Time Manager] Warning ready:", warningEvaluation);
    }
  }

  function scheduleDetection() {
    // Debounce mutation bursts from Chess.com's reactive UI updates.
    if (scheduledDetectionId) {
      window.clearTimeout(scheduledDetectionId);
    }

    scheduledDetectionId = window.setTimeout(runDetection, MUTATION_DEBOUNCE_MS);
  }

  function observeDomChanges() {
    if (!document.body) {
      window.setTimeout(observeDomChanges, 100);
      return;
    }

    const observer = new MutationObserver(scheduleDetection);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-cy", "data-test-element"]
    });
  }

  function observeLocationChanges() {
    // Chess.com uses client-side navigation, so URL changes may not reload.
    window.setInterval(() => {
      if (window.location.href === lastHref) {
        return;
      }

      lastHref = window.location.href;
      scheduleDetection();
    }, LOCATION_CHECK_INTERVAL_MS);
  }

  function startTimerTicks() {
    window.setInterval(runDetection, TIMER_TICK_INTERVAL_MS);
  }

  function loadSettings() {
    if (!settingsApi) {
      return;
    }

    settingsApi.getSettings((loadedSettings) => {
      settings = loadedSettings;
      scheduleDetection();
    });

    settingsApi.watchSettings((updatedSettings) => {
      settings = updatedSettings;
      if (warningController) {
        warningState = warningController.createWarningState();
      }
      scheduleDetection();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleDetection, { once: true });
  } else {
    scheduleDetection();
  }

  loadSettings();
  observeDomChanges();
  observeLocationChanges();
  startTimerTicks();
})();
