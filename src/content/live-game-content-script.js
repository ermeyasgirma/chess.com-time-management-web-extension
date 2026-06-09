/*
 * Runs the Chess.com live-game detector inside matching browser tabs.
 * Structure: load detector, publish detection state, debounce DOM changes, and watch client-side navigation.
 */

(function initLiveGameContentScript() {
  const detector = globalThis.ChessTimeManagerDetector;

  if (!detector) {
    console.warn("[Chess Time Manager] Live game detector was not loaded.");
    return;
  }

  const STATUS_ATTRIBUTE = "data-chess-time-manager-status";
  const IS_LIVE_GAME_ATTRIBUTE = "data-chess-time-manager-is-live-game";
  const LOCATION_CHECK_INTERVAL_MS = 1000;
  const MUTATION_DEBOUNCE_MS = 150;

  let lastSignature = "";
  let lastHref = window.location.href;
  let scheduledDetectionId = 0;

  function getDetectionSignature(result) {
    // Only include fields that change whether downstream code should react.
    return JSON.stringify({
      href: result.url.href,
      status: result.status,
      boardSelector: result.evidence.boardSelector,
      clockMatchCount: result.evidence.clockMatchCount,
      livePanelSelector: result.evidence.livePanelSelector
    });
  }

  function publishDetection(result) {
    // Attributes make the current detection state easy to inspect in DevTools.
    document.documentElement.setAttribute(STATUS_ATTRIBUTE, result.status);
    document.documentElement.setAttribute(
      IS_LIVE_GAME_ATTRIBUTE,
      String(result.isLiveGame)
    );

    document.dispatchEvent(
      new CustomEvent("chess-time-manager:live-game-detection", {
        detail: result
      })
    );
  }

  function runDetection() {
    scheduledDetectionId = 0;

    const result = detector.detectChessComLiveGame();
    const signature = getDetectionSignature(result);

    if (signature === lastSignature) {
      return;
    }

    lastSignature = signature;
    publishDetection(result);
    console.info("[Chess Time Manager] Live game detection:", result);
  }

  function scheduleDetection() {
    // Debounce mutation bursts from Chess.com's reactive UI updates.
    if (scheduledDetectionId) {
      window.clearTimeout(scheduledDetectionId);
    }

    scheduledDetectionId = window.setTimeout(runDetection, MUTATION_DEBOUNCE_MS);
  }

  function observeDomChanges() {
    if (!document.body) {
      window.setTimeout(observeDomChanges, 100);
      return;
    }

    const observer = new MutationObserver(scheduleDetection);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-cy", "data-test-element"]
    });
  }

  function observeLocationChanges() {
    // Chess.com uses client-side navigation, so URL changes may not reload.
    window.setInterval(() => {
      if (window.location.href === lastHref) {
        return;
      }

      lastHref = window.location.href;
      scheduleDetection();
    }, LOCATION_CHECK_INTERVAL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleDetection, { once: true });
  } else {
    scheduleDetection();
  }

  observeDomChanges();
  observeLocationChanges();
})();
