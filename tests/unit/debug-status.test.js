/*
 * Unit tests for debug overlay status formatting.
 * Structure: duration formatting, empty-state rows, and live-game diagnostic rows.
 */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildDebugStatus,
  formatBoolean,
  formatDurationMs
} = require("../../src/shared/debug-status.js");

function findRow(status, label) {
  return status.rows.find((row) => row.label === label);
}

test("formats boolean values for debug display", () => {
  assert.equal(formatBoolean(true), "yes");
  assert.equal(formatBoolean(false), "no");
  assert.equal(formatBoolean(undefined), "unknown");
});

test("formats millisecond durations for compact display", () => {
  assert.equal(formatDurationMs(0), "0.0s");
  assert.equal(formatDurationMs(12500), "12.5s");
  assert.equal(formatDurationMs(65000), "1m 5s");
  assert.equal(formatDurationMs(Number.NaN), "n/a");
});

test("builds a useful status before live-game detection has reported", () => {
  const status = buildDebugStatus({
    modules: {
      detector: true,
      turnDetector: true,
      settings: true,
      timer: true,
      warning: true,
      warningOutput: true
    },
    settings: {
      thresholdMs: 15000,
      cooldownMs: 8000,
      warningMode: "visual-and-audio",
      volumePercent: 80
    },
    nowMs: 1000
  });

  assert.equal(status.updatedAtMs, 1000);
  assert.equal(findRow(status, "Extension").value, "loaded");
  assert.equal(findRow(status, "Warning output module").value, "loaded");
  assert.equal(findRow(status, "Live game").value, "waiting for detection");
  assert.equal(findRow(status, "User-turn detection").value, "waiting for turn detection");
  assert.equal(findRow(status, "Move timer").value, "unavailable");
  assert.equal(findRow(status, "Audio playback").value, "not played");
  assert.equal(findRow(status, "Module self-test").value, "not run");
});

test("builds live-game, timer, and warning diagnostic rows", () => {
  const status = buildDebugStatus({
    modules: {
      detector: true,
      turnDetector: true,
      settings: true,
      timer: true,
      warning: true,
      warningOutput: true
    },
    detection: {
      isLiveGame: true,
      status: "active-live-game",
      reason: "The URL and board indicate a Chess.com live game.",
      url: {
        isChessCom: true
      },
      evidence: {
        hasBoard: true,
        boardSelector: "wc-chess-board",
        hasClockEvidence: true,
        clockMatchCount: 2
      }
    },
    turnDetection: {
      status: "user-turn",
      reason: "The bottom/player clock appears active.",
      evidence: {
        bottom: {
          selector: ".clock-bottom"
        },
        top: {
          selector: ".clock-top"
        }
      }
    },
    timerSource: "self-test",
    timerState: {
      status: "user-turn",
      isUserTurn: true,
      moveId: "debug:self-test",
      moveSequence: 1,
      elapsedMs: 15000
    },
    warningEvaluation: {
      shouldWarn: true,
      reason: "warning-fired"
    },
    settings: {
      thresholdMs: 15000,
      cooldownMs: 8000,
      warningMode: "audio-only",
      volumePercent: 45
    },
    audioStatus: {
      status: "playing",
      reason: "audio started"
    },
    selfTest: {
      status: "pass",
      message: "Timer reached threshold and warning fired."
    },
    nowMs: 2000
  });

  assert.equal(findRow(status, "Chess.com page").value, "yes");
  assert.equal(findRow(status, "Live game").value, "active-live-game");
  assert.equal(findRow(status, "Board").detail, "wc-chess-board");
  assert.equal(findRow(status, "Clock evidence").value, "2 matches");
  assert.equal(findRow(status, "User-turn detection").value, "user-turn");
  assert.equal(findRow(status, "Turn evidence").value, "bottom: .clock-bottom, top: .clock-top");
  assert.equal(findRow(status, "Timer source").value, "self-test");
  assert.equal(findRow(status, "Move timer").value, "user-turn, 15.0s");
  assert.equal(findRow(status, "Warning").value, "warning-fired");
  assert.equal(findRow(status, "Warning mode").value, "audio-only");
  assert.equal(findRow(status, "Audio volume").value, "45%");
  assert.equal(findRow(status, "Audio playback").value, "playing");
  assert.equal(findRow(status, "Module self-test").value, "pass");
});
