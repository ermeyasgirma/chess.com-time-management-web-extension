/*
 * Decides when a move-time warning should fire from timer state and settings.
 * Structure: shared module wrapper, default settings, state helpers, setting normalization, and warning evaluation.
 */

(function attachWarningController(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ChessTimeManagerWarningController = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createWarningControllerApi() {
  const DEFAULT_WARNING_SETTINGS = Object.freeze({
    enabled: true,
    thresholdMs: 15000,
    cooldownMs: 8000,
    maxWarningsPerMove: 1
  });

  function toFiniteNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function clampNumber(value, minimum, fallback) {
    return Math.max(minimum, toFiniteNumber(value, fallback));
  }

  function createWarningState(options) {
    const stateOptions = options || {};

    return {
      lastWarningAtMs: null,
      warningsByMoveKey: {},
      warningCount: 0,
      lastReason: stateOptions.lastReason || "not-evaluated"
    };
  }

  function normalizeWarningSettings(settings) {
    const rawSettings = settings || {};

    // Settings may eventually come from user input, so clamp them before use.
    return {
      enabled: rawSettings.enabled !== false,
      thresholdMs: clampNumber(
        rawSettings.thresholdMs,
        0,
        DEFAULT_WARNING_SETTINGS.thresholdMs
      ),
      cooldownMs: clampNumber(
        rawSettings.cooldownMs,
        0,
        DEFAULT_WARNING_SETTINGS.cooldownMs
      ),
      maxWarningsPerMove: clampNumber(
        rawSettings.maxWarningsPerMove,
        1,
        DEFAULT_WARNING_SETTINGS.maxWarningsPerMove
      )
    };
  }

  function getTimerMoveKey(timerState) {
    if (!timerState) {
      return null;
    }

    return timerState.moveId || `sequence:${timerState.moveSequence}`;
  }

  function withReason(warningState, reason) {
    return {
      ...warningState,
      lastReason: reason
    };
  }

  function evaluateMoveWarning(options) {
    const evaluationOptions = options || {};
    const timerState = evaluationOptions.timerState;
    const warningState = evaluationOptions.warningState || createWarningState();
    const settings = normalizeWarningSettings(evaluationOptions.settings);
    const nowMs = clampNumber(evaluationOptions.nowMs, 0, 0);

    if (!settings.enabled) {
      return {
        shouldWarn: false,
        reason: "disabled",
        warningState: withReason(warningState, "disabled")
      };
    }

    if (!timerState || !timerState.isUserTurn) {
      return {
        shouldWarn: false,
        reason: "not-user-turn",
        warningState: withReason(warningState, "not-user-turn")
      };
    }

    if (timerState.elapsedMs < settings.thresholdMs) {
      return {
        shouldWarn: false,
        reason: "before-threshold",
        warningState: withReason(warningState, "before-threshold")
      };
    }

    const moveKey = getTimerMoveKey(timerState);
    const warningsForMove = warningState.warningsByMoveKey[moveKey] || 0;

    // The MVP defaults to one reminder per move to avoid annoying spam.
    if (warningsForMove >= settings.maxWarningsPerMove) {
      return {
        shouldWarn: false,
        reason: "move-warning-limit-reached",
        warningState: withReason(warningState, "move-warning-limit-reached")
      };
    }

    // A global cooldown prevents rapid warnings if moves change quickly.
    if (
      warningState.lastWarningAtMs !== null &&
      nowMs - warningState.lastWarningAtMs < settings.cooldownMs
    ) {
      return {
        shouldWarn: false,
        reason: "cooldown-active",
        warningState: withReason(warningState, "cooldown-active")
      };
    }

    // State changes only when a warning actually fires.
    const nextWarningState = {
      lastWarningAtMs: nowMs,
      warningsByMoveKey: {
        ...warningState.warningsByMoveKey,
        [moveKey]: warningsForMove + 1
      },
      warningCount: warningState.warningCount + 1,
      lastReason: "warning-fired"
    };

    return {
      shouldWarn: true,
      reason: "warning-fired",
      moveKey,
      elapsedMs: timerState.elapsedMs,
      warningState: nextWarningState
    };
  }

  return {
    DEFAULT_WARNING_SETTINGS,
    createWarningState,
    evaluateMoveWarning,
    normalizeWarningSettings
  };
});
