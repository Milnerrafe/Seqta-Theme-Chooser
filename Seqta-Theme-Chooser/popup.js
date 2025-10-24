const picker = document.getElementById("picker");
const chips = document.getElementById("chips");

// ------------------------
// Utility functions
// ------------------------
function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const bigint = parseInt(hex, 16);
  return `${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255}`;
}

function normalizeHex(hex) {
  if (!hex) return "";
  hex = hex.trim();
  if (hex[0] !== "#") hex = "#" + hex;
  if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(hex)) {
    if (hex.length === 4)
      hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    return hex.toLowerCase();
  }
  return "";
}

// ------------------------
// Chrome tab helpers
// ------------------------
async function getActiveTabOrigin() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return { tabId: tab.id, origin: new URL(tab.url).origin };
}

// ------------------------
// Apply color
// ------------------------
async function apply(hex) {
  const { tabId, origin } = await getActiveTabOrigin();
  if (!hex) return;

  // Normalize and save color for this origin
  const normalized = normalizeHex(hex);
  await setColorForOrigin(origin, normalized);

  // Apply color immediately to popup UI
  document.body.style.background = normalized;

  // ------------------------
  // Define fallback injection (in case content script fails)
  // ------------------------
  const fallbackApply = (rawHex) => {
    const normalizeHex = (hex) => {
      if (!hex) return null;
      hex = hex.trim();
      if (hex[0] !== "#") hex = "#" + hex;
      if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
      if (hex.length === 4)
        hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      return hex.toLowerCase();
    };

    const rgbToHsl = (r, g, b) => {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      let h = 0,
        s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      return {
        h: +(h * 360).toFixed(3),
        s: +(s * 100).toFixed(3),
        l: +(l * 100).toFixed(3),
      };
    };

    const hslToRgb = (h, s, l) => {
      s /= 100;
      l /= 100;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const hh = h / 60;
      const x = c * (1 - Math.abs((hh % 2) - 1));
      let r = 0,
        g = 0,
        b = 0;
      if (0 <= hh && hh < 1) [r, g, b] = [c, x, 0];
      else if (1 <= hh && hh < 2) [r, g, b] = [x, c, 0];
      else if (2 <= hh && hh < 3) [r, g, b] = [0, c, x];
      else if (3 <= hh && hh < 4) [r, g, b] = [0, x, c];
      else if (4 <= hh && hh < 5) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];
      const m = l - c / 2;
      return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
      };
    };

    const rgbToHex = (r, g, b) =>
      "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const hex = normalizeHex(rawHex);
    if (!hex) return;

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const baseHSL = rgbToHsl(r, g, b);

    const levelRatios = [
      { sRatio: 0.4205, lRatio: 1.81 },
      { sRatio: 0.3136, lRatio: 2.216 },
      { sRatio: 0.3094, lRatio: 2.719 },
    ];
    const levelDeltas = [
      { sDelta: -32.084, lDelta: +19.216 },
      { sDelta: -38.017, lDelta: +28.824 },
      { sDelta: -38.245, lDelta: +40.785 },
    ];

    const useRatio = baseHSL.s > 3;
    const derivedColors = levelRatios.map(({ sRatio, lRatio }, i) => {
      let s = useRatio ? baseHSL.s * sRatio : baseHSL.s + levelDeltas[i].sDelta;
      let l = useRatio ? baseHSL.l * lRatio : baseHSL.l + levelDeltas[i].lDelta;
      s = clamp(s, 0, 100);
      l = clamp(l, 0, 100);
      const { r, g, b } = hslToRgb(baseHSL.h, s, l);
      return rgbToHex(r, g, b);
    });

    const setProp = (name, val) => {
      try {
        document.documentElement.style.setProperty(name, val, "important");
      } catch {
        document.documentElement.style.setProperty(name, val);
      }
    };

    setProp("--navy", hex);
    setProp("--theme-sel-bg-parts", hexToRgb(hex));
    setProp("--nav-level-zero", hex);
    setProp("--nav-level-one", derivedColors[0]);
    setProp("--nav-level-two", derivedColors[1]);
    setProp("--nav-level-three", derivedColors[2]);

    const style = document.createElement("style");
    style.textContent = `
      .Avatar__Avatar___j4ZSp {
        width: 44px;
        height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-size: cover;
        background-position: center;
        border-radius: 100%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        background-color: var(--navy);
        border: 2px solid var(--navy);
      }
    `;
    document.head.appendChild(style);
  };

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "APPLY_NAVY",
      hex: normalized,
    });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: fallbackApply,
        args: [normalized],
      });
    } catch (err) {
      console.error("Fallback apply failed:", err);
    }
  }

  // ------------------------
  // Delegate 10-second timer to background worker
  // ------------------------
  chrome.runtime.sendMessage({
    type: "START_COLOR_TIMER",
    origin,
    hex: normalized,
  });

  await renderRecents();
}

// ------------------------
// Recents UI
// ------------------------
async function renderRecents() {
  const recents = await getRecentColors();
  chips.innerHTML = "";
  recents.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.title = c;
    btn.classList.add("Previous-" + (i + 1));
    btn.style.background = c;
    btn.addEventListener("click", () => {
      picker.value = c;
      apply(c);
    });
    chips.appendChild(btn);
  });
}

document.getElementById("Dropper").addEventListener("click", () => {
  const eyeDropper = new EyeDropper();

  eyeDropper
    .open()
    .then((result) => {
      apply(result.sRGBHex);
      picker.value = result.sRGBHex;
      renderRecents();
    })
    .catch((e) => {
      console.log(e);
    });
});

// ------------------------
// Init
// ------------------------
async function init() {
  try {
    const { origin } = await getActiveTabOrigin();
    const stored = await getColorForOrigin(origin);
    picker.value = stored || "#3584e4";
    document.body.style.background = picker.value;
  } catch {
    picker.value = "#3584e4";
    document.body.style.background = "#3584e4";
  }

  // Debounced change listener (prevents rapid spam)
  let debounceTimer;
  const onChange = (e) => {
    clearTimeout(debounceTimer);
    const hex = normalizeHex(e.target.value);
    if (!hex) return;
    debounceTimer = setTimeout(() => apply(hex), 150);
  };

  picker.addEventListener("input", onChange);
  picker.addEventListener("change", onChange);

  await renderRecents();
}

document.addEventListener("DOMContentLoaded", init);
