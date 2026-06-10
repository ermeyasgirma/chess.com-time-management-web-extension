/*
 * Unit tests for Chess.com turn detection heuristics.
 * Structure: fake DOM helpers followed by live-game, user-turn, opponent-turn, game-over, and unknown-state cases.
 */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  detectChessComTurn,
  getClockActivity
} = require("../../src/content/chesscom-turn-detector.js");

function createFakeElement(attributes) {
  const safeAttributes = attributes || {};

  return {
    className: safeAttributes.class || "",
    getAttribute(attribute) {
      return safeAttributes[attribute] || null;
    }
  };
}

function createFakeDocument(selectorMap) {
  const elements = new Map(Object.entries(selectorMap || {}));

  return {
    querySelector(selector) {
      const value = elements.get(selector);

      if (Array.isArray(value)) {
        return value[0] || null;
      }

      return value || null;
    },
    querySelectorAll(selector) {
      const value = elements.get(selector);

      if (Array.isArray(value)) {
        return value;
      }

      return value ? [value] : [];
    }
  };
}

function createLiveGameDetection() {
  return {
    isLiveGame: true,
    url: {
      href: "https://www.chess.com/game/live/123456789"
    }
  };
}

test("marks missing live-game detection as a reset", () => {
  const result = detectChessComTurn({
    liveGameDetection: null,
    document: createFakeDocument()
  });

  assert.equal(result.status, "not-live-game");
  assert.equal(result.timerEventType, "reset");
  assert.equal(result.isUserTurn, false);
});

test("detects active bottom clock as the user's turn", () => {
  const result = detectChessComTurn({
    liveGameDetection: createLiveGameDetection(),
    document: createFakeDocument({
      ".clock-bottom": createFakeElement({
        class: "clock-bottom clock-player-turn"
      }),
      ".clock-top": createFakeElement({
        class: "clock-top"
      })
    })
  });

  assert.equal(result.status, "user-turn");
  assert.equal(result.timerEventType, "user-turn-started");
  assert.equal(result.isUserTurn, true);
  assert.equal(result.moveId, "123456789:turn-1");
  assert.equal(result.turnSequence, 1);
});

test("keeps the same move id for repeated user-turn detections", () => {
  const previousTurn = {
    status: "user-turn",
    moveId: "123456789:turn-4",
    turnSequence: 4
  };

  const result = detectChessComTurn({
    liveGameDetection: createLiveGameDetection(),
    previousTurn,
    document: createFakeDocument({
      ".clock-bottom": createFakeElement({
        class: "clock-bottom active"
      }),
      ".clock-top": createFakeElement({
        class: "clock-top"
      })
    })
  });

  assert.equal(result.status, "user-turn");
  assert.equal(result.moveId, "123456789:turn-4");
  assert.equal(result.turnSequence, 4);
});

test("detects active top clock as the opponent's turn", () => {
  const result = detectChessComTurn({
    liveGameDetection: createLiveGameDetection(),
    previousTurn: {
      status: "user-turn",
      moveId: "123456789:turn-2",
      turnSequence: 2
    },
    document: createFakeDocument({
      ".clock-bottom": createFakeElement({
        class: "clock-bottom"
      }),
      ".clock-top": createFakeElement({
        class: "clock-top running"
      })
    })
  });

  assert.equal(result.status, "opponent-turn");
  assert.equal(result.timerEventType, "opponent-turn-started");
  assert.equal(result.isUserTurn, false);
  assert.equal(result.moveId, "123456789:turn-2");
});

test("detects game-over UI before clock activity", () => {
  const result = detectChessComTurn({
    liveGameDetection: createLiveGameDetection(),
    document: createFakeDocument({
      ".game-over-modal": createFakeElement(),
      ".clock-bottom": createFakeElement({
        class: "clock-bottom active"
      })
    })
  });

  assert.equal(result.status, "game-over");
  assert.equal(result.timerEventType, "game-ended");
});

test("falls back to unknown when there is no clear active clock", () => {
  const result = detectChessComTurn({
    liveGameDetection: createLiveGameDetection(),
    document: createFakeDocument({
      ".clock-bottom": createFakeElement({
        class: "clock-bottom"
      }),
      ".clock-top": createFakeElement({
        class: "clock-top"
      })
    })
  });

  assert.equal(result.status, "unknown");
  assert.equal(result.timerEventType, "tick");
  assert.equal(result.isUserTurn, false);
});

test("clock activity ignores explicit inactive patterns", () => {
  const activity = getClockActivity({
    element: createFakeElement({
      class: "clock-bottom active paused"
    }),
    selector: ".clock-bottom"
  });

  assert.equal(activity.isActive, false);
  assert.equal(activity.reason, "inactive-pattern");
});
