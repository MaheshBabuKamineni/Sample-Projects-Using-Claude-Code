const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { COLORS } = require('./colors');

const PORT = process.env.PORT || 3000;
const CLICKS_FILE = path.join(__dirname, 'data', 'clicks.json');
const RECENT_LIMIT = 5;

function loadClicks() {
  try {
    return JSON.parse(fs.readFileSync(CLICKS_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    // Refuse to start rather than overwrite a history file we can't read.
    console.error(`Could not read ${CLICKS_FILE}: ${err.message}`);
    process.exit(1);
  }
}

let clicks = loadClicks();
let writeQueue = Promise.resolve();

// Writes run one at a time so rapid clicks can't interleave and corrupt the file.
function saveClick(click) {
  const result = writeQueue.then(async () => {
    const next = [...clicks, click];
    await fs.promises.mkdir(path.dirname(CLICKS_FILE), { recursive: true });
    await fs.promises.writeFile(CLICKS_FILE, JSON.stringify(next, null, 2));
    clicks = next;
  });
  writeQueue = result.catch(() => {});
  return result;
}

// The most recent clicks, newest first, with each color listed only once.
function recentColors() {
  const seen = new Set();
  const recent = [];
  for (let i = clicks.length - 1; i >= 0 && recent.length < RECENT_LIMIT; i--) {
    if (!seen.has(clicks[i].hex)) {
      seen.add(clicks[i].hex);
      recent.push(clicks[i]);
    }
  }
  return recent;
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/colors', (req, res) => {
  res.json(COLORS);
});

app.get('/api/recent', (req, res) => {
  res.json(recentColors());
});

app.post('/api/clicks', async (req, res) => {
  const color = COLORS.find((c) => c.hex === req.body?.hex);
  if (!color) {
    return res.status(400).json({ error: 'Unknown color' });
  }

  try {
    await saveClick({
      name: color.name,
      hex: color.hex,
      timestamp: new Date().toISOString(),
    });
    res.status(201).json(recentColors());
  } catch (err) {
    console.error('Could not save click:', err);
    res.status(500).json({ error: 'Could not save click' });
  }
});

// Bound to this machine only: the app is local and writes to local disk.
app.listen(PORT, '127.0.0.1', (err) => {
  if (err) {
    console.error(`Could not start server on port ${PORT}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Color Palette Explorer running at http://localhost:${PORT}`);
});
