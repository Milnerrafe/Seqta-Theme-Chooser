importScripts("storage.js"); // reuse your existing storage helpers

const pendingTimers = new Map(); // origin -> timeout ID

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "START_COLOR_TIMER") {
    const { origin, hex } = msg;

    // Cancel any existing timer for that origin
    if (pendingTimers.has(origin)) {
      clearTimeout(pendingTimers.get(origin));
      pendingTimers.delete(origin);
    }

    // Start new timer
    const timeoutId = setTimeout(async () => {
      const current = await getColorForOrigin(origin);
      if (current === hex) {
        await pushRecentColor(hex);
        console.log(`[background] Added ${hex} to recents for ${origin}`);
      } else {
        console.log(
          `[background] Skipped ${origin}: color changed before 10s elapsed.`,
        );
      }
      pendingTimers.delete(origin);
    }, 3000);

    pendingTimers.set(origin, timeoutId);
    sendResponse({ ok: true });
  }

  return true; // Keep channel open for async
});
