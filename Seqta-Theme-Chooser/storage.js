const STORAGE_KEY = "navyColorsByOrigin";
const RECENTS_KEY = "recentNavyColors";

async function getAllColors() {
  return new Promise((resolve) =>
    chrome.storage.sync.get([STORAGE_KEY], (res) =>
      resolve(res[STORAGE_KEY] || {}),
    ),
  );
}
async function setAllColors(map) {
  return new Promise((resolve) =>
    chrome.storage.sync.set({ [STORAGE_KEY]: map }, resolve),
  );
}
async function getColorForOrigin(origin) {
  const map = await getAllColors();
  return map[origin] || null;
}
async function setColorForOrigin(origin, color) {
  const map = await getAllColors();
  if (color) map[origin] = color;
  else delete map[origin];
  await setAllColors(map);
}

async function getRecentColors() {
  return new Promise((resolve) =>
    chrome.storage.sync.get([RECENTS_KEY], (res) =>
      resolve(res[RECENTS_KEY] || []),
    ),
  );
}
async function pushRecentColor(hex) {
  const recents = await getRecentColors();

  const next = [
    hex,
    ...recents.filter((c) => c.toLowerCase() !== hex.toLowerCase()),
  ].slice(0, 7);
  return new Promise((resolve) =>
    chrome.storage.sync.set({ [RECENTS_KEY]: next }, resolve),
  );
}
