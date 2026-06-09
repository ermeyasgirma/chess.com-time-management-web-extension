/*
 * Unit tests for the move timer state machine.
 * Structure: timer startup, elapsed time updates, duplicate move handling, turn ending, and reset behavior.
 */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  TIMER_STATUS,
  createMoveTimerState,
  updateMoveTimer
} = require("../../src/shared/move-timer.js");

test("starts timing when the user's turn begins", () => {
  const initialState = createMoveTimerState({ nowMs: 1000 });
  const state = updateMoveTimer(initialState, {
    type: "user-turn-started",
    moveId: "game-1:ply-12",
    nowMs: 2500
  });

  assert.equal(state.status, TIMER_STATUS.USER_TURN);
  assert.equal(state.isUserTurn, true);
  assert.equal(state.moveId, "game-1:ply-12");
  assert.equal(state.turnStartedAtMs, 2500);
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.moveSequence, 1);
});

test("updates elapsed time while it is the user's turn", () => {
  let state = createMoveTimerState({ nowMs: 0 });

  state = updateMoveTimer(state, {
    type: "user-turn-started",
    moveId: "game-1:ply-20",
    nowMs: 1000
  });

  state = updateMoveTimer(state, {
    type: "tick",
    nowMs: 6500
  });

  assert.equal(state.elapsedMs, 5500);
  assert.equal(state.status, TIMER_STATUS.USER_TURN);
});

test("does not restart timing for duplicate start events on the same move", () => {
  let state = createMoveTimerState({ nowMs: 0 });

  // This mirrors repeated DOM notifications while the same move is active.
  state = updateMoveTimer(state, {
    type: "user-turn-started",
    moveId: "game-1:ply-24",
    nowMs: 1000
  });

  state = updateMoveTimer(state, {
    type: "user-turn-started",
    moveId: "game-1:ply-24",
    nowMs: 4000
  });

  assert.equal(state.turnStartedAtMs, 1000);
  assert.equal(state.elapsedMs, 3000);
  assert.equal(state.moveSequence, 1);
});

test("starts a fresh timer for a new user move", () => {
  let state = createMoveTimerState({ nowMs: 0 });

  state = updateMoveTimer(state, {
    type: "user-turn-started",
    moveId: "game-1:ply-30",
    nowMs: 1000
  });

  state = updateMoveTimer(state, {
    type: "user-turn-started",
    moveId: "game-1:ply-32",
    nowMs: 7000
  });

  assert.equal(state.moveId, "game-1:ply-32");
  assert.equal(state.turnStartedAtMs, 7000);
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.moveSequence, 2);
});

test("freezes elapsed time when the user's turn ends", () => {
  let state = createMoveTimerState({ nowMs: 0 });

  state = updateMoveTimer(state, {
    type: "user-turn-started",
    moveId: "game-1:ply-40",
    nowMs: 10000
  });

  state = updateMoveTimer(state, {
    type: "user-turn-ended",
    nowMs: 18000
  });

  assert.equal(state.status, TIMER_STATUS.OPPONENT_TURN);
  assert.equal(state.isUserTurn, false);
  assert.equal(state.turnStartedAtMs, null);
  assert.equal(state.elapsedMs, 8000);
});

test("resets back to an idle state", () => {
  let state = createMoveTimerState({ nowMs: 0 });

  state = updateMoveTimer(state, {
    type: "user-turn-started",
    moveId: "game-1:ply-50",
    nowMs: 1000
  });

  state = updateMoveTimer(state, {
    type: "reset",
    nowMs: 9000
  });

  assert.equal(state.status, TIMER_STATUS.IDLE);
  assert.equal(state.isUserTurn, false);
  assert.equal(state.moveId, null);
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.lastUpdatedAtMs, 9000);
});
