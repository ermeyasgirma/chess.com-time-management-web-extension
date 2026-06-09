/*
 * Tracks elapsed time for the user's current move as a pure state machine.
 * Structure: shared module wrapper, state constants, time helpers, transition helpers, and event reducer.
 */

(function attachMoveTimer(root, factory) {
  const api = factory();

  // Keep the timer usable from browser scripts and from Node unit tests.
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ChessTimeManagerMoveTimer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMoveTimerApi() {
  const TIMER_STATUS = Object.freeze({
    IDLE: "idle",
    USER_TURN: "user-turn",
    OPPONENT_TURN: "opponent-turn",
    GAME_OVER: "game-over"
  });

  function toFiniteNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function normalizeNowMs(nowMs, fallback) {
    return Math.max(0, toFiniteNumber(nowMs, fallback));
  }

  function createMoveTimerState(options) {
    const stateOptions = options || {};
    const nowMs = normalizeNowMs(stateOptions.nowMs, 0);

    return {
      status: TIMER_STATUS.IDLE,
      isUserTurn: false,
      moveId: null,
      moveSequence: 0,
      turnStartedAtMs: null,
      elapsedMs: 0,
      lastUpdatedAtMs: nowMs
    };
  }

  function getMoveKey(state) {
    if (!state) {
      return null;
    }

    return state.moveId || `sequence:${state.moveSequence}`;
  }

  function getElapsedMs(state, nowMs) {
    if (
      !state ||
      state.status !== TIMER_STATUS.USER_TURN ||
      state.turnStartedAtMs === null
    ) {
      return state ? state.elapsedMs : 0;
    }

    // Elapsed time is derived from the original turn start, not accumulated ticks.
    return Math.max(
      0,
      normalizeNowMs(nowMs, state.lastUpdatedAtMs) - state.turnStartedAtMs
    );
  }

  function tickMoveTimer(state, options) {
    const tickOptions = options || {};
    const nowMs = normalizeNowMs(tickOptions.nowMs, state.lastUpdatedAtMs);

    if (state.status !== TIMER_STATUS.USER_TURN) {
      return {
        ...state,
        lastUpdatedAtMs: nowMs
      };
    }

    return {
      ...state,
      elapsedMs: getElapsedMs(state, nowMs),
      lastUpdatedAtMs: nowMs
    };
  }

  function startUserTurn(state, options) {
    const startOptions = options || {};
    const nowMs = normalizeNowMs(startOptions.nowMs, state.lastUpdatedAtMs);
    const nextMoveId = startOptions.moveId || null;

    // Repeated DOM events for the same move should update time, not restart it.
    if (state.status === TIMER_STATUS.USER_TURN && state.moveId === nextMoveId) {
      return tickMoveTimer(state, { nowMs });
    }

    return {
      ...state,
      status: TIMER_STATUS.USER_TURN,
      isUserTurn: true,
      moveId: nextMoveId,
      moveSequence: state.moveSequence + 1,
      turnStartedAtMs: nowMs,
      elapsedMs: 0,
      lastUpdatedAtMs: nowMs
    };
  }

  function endUserTurn(state, options) {
    const endOptions = options || {};
    const nowMs = normalizeNowMs(endOptions.nowMs, state.lastUpdatedAtMs);
    const nextStatus = endOptions.status || TIMER_STATUS.OPPONENT_TURN;
    // Freeze the last known duration so UI can still show the completed move.
    const elapsedMs = getElapsedMs(state, nowMs);

    return {
      ...state,
      status: nextStatus,
      isUserTurn: false,
      turnStartedAtMs: null,
      elapsedMs,
      lastUpdatedAtMs: nowMs
    };
  }

  function resetMoveTimer(options) {
    return createMoveTimerState(options);
  }

  function updateMoveTimer(state, event) {
    const currentState = state || createMoveTimerState();
    const timerEvent = event || { type: "tick" };

    // Future Chess.com DOM code should translate page changes into these events.
    switch (timerEvent.type) {
      case "user-turn-started":
        return startUserTurn(currentState, timerEvent);
      case "user-turn-ended":
        return endUserTurn(currentState, {
          ...timerEvent,
          status: TIMER_STATUS.OPPONENT_TURN
        });
      case "opponent-turn-started":
        return endUserTurn(currentState, {
          ...timerEvent,
          status: TIMER_STATUS.OPPONENT_TURN
        });
      case "game-ended":
        return endUserTurn(currentState, {
          ...timerEvent,
          status: TIMER_STATUS.GAME_OVER
        });
      case "reset":
        return resetMoveTimer(timerEvent);
      case "tick":
      default:
        return tickMoveTimer(currentState, timerEvent);
    }
  }

  return {
    TIMER_STATUS,
    createMoveTimerState,
    endUserTurn,
    getElapsedMs,
    getMoveKey,
    resetMoveTimer,
    startUserTurn,
    tickMoveTimer,
    updateMoveTimer
  };
});
