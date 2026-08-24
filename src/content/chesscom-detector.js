/*
 * Detects whether the current page looks like an active Chess.com live game.
 * Structure: shared module wrapper, selector constants, URL helpers, DOM evidence checks, and final status classification.
 */

(function attachChessComDetector(root, factory) {
  const api = factory();

  // Keep one detector usable both as a browser global and as a Node test module.
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ChessTimeManagerDetector = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDetector() {
  // Chess.com's DOM can change, so detection relies on several weak signals.
  const BOARD_SELECTORS = [
    "wc-chess-board",
    "chess-board",
    "[data-cy='board']",
    "[data-test-element='board']",
    ".board"
  ];

  const CLOCK_SELECTORS = [
    ".clock-component",
    ".clock-white",
    ".clock-black",
    "[class*='clock-component']",
    "[data-cy*='clock']",
    "[data-test-element*='clock']"
  ];

  const LIVE_PANEL_SELECTORS = [
    "vertical-move-list",
    ".move-list",
    ".game-controls-component",
    "[class*='game-controls']",
    "[class*='live-game']"
  ];

  function toUrl(value) {
    if (value instanceof URL) {
      return value;
    }

    try {
      return new URL(value || "about:blank");
    } catch (_error) {
      return new URL("about:blank");
    }
  }

  function normalizeHost(hostname) {
    return String(hostname || "").replace(/^www\./, "").toLowerCase();
  }

  function getPathname(url) {
    const pathname = url.pathname || "/";
    return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  }

  function getFirstMatchingSelector(documentRef, selectors) {
    if (!documentRef || typeof documentRef.querySelector !== "function") {
      return null;
    }

    for (const selector of selectors) {
      try {
        if (documentRef.querySelector(selector)) {
          return selector;
        }
      } catch (_error) {
        // Ignore selector failures so one stale selector does not break detection.
      }
    }

    return null;
  }

  function countSelectorMatches(documentRef, selectors) {
    if (!documentRef || typeof documentRef.querySelectorAll !== "function") {
      return 0;
    }

    return selectors.reduce((count, selector) => {
      try {
        return count + documentRef.querySelectorAll(selector).length;
      } catch (_error) {
        return count;
      }
    }, 0);
  }

  function classifyUrl(urlInput) {
    const url = toUrl(urlInput);
    const host = normalizeHost(url.hostname);
    const pathname = getPathname(url);

    // URL classification is a fast first pass; DOM evidence confirms readiness.
    const isChessCom = host === "chess.com";
    const isAnalysisOrReview =
      pathname === "/analysis" ||
      pathname.startsWith("/analysis/") ||
      pathname.startsWith("/game/analysis") ||
      pathname.includes("/analysis/game/");

    const isLiveGameUrl = /^\/game\/(?:live\/)?\d+/.test(pathname);
    const isPlayOnlineUrl =
      pathname === "/play/online" || pathname.startsWith("/play/online/");

    let urlKind = "other";
    if (!isChessCom) {
      urlKind = "not-chess-com";
    } else if (isAnalysisOrReview) {
      urlKind = "analysis-or-review";
    } else if (isLiveGameUrl) {
      urlKind = "live-game";
    } else if (isPlayOnlineUrl) {
      urlKind = "play-online";
    }

    return {
      href: url.href,
      host,
      pathname,
      isChessCom,
      isAnalysisOrReview,
      isLiveGameUrl,
      isPlayOnlineUrl,
      urlKind
    };
  }

  function detectChessComLiveGame(options) {
    const detectionOptions = options || {};
    const windowRef =
      detectionOptions.window ||
      (typeof window !== "undefined" ? window : undefined);
    const documentRef =
      detectionOptions.document ||
      (typeof document !== "undefined" ? document : undefined);
    const url = detectionOptions.url || (windowRef && windowRef.location && windowRef.location.href);
    const urlInfo = classifyUrl(url);

    const boardSelector = getFirstMatchingSelector(documentRef, BOARD_SELECTORS);
    const livePanelSelector = getFirstMatchingSelector(documentRef, LIVE_PANEL_SELECTORS);
    const clockMatchCount = countSelectorMatches(documentRef, CLOCK_SELECTORS);

    const hasBoard = Boolean(boardSelector);
    const hasClockEvidence = clockMatchCount > 0;
    const hasLivePanelEvidence = Boolean(livePanelSelector);

    let status = "not-live-game";
    let reason = "The current page is not a Chess.com live game page.";

    // Prefer explicit live-game URLs, and use clock evidence on /play/online.
    if (!urlInfo.isChessCom) {
      status = "not-chess-com";
      reason = "The current page is not on chess.com.";
    } else if (urlInfo.isAnalysisOrReview) {
      status = "analysis-or-review";
      reason = "Analysis and review pages are excluded.";
    } else if (urlInfo.isLiveGameUrl && hasBoard) {
      status = "active-live-game";
      reason = "The URL and board indicate a Chess.com live game.";
    } else if (urlInfo.isLiveGameUrl) {
      status = "waiting-for-board";
      reason = "The URL indicates a live game, but the board is not available yet.";
    } else if (urlInfo.isPlayOnlineUrl && hasBoard && hasClockEvidence) {
      status = "active-live-game";
      reason = "The play page has board and clock evidence for an active game.";
    } else if (urlInfo.isPlayOnlineUrl && hasBoard) {
      status = "waiting-for-clock";
      reason = "The play page has a board, but clock evidence is not available yet.";
    }

    return {
      isLiveGame: status === "active-live-game",
      status,
      reason,
      url: urlInfo,
      evidence: {
        hasBoard,
        boardSelector,
        hasClockEvidence,
        clockMatchCount,
        hasLivePanelEvidence,
        livePanelSelector
      }
    };
  }

  return {
    BOARD_SELECTORS,
    CLOCK_SELECTORS,
    LIVE_PANEL_SELECTORS,
    classifyUrl,
    detectChessComLiveGame
  };
});
