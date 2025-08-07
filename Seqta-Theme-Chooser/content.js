async function applyNavyColor(hex) {
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return;
  document.documentElement.style.setProperty("--navy", hex);
}

(async function init() {
  try {
    const origin = location.origin;
    const color = await getColorForOrigin(origin);
    if (color) applyNavyColor(color);
  } catch {}
})();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "APPLY_NAVY" && typeof msg.hex === "string") {
    applyNavyColor(msg.hex);
    sendResponse?.({ ok: true });
  }
});
