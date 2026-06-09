/*
 * Unit tests for warning decisions based on timer state and user settings.
 * Structure: threshold behavior, disabled state, per-move limits, cooldown, and setting normalization.
 */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createWarningState,
  evaluateMoveWarning,
  normalizeWarningSettings
} = require("../../src/shared/warning-controller.js");

function createUserTurnTimerState(overrides) {
  // Compact fixture keeps warning tests focused on decisions, not timer setup.
  return {
    status: "user-turn",
    isUserTurn: true,
    moveId: "game-1:ply-12",
    moveSequence: 1,
    turnStartedAtMs: 0,
    elapsedMs: 0,
    lastUpdatedAtMs: 0,
    ...(overrides || {})
  };
}

test("does not warn before the configured threshold", () => {
  const result = evaluateMoveWarning({
    timerState: createUserTurnTimerState({ elapsedMs: 9000 }),
    warningState: createWarningState(),
    settings: {
      thresholdMs: 10000,
      cooldownMs: 0
    },
    nowMs: 9000
  });

  assert.equal(result.shouldWarn, false);
  assert.equal(result.reason, "before-threshold");
});

test("fires once the move reaches the configured threshold", () => {
  const result = evaluateMoveWarning({
    timerState: createUserTurnTimerState({ elapsedMs: 10000 }),
    warningState: createWarningState(),
    settings: {
      thresholdMs: 10000,
      cooldownMs: 0
    },
    nowMs: 10000
  });

  assert.equal(result.shouldWarn, true);
  assert.equal(result.reason, "warning-fired");
  assert.equal(result.moveKey, "game-1:ply-12");
  assert.equal(result.warningState.warningCount, 1);
});

test("does not fire when warnings are disabled", () => {
  const result = evaluateMoveWarning({
    timerState: createUserTurnTimerState({ elapsedMs: 30000 }),
    warningState: createWarningState(),
    settings: {
      enabled: false,
      thresholdMs: 10000
    },
    nowMs: 30000
  });

  assert.equal(result.shouldWarn, false);
  assert.equal(result.reason, "disabled");
});

test("does not fire when it is not the user's turn", () => {
  const result = evaluateMoveWarning({
    timerState: createUserTurnTimerState({
      isUserTurn: false,
      elapsedMs: 30000
    }),
    warningState: createWarningState(),
    settings: {
      thresholdMs: 10000
    },
    nowMs: 30000
  });

  assert.equal(result.shouldWarn, false);
  assert.equal(result.reason, "not-user-turn");
});

test("limits warnings to one per move by default", () => {
  let warningState = createWarningState();

  const firstResult = evaluateMoveWarning({
    timerState: createUserTurnTimerState({ elapsedMs: 15000 }),
    warningState,
    settings: {
      thresholdMs: 10000,
      cooldownMs: 0
    },
    nowMs: 15000
  });

  warningState = firstResult.warningState;

  const secondResult = evaluateMoveWarning({
    timerState: createUserTurnTimerState({ elapsedMs: 20000 }),
    warningState,
    settings: {
      thresholdMs: 10000,
      cooldownMs: 0
    },
    nowMs: 20000
  });

  assert.equal(firstResult.shouldWarn, true);
  assert.equal(secondResult.shouldWarn, false);
  assert.equal(secondResult.reason, "move-warning-limit-reached");
});

test("uses cooldown across different moves", () => {
  let warningState = createWarningState();

  const firstResult = evaluateMoveWarning({
    timerState: createUserTurnTimerState({
      moveId: "game-1:ply-12",
      elapsedMs: 12000
    }),
    warningState,
    settings: {
      thresholdMs: 10000,
      cooldownMs: 8000
    },
    nowMs: 12000
  });

  warningState = firstResult.warningState;

  const secondResult = evaluateMoveWarning({
    timerState: createUserTurnTimerState({
      moveId: "game-1:ply-14",
      moveSequence: 2,
      elapsedMs: 11000
    }),
    warningState,
    settings: {
      thresholdMs: 10000,
      cooldownMs: 8000
    },
    nowMs: 15000
  });

  const thirdResult = evaluateMoveWarning({
    timerState: createUserTurnTimerState({
      moveId: "game-1:ply-14",
      moveSequence: 2,
      elapsedMs: 19000
    }),
    warningState: secondResult.warningState,
    settings: {
      thresholdMs: 10000,
      cooldownMs: 8000
    },
    nowMs: 21000
  });

  assert.equal(firstResult.shouldWarn, true);
  assert.equal(secondResult.shouldWarn, false);
  assert.equal(secondResult.reason, "cooldown-active");
  assert.equal(thirdResult.shouldWarn, true);
});

test("normalizes unsafe warning settings", () => {
  const settings = normalizeWarningSettings({
    enabled: true,
    thresholdMs: -10,
    cooldownMs: -20,
    maxWarningsPerMove: 0
  });

  assert.equal(settings.enabled, true);
  assert.equal(settings.thresholdMs, 0);
  assert.equal(settings.cooldownMs, 0);
  assert.equal(settings.maxWarningsPerMove, 1);
});
