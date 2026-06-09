/*
 * Unit tests for Chess.com live-game URL and DOM detection.
 * Structure: minimal fake document helper followed by focused detection scenarios.
 */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  classifyUrl,
  detectChessComLiveGame
} = require("../../src/content/chesscom-detector.js");

function createFakeDocument(selectorCounts) {
  // Minimal DOM stub: enough for selector-based detection without a browser.
  const counts = new Map(Object.entries(selectorCounts || {}));

  return {
    querySelector(selector) {
      return counts.get(selector) > 0 ? { selector } : null;
    },
    querySelectorAll(selector) {
      return Array.from({ length: counts.get(selector) || 0 }, () => ({
        selector
      }));
    }
  };
}

test("classifies Chess.com live game URLs", () => {
  const result = classifyUrl("https://www.chess.com/game/live/123456789");

  assert.equal(result.isChessCom, true);
  assert.equal(result.isLiveGameUrl, true);
  assert.equal(result.urlKind, "live-game");
});

test("excludes non-Chess.com pages", () => {
  const result = detectChessComLiveGame({
    url: "https://example.com/game/live/123456789",
    document: createFakeDocument({
      "wc-chess-board": 1,
      ".clock-component": 2
    })
  });

  assert.equal(result.isLiveGame, false);
  assert.equal(result.status, "not-chess-com");
});

test("detects a loaded Chess.com live game page", () => {
  const result = detectChessComLiveGame({
    url: "https://www.chess.com/game/live/123456789",
    document: createFakeDocument({
      "wc-chess-board": 1,
      ".clock-component": 2,
      "vertical-move-list": 1
    })
  });

  assert.equal(result.isLiveGame, true);
  assert.equal(result.status, "active-live-game");
  assert.equal(result.evidence.hasBoard, true);
});

test("waits for the board on a live game URL that is still loading", () => {
  const result = detectChessComLiveGame({
    url: "https://www.chess.com/game/live/123456789",
    document: createFakeDocument()
  });

  assert.equal(result.isLiveGame, false);
  assert.equal(result.status, "waiting-for-board");
});

test("detects an active game hosted on the play online page", () => {
  const result = detectChessComLiveGame({
    url: "https://www.chess.com/play/online",
    document: createFakeDocument({
      "wc-chess-board": 1,
      ".clock-component": 2
    })
  });

  assert.equal(result.isLiveGame, true);
  assert.equal(result.status, "active-live-game");
});

test("does not treat analysis pages as active live games", () => {
  const result = detectChessComLiveGame({
    url: "https://www.chess.com/analysis/game/live/123456789",
    document: createFakeDocument({
      "wc-chess-board": 1,
      ".clock-component": 2
    })
  });

  assert.equal(result.isLiveGame, false);
  assert.equal(result.status, "analysis-or-review");
});
