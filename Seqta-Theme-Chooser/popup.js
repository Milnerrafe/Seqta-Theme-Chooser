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

  // Fallback function to inject, computing derived colors & setting CSS vars
  const fallbackApply = (rawHex) => {
    const normalizeHex = (hex) => {
      if (!hex) return null;
      hex = hex.trim();
      if (hex[0] !== "#") hex = "#" + hex;
      if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
      if (hex.length === 4) {
        const r = hex[1],
          g = hex[2],
          b = hex[3];
        hex = "#" + r + r + g + g + b + b;
      }
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

    // Parse base RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const baseHSL = rgbToHsl(r, g, b);

    // Ratios and deltas from original theme
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

    const useRatio = baseHSL.s > 3; // use ratio only if saturation above threshold

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
    setProp("--nav-level-zero", hex);
    setProp("--nav-level-one", derivedColors[0]);
    setProp("--nav-level-two", derivedColors[1]);
    setProp("--nav-level-three", derivedColors[2]);
  };

  try {
    // Send message to content script for full apply
    await chrome.tabs.sendMessage(tabId, { type: "APPLY_NAVY", hex });
  } catch (err) {
    console.warn(
      "Message to content script failed, falling back to injected script",
      err,
    );
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: fallbackApply,
        args: [hex],
      });
    } catch (execErr) {
      console.error("Fallback executeScript failed:", execErr);
    }
  }

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
  try {
    const { origin } = await getActiveTabOrigin();
    const stored = await getColorForOrigin(origin);
    if (stored) picker.value = stored;
  } catch {
    picker.value = "#3584e4";
  }

  const onChange = async (e) => {
    const hex = normalizeHex(e.target.value);
    if (hex) apply(hex);
  };

  picker.addEventListener("input", onChange);
  picker.addEventListener("change", onChange);

  await renderRecents();
}

document.addEventListener("DOMContentLoaded", init);
