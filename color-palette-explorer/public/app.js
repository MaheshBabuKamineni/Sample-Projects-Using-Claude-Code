const root = document.documentElement;
const grid = document.getElementById('grid');
const searchInput = document.getElementById('search');
const resultCount = document.getElementById('result-count');
const noResults = document.getElementById('no-results');
const recentList = document.getElementById('recent-list');
const toast = document.getElementById('toast');
const themeToggle = document.getElementById('theme-toggle');

let colors = [];
let cards = [];
let toastTimer;
let latestClick = 0;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createCard(color) {
  const { r, g, b } = color.rgb;
  const { h, s, l } = color.hsl;
  const card = element('button', 'card');
  card.type = 'button';
  card.style.setProperty('--card-bg', color.hex);
  card.style.setProperty('--card-fg', color.text);
  card.setAttribute('aria-label', `${color.name}, ${color.hex}. Copy HEX and set as page background`);

  const values = element('span', 'card-values');
  [
    ['HEX', color.hex],
    ['RGB', `${r}, ${g}, ${b}`],
    ['HSL', `${h}°, ${s}%, ${l}%`],
  ].forEach(([label, value]) => {
    const row = element('span', 'card-row');
    row.append(element('span', 'card-label', label), element('span', '', value));
    values.append(row);
  });

  card.append(element('span', 'card-name', color.name), values);
  card.addEventListener('click', () => selectColor(color));
  return { color, card };
}

function renderRecent(recent) {
  recentList.replaceChildren();
  if (recent.length === 0) {
    recentList.append(element('p', 'recent-empty', 'Click a color and it will appear here.'));
    return;
  }

  recent.forEach((entry) => {
    const color = colors.find((c) => c.hex === entry.hex);
    if (!color) return;
    const time = new Date(entry.timestamp).toLocaleString();
    const swatch = element('button', 'swatch');
    swatch.type = 'button';
    swatch.style.setProperty('--swatch', color.hex);
    swatch.title = `${color.name} · ${color.hex} · ${time}`;
    swatch.setAttribute('aria-label', `${color.name}, ${color.hex}, viewed ${time}`);
    swatch.addEventListener('click', () => selectColor(color));
    recentList.append(swatch);
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function saveClick(hex) {
  const clickId = ++latestClick;
  const response = await fetch('/api/clicks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hex }),
  });
  if (!response.ok) throw new Error(`Save failed with status ${response.status}`);
  const recent = await response.json();
  // Ignore a slow response if a newer click has already gone out.
  if (clickId === latestClick) renderRecent(recent);
}

async function selectColor(color) {
  root.style.setProperty('--page-bg', color.hex);
  root.style.setProperty('--page-fg', color.text);

  const [copied, saved] = await Promise.all([
    copyToClipboard(color.hex),
    saveClick(color.hex).then(() => true, (err) => {
      console.error(err);
      return false;
    }),
  ]);

  if (copied && saved) showToast('Copied HEX to clipboard!');
  else if (copied) showToast('Copied HEX to clipboard, but this click could not be saved.');
  else if (saved) showToast('Could not access the clipboard. HEX was not copied.');
  else showToast('Could not copy the HEX or save this click.');
}

function applySearch() {
  const query = searchInput.value.trim().toLowerCase();
  let visible = 0;

  cards.forEach(({ color, card }) => {
    const matches =
      color.name.toLowerCase().includes(query) ||
      color.hex.toLowerCase().includes(query);
    card.hidden = !matches;
    if (matches) visible++;
  });

  noResults.hidden = visible > 0;
  resultCount.textContent = `${visible} of ${colors.length} colors`;
}

function syncThemeToggle() {
  const dark = root.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(dark));
}

themeToggle.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  // A chosen color would otherwise hide the theme's page background.
  root.style.removeProperty('--page-bg');
  root.style.removeProperty('--page-fg');
  syncThemeToggle();
  try {
    localStorage.setItem('theme', root.dataset.theme);
  } catch {
    // Without storage the theme still applies for this visit.
  }
});

searchInput.addEventListener('input', applySearch);

async function init() {
  syncThemeToggle();
  try {
    const [colorsResponse, recentResponse] = await Promise.all([
      fetch('/api/colors'),
      fetch('/api/recent'),
    ]);
    if (!colorsResponse.ok || !recentResponse.ok) throw new Error('Request failed');
    colors = await colorsResponse.json();
    const recent = await recentResponse.json();

    cards = colors.map(createCard);
    grid.append(...cards.map(({ card }) => card));
    applySearch();
    renderRecent(recent);
  } catch (err) {
    console.error(err);
    noResults.textContent = 'Could not load the colors. Check that the server is running, then refresh.';
    noResults.hidden = false;
  }
}

init();
