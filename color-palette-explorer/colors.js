const PALETTE = [
  ['Living Coral', '#FF6F61'],
  ['Saffron', '#F4C430'],
  ['Tangerine', '#F28500'],
  ['Crimson Rose', '#B3123F'],
  ['Dusty Rose', '#C9A0A0'],
  ['Peach Cream', '#FFD8BE'],
  ['Terracotta', '#C8553D'],
  ['Sage', '#9CAF88'],
  ['Emerald', '#059669'],
  ['Teal Depth', '#0F766E'],
  ['Seafoam', '#7FD8BE'],
  ['Sky Haze', '#8ECAE6'],
  ['Ocean', '#0077B6'],
  ['Midnight Navy', '#14213D'],
  ['Periwinkle', '#8E9AF0'],
  ['Royal Indigo', '#3F37C9'],
  ['Lavender Mist', '#CDB4DB'],
  ['Amethyst', '#7B2CBF'],
  ['Orchid', '#E56BB0'],
  ['Charcoal Slate', '#2F3E46'],
];

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function rgbToHsl({ r, g, b }) {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l: Math.round(l * 100) };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === red) h = ((green - blue) / delta + 6) % 6;
  else if (max === green) h = (blue - red) / delta + 2;
  else h = (red - green) / delta + 4;

  return {
    h: Math.round(h * 60) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function luminance({ r, g, b }) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

// Pure black or white, whichever has the higher WCAG contrast. The better of
// the two always reaches at least 4.58:1, so text stays readable on any color.
function contrastText(rgb) {
  const l = luminance(rgb);
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? '#FFFFFF' : '#000000';
}

const COLORS = PALETTE.map(([name, hex]) => {
  const rgb = hexToRgb(hex);
  return { name, hex, rgb, hsl: rgbToHsl(rgb), text: contrastText(rgb) };
});

module.exports = { COLORS };
