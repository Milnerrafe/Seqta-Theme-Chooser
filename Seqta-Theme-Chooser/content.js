function hexToRgb(hex) {
  // Remove leading #
  hex = hex.replace(/^#/, "");

  // Parse shorthand (#abc → #aabbcc)
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // Extract and convert
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r},${g},${b}`;
}

function hexToHSL(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
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

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = l - c / 2;
  let r, g, b;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

async function applyNavyColor(hex) {
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return;

  // HSL deltas from original theme
  const deltas = [
    { s: -33, l: +18 }, // level 1
    { s: -39, l: +29 }, // level 2
    { s: -37, l: +41 }, // level 3
  ];

  const base = hexToHSL(hex);

  // Apply base navy
  document.documentElement.style.setProperty("--navy", hex);
  document.documentElement.style.setProperty("--nav-level-zero", hex);

  // Compute derived levels
  deltas.forEach((delta, i) => {
    let h = base.h;
    let s = Math.max(0, Math.min(100, base.s + delta.s));
    let l = Math.max(0, Math.min(100, base.l + delta.l));
    let derivedHex = hslToHex(h, s, l);
    document.documentElement.style.setProperty(
      `--nav-level-${i + 1}`,
      derivedHex,
    );
  });
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
function hexToHSL(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
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

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = l - c / 2;
  let r, g, b;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

async function applyNavyColor(hex) {
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return;

  // HSL deltas from original theme
  const deltas = [
    { s: -33, l: +18 }, // level 1
    { s: -39, l: +29 }, // level 2
    { s: -37, l: +41 }, // level 3
  ];

  const base = hexToHSL(hex);

  // Apply base navy
  document.documentElement.style.setProperty("--navy", hex, "important");
  document.documentElement.style.setProperty(
    "--nav-level-zero",
    hex,
    "important",
  );
  document.documentElement.style.setProperty(
    "--theme-sel-bg-parts",
    hexToRgb(hex),
    "important",
  );

  const style = document.createElement("style");
  style.textContent = `
    .Avatar__Avatar___j4ZSp {
      width: 44px;
      height: 44px;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-size: cover;
      background-position: center;
      border-radius: 100%;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
      background-color: var(--navy);
      border: 2px solid var(--navy);
    }
  `;

  document.head.appendChild(style);

  // Compute derived levels
  deltas.forEach((delta, i) => {
    let h = base.h;
    let s = Math.max(0, Math.min(100, base.s + delta.s));
    let l = Math.max(0, Math.min(100, base.l + delta.l));
    let derivedHex = hslToHex(h, s, l);
    document.documentElement.style.setProperty(
      `--nav-level-${i + 1}`,
      derivedHex,
      "important",
    );
  });
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
