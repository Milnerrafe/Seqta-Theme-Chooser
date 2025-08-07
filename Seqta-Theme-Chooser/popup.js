const picker = document.getElementById("picker");
const chips = document.getElementById("chips");

function normalizeHex(hex) {
  if (!hex) return "";
  hex = hex.trim();
  if (hex[0] !== "#") hex = "#" + hex;
  if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(hex)) {
    if (hex.length === 4) {
      const r = hex[1],
        g = hex[2],
        b = hex[3];
      return ("#" + r + r + g + g + b + b).toLowerCase();
    }
    return hex.toLowerCase();
  }
  return "";
}

async function getActiveTabOrigin() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return { tabId: tab.id, origin: new URL(tab.url).origin };
}

async function apply(hex) {
  const { tabId, origin } = await getActiveTabOrigin();
  await setColorForOrigin(origin, hex);
  await pushRecentColor(hex);

  // apply immediately
  try {
    await chrome.tabs.sendMessage(tabId, { type: "APPLY_NAVY", hex });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (h) => document.documentElement.style.setProperty("--navy", h),
        args: [hex],
      });
    } catch {}
  }

  // refresh recents UI
  await renderRecents();
}

async function renderRecents() {
  const recents = await getRecentColors();
  chips.innerHTML = "";
  for (const c of recents) {
    const btn = document.createElement("button");
    btn.title = c;
    btn.style.background = c;
    btn.addEventListener("click", () => {
      picker.value = c;
      apply(c);
    });
    chips.appendChild(btn);
  }
}

async function init() {
  // Initialize picker to stored color if present; otherwise leave Chrome default value (does not apply yet)
  try {
    const { origin } = await getActiveTabOrigin();
    const stored = await getColorForOrigin(origin);
    if (stored) picker.value = stored;
  } catch {
    // fallback default to a common value so input renders something valid
    picker.value = "#3584e4";
  }

  // Instant apply on user change
  const onChange = async (e) => {
    const hex = normalizeHex(e.target.value);
    if (hex) apply(hex);
  };
  picker.addEventListener("input", onChange); // live while dragging
  picker.addEventListener("change", onChange); // final commit

  await renderRecents();
}

document.addEventListener("DOMContentLoaded", init);
