/*
 * Builds display-ready diagnostic rows for the extension debug overlay.
 * Structure: shared module wrapper, formatting helpers, row builders, and a single status builder.
 */

(function attachDebugStatus(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ChessTimeManagerDebugStatus = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDebugStatusApi() {
  function formatBoolean(value) {
    if (value === true) {
      return "yes";
    }

    if (value === false) {
      return "no";
    }

    return "unknown";
  }

  function formatDurationMs(value) {
    if (!Number.isFinite(value)) {
      return "n/a";
    }

    const safeMs = Math.max(0, value);
    const seconds = safeMs / 1000;

    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  function createRow(label, value, tone, detail) {
    return {
      label,
      value: String(value),
      tone: tone || "neutral",
      detail: detail || ""
    };
  }

  function getNowMs(value) {
    return Number.isFinite(value) ? value : Date.now();
  }

  function getModuleTone(isLoaded) {
    return isLoaded ? "good" : "bad";
  }

  function getBooleanTone(value) {
    if (value === true) {
      return "good";
    }

    if (value === false) {
      return "bad";
    }

    return "muted";
  }

  function getLiveGameTone(detection) {
    if (!detection) {
      return "muted";
    }

    if (detection.isLiveGame) {
      return "good";
    }

    if (detection.status && detection.status.startsWith("waiting")) {
      return "warn";
    }

    return "muted";
  }

  function buildDetectionRows(detection) {
    if (!detection) {
      return [
        createRow("Chess.com page", "unknown", "muted"),
        createRow("Live game", "waiting for detection", "muted"),
        createRow("Board", "unknown", "muted"),
        createRow("Clock evidence", "unknown", "muted")
      ];
    }

    const evidence = detection.evidence || {};
    const url = detection.url || {};

    return [
      createRow(
        "Chess.com page",
        formatBoolean(url.isChessCom),
        getBooleanTone(url.isChessCom)
      ),
      createRow(
        "Live game",
        detection.status,
        getLiveGameTone(detection),
        detection.reason
      ),
      createRow(
        "Board",
        evidence.hasBoard ? "detected" : "missing",
        evidence.hasBoard ? "good" : "warn",
        evidence.boardSelector || ""
      ),
      createRow(
        "Clock evidence",
        `${evidence.clockMatchCount || 0} matches`,
        evidence.hasClockEvidence ? "good" : "muted"
      )
    ];
  }

  function buildModuleRows(modules) {
    const moduleState = modules || {};

    return [
      createRow("Extension", "loaded", "good"),
      createRow(
        "Detector module",
        moduleState.detector ? "loaded" : "missing",
        getModuleTone(moduleState.detector)
      ),
      createRow(
        "Turn detector module",
        moduleState.turnDetector ? "loaded" : "missing",
        getModuleTone(moduleState.turnDetector)
      ),
      createRow(
        "Settings module",
        moduleState.settings ? "loaded" : "missing",
        getModuleTone(moduleState.settings)
      ),
      createRow(
        "Timer module",
        moduleState.timer ? "loaded" : "missing",
        getModuleTone(moduleState.timer)
      ),
      createRow(
        "Warning module",
        moduleState.warning ? "loaded" : "missing",
        getModuleTone(moduleState.warning)
      )
    ];
  }

  function getTurnTone(turnDetection) {
    if (!turnDetection) {
      return "muted";
    }

    if (turnDetection.status === "user-turn") {
      return "good";
    }

    if (turnDetection.status === "unknown") {
      return "warn";
    }

    if (turnDetection.status === "unavailable") {
      return "bad";
    }

    return "neutral";
  }

  function getTurnEvidenceDetail(turnDetection) {
    if (!turnDetection || !turnDetection.evidence) {
      return "";
    }

    const evidence = turnDetection.evidence;
    const bottomSelector = evidence.bottom && evidence.bottom.selector;
    const topSelector = evidence.top && evidence.top.selector;

    return [bottomSelector && `bottom: ${bottomSelector}`, topSelector && `top: ${topSelector}`]
      .filter(Boolean)
      .join(", ");
  }

  function buildTurnRows(turnDetection) {
    if (!turnDetection) {
      return [
        createRow("User-turn detection", "waiting for turn detection", "muted"),
        createRow("Turn evidence", "unknown", "muted")
      ];
    }

    return [
      createRow(
        "User-turn detection",
        turnDetection.status,
        getTurnTone(turnDetection),
        turnDetection.reason
      ),
      createRow(
        "Turn evidence",
        getTurnEvidenceDetail(turnDetection) || "no clock selectors",
        getTurnTone(turnDetection)
      )
    ];
  }

  function buildTimerRows(timerState, timerSource) {
    if (!timerState) {
      return [
        createRow("Timer source", timerSource || "not connected", "muted"),
        createRow("Move timer", "unavailable", "bad")
      ];
    }

    return [
      createRow("Timer source", timerSource || "not connected", "muted"),
      createRow(
        "Move timer",
        `${timerState.status}, ${formatDurationMs(timerState.elapsedMs)}`,
        timerState.isUserTurn ? "good" : "neutral",
        timerState.moveId || ""
      )
    ];
  }

  function buildWarningRows(warningEvaluation, settings) {
    const safeSettings = settings || {};

    return [
      createRow(
        "Warning",
        warningEvaluation ? warningEvaluation.reason : "not evaluated",
        warningEvaluation && warningEvaluation.shouldWarn ? "good" : "neutral"
      ),
      createRow("Threshold", formatDurationMs(safeSettings.thresholdMs), "neutral"),
      createRow("Cooldown", formatDurationMs(safeSettings.cooldownMs), "neutral")
    ];
  }

  function buildSelfTestRow(selfTest) {
    const safeSelfTest = selfTest || {};
    const status = safeSelfTest.status || "not run";
    const tone =
      status === "pass" ? "good" : status === "fail" ? "bad" : "muted";

    return createRow("Module self-test", status, tone, safeSelfTest.message || "");
  }

  function buildDebugStatus(options) {
    const statusOptions = options || {};

    return {
      title: "Chess Time Manager Debug",
      updatedAtMs: getNowMs(statusOptions.nowMs),
      rows: [
        ...buildModuleRows(statusOptions.modules),
        ...buildDetectionRows(statusOptions.detection),
        ...buildTurnRows(statusOptions.turnDetection),
        ...buildTimerRows(statusOptions.timerState, statusOptions.timerSource),
        ...buildWarningRows(statusOptions.warningEvaluation, statusOptions.settings),
        buildSelfTestRow(statusOptions.selfTest)
      ]
    };
  }

  return {
    buildDebugStatus,
    formatBoolean,
    formatDurationMs
  };
});
