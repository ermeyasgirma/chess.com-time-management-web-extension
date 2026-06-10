/*
 * Infers whose turn it is on a detected Chess.com live game page.
 * Structure: shared module wrapper, clock selectors, DOM evidence helpers, turn classification, and timer-event mapping.
 */

(function attachChessComTurnDetector(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ChessTimeManagerTurnDetector = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTurnDetector() {
  const BOTTOM_CLOCK_SELECTORS = [
    "[data-cy='clock-bottom']",
    "[data-test-element='clock-bottom']",
    ".clock-bottom",
    "[class*='clock-bottom']",
    "[class*='clock-component-bottom']"
  ];

  const TOP_CLOCK_SELECTORS = [
    "[data-cy='clock-top']",
    "[data-test-element='clock-top']",
    ".clock-top",
    "[class*='clock-top']",
    "[class*='clock-component-top']"
  ];

  const FALLBACK_CLOCK_SELECTORS = [
    ".clock-component",
    "[class*='clock-component']",
    "[data-cy*='clock']",
    "[data-test-element*='clock']"
  ];

  const ACTIVE_TEXT_PATTERNS = [
    "active",
    "clock-player-turn",
    "current",
    "running",
    "ticking",
    "turn"
  ];

  const INACTIVE_TEXT_PATTERNS = [
    "inactive",
    "paused",
    "stopped",
    "disabled",
    "game-over"
  ];

  const GAME_OVER_SELECTORS = [
    ".game-over-modal",
    ".game-over-component",
    "[class*='game-over']",
    "[data-cy*='game-over']",
    "[data-test-element*='game-over']"
  ];

  function findFirstElement(documentRef, selectors) {
    if (!documentRef || typeof documentRef.querySelector !== "function") {
      return {
        element: null,
        selector: null
      };
    }

    for (const selector of selectors) {
      try {
        const element = documentRef.querySelector(selector);

        if (element) {
          return {
            element,
            selector
          };
        }
      } catch (_error) {
        // Ignore selector failures because Chess.com class names can change.
      }
    }

    return {
      element: null,
      selector: null
    };
  }

  function findFallbackClockPair(documentRef) {
    if (!documentRef || typeof documentRef.querySelectorAll !== "function") {
      return {
        bottom: null,
        top: null
      };
    }

    for (const selector of FALLBACK_CLOCK_SELECTORS) {
      try {
        const clocks = Array.from(documentRef.querySelectorAll(selector));

        if (clocks.length >= 2) {
          return {
            top: {
              element: clocks[0],
              selector
            },
            bottom: {
              element: clocks[clocks.length - 1],
              selector
            }
          };
        }
      } catch (_error) {
        // Try the next fallback selector.
      }
    }

    return {
      bottom: null,
      top: null
    };
  }

  function getAttributeText(element) {
    if (!element) {
      return "";
    }

    const attributes = [
      "class",
      "data-state",
      "data-status",
      "data-turn",
      "aria-label",
      "title"
    ];

    return attributes
      .map((attribute) => {
        if (typeof element.getAttribute === "function") {
          return element.getAttribute(attribute) || "";
        }

        if (attribute === "class") {
          return element.className || "";
        }

        return "";
      })
      .join(" ")
      .toLowerCase();
  }

  function includesPattern(text, patterns) {
    return patterns.some((pattern) => text.includes(pattern));
  }

  function getClockActivity(clock) {
    if (!clock || !clock.element) {
      return {
        isActive: false,
        reason: "missing-clock"
      };
    }

    const attributeText = getAttributeText(clock.element);

    if (includesPattern(attributeText, INACTIVE_TEXT_PATTERNS)) {
      return {
        isActive: false,
        reason: "inactive-pattern",
        attributeText
      };
    }

    if (includesPattern(attributeText, ACTIVE_TEXT_PATTERNS)) {
      return {
        isActive: true,
        reason: "active-pattern",
        attributeText
      };
    }

    return {
      isActive: false,
      reason: "no-active-pattern",
      attributeText
    };
  }

  function hasGameOverEvidence(documentRef) {
    return Boolean(findFirstElement(documentRef, GAME_OVER_SELECTORS).element);
  }

  function getClockEvidence(documentRef) {
    const explicitBottom = findFirstElement(documentRef, BOTTOM_CLOCK_SELECTORS);
    const explicitTop = findFirstElement(documentRef, TOP_CLOCK_SELECTORS);
    const fallbackPair =
      explicitBottom.element && explicitTop.element
        ? { bottom: null, top: null }
        : findFallbackClockPair(documentRef);

    const bottom = explicitBottom.element ? explicitBottom : fallbackPair.bottom;
    const top = explicitTop.element ? explicitTop : fallbackPair.top;

    return {
      bottom,
      top,
      bottomActivity: getClockActivity(bottom),
      topActivity: getClockActivity(top)
    };
  }

  function getMoveId(liveGameDetection, turnSequence) {
    const href = liveGameDetection && liveGameDetection.url && liveGameDetection.url.href;
    const gameIdMatch = href && href.match(/\/game\/live\/(\d+)/);
    const gameId = gameIdMatch ? gameIdMatch[1] : "unknown-game";

    return `${gameId}:turn-${turnSequence}`;
  }

  function detectChessComTurn(options) {
    const detectionOptions = options || {};
    const documentRef =
      detectionOptions.document ||
      (typeof document !== "undefined" ? document : undefined);
    const liveGameDetection = detectionOptions.liveGameDetection || null;
    const previousTurn = detectionOptions.previousTurn || null;
    const turnSequence = previousTurn ? previousTurn.turnSequence || 0 : 0;

    if (!liveGameDetection || !liveGameDetection.isLiveGame) {
      return {
        status: "not-live-game",
        isUserTurn: false,
        timerEventType: "reset",
        moveId: null,
        turnSequence,
        reason: "No active live game has been detected.",
        evidence: {}
      };
    }

    if (hasGameOverEvidence(documentRef)) {
      return {
        status: "game-over",
        isUserTurn: false,
        timerEventType: "game-ended",
        moveId: previousTurn ? previousTurn.moveId : null,
        turnSequence,
        reason: "Game-over UI was detected.",
        evidence: {}
      };
    }

    const clockEvidence = getClockEvidence(documentRef);
    const isBottomActive = clockEvidence.bottomActivity.isActive;
    const isTopActive = clockEvidence.topActivity.isActive;

    if (isBottomActive && !isTopActive) {
      const nextTurnSequence =
        previousTurn && previousTurn.status === "user-turn"
          ? turnSequence
          : turnSequence + 1;

      return {
        status: "user-turn",
        isUserTurn: true,
        timerEventType: "user-turn-started",
        moveId:
          previousTurn && previousTurn.status === "user-turn"
            ? previousTurn.moveId
            : getMoveId(liveGameDetection, nextTurnSequence),
        turnSequence: nextTurnSequence,
        reason: "The bottom/player clock appears active.",
        evidence: clockEvidence
      };
    }

    if (isTopActive && !isBottomActive) {
      return {
        status: "opponent-turn",
        isUserTurn: false,
        timerEventType: "opponent-turn-started",
        moveId: previousTurn ? previousTurn.moveId : null,
        turnSequence,
        reason: "The top/opponent clock appears active.",
        evidence: clockEvidence
      };
    }

    return {
      status: "unknown",
      isUserTurn: false,
      timerEventType: "tick",
      moveId: previousTurn ? previousTurn.moveId : null,
      turnSequence,
      reason: "No clear active clock signal was found.",
      evidence: clockEvidence
    };
  }

  return {
    BOTTOM_CLOCK_SELECTORS,
    TOP_CLOCK_SELECTORS,
    detectChessComTurn,
    getClockActivity,
    getClockEvidence
  };
});
