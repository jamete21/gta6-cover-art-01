// Neon Boulevard cover engine: draws a multi-panel GTA-style poster cover onto any
// 2D canvas. Everything here is original work for this entry: the layouts, the colour
// grades and the lettering treatment were designed from the bounty brief, and no
// Rockstar artwork, logo or font is used anywhere.

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

// Each layout is a function of the cover size returning the panel rectangles.
// Rects are { x, y, w, h } in cover pixels; gutters are left as white gaps.
export const LAYOUTS = {
  hero: {
    name: 'Hero + Three',
    hint: 'One big moment, three small ones',
    slots(w, h, g) {
      const side = w * 0.62 - g / 2;
      const rx = w * 0.62 + g / 2;
      const rw = w - rx;
      const third = (h - g * 2) / 3;
      return [
        { x: 0, y: 0, w: side, h },
        { x: rx, y: 0, w: rw, h: third },
        { x: rx, y: third + g, w: rw, h: third },
        { x: rx, y: (third + g) * 2, w: rw, h: third },
      ];
    },
  },
  grid4: {
    name: 'Four Grid',
    hint: 'Two by two, every shot counts',
    slots(w, h, g) {
      const cw = (w - g) / 2;
      const ch = (h - g) / 2;
      return [
        { x: 0, y: 0, w: cw, h: ch },
        { x: cw + g, y: 0, w: cw, h: ch },
        { x: 0, y: ch + g, w: cw, h: ch },
        { x: cw + g, y: ch + g, w: cw, h: ch },
      ];
    },
  },
  grid9: {
    name: 'Nine Grid',
    hint: 'A whole night in nine frames',
    slots(w, h, g) {
      const cw = (w - g * 2) / 3;
      const ch = (h - g * 2) / 3;
      const cells = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          cells.push({ x: c * (cw + g), y: r * (ch + g), w: cw, h: ch });
        }
      }
      return cells;
    },
  },
  bleed: {
    name: 'Full Bleed',
    hint: 'One photo, edge to edge',
    slots(w, h) {
      return [{ x: 0, y: 0, w, h }];
    },
  },
};

// A grade is a three-stop luminance ramp plus a soft colour wash. The ramp turns
// every photo into the same sunset / neon family so panels from different photos
// feel like one poster.
export const GRADES = {
  sunset: {
    name: 'Sunset',
    swatch: '#ff7a3d',
    stops: [
      [0.0, [18, 10, 34]],
      [0.35, [122, 42, 92]],
      [0.65, [232, 112, 62]],
      [1.0, [255, 222, 152]],
    ],
    wash: 'rgba(255, 122, 61, 0.10)',
    accent: '#ff5da2',
    vignette: 0.32,
  },
  neon: {
    name: 'Neon Night',
    swatch: '#2de2ff',
    stops: [
      [0.0, [4, 12, 26]],
      [0.4, [22, 82, 122]],
      [0.7, [198, 62, 162]],
      [1.0, [164, 255, 240]],
    ],
    wash: 'rgba(45, 226, 255, 0.10)',
    accent: '#2de2ff',
    vignette: 0.38,
  },
  vice: {
    name: 'Vice Fade',
    swatch: '#c44dff',
    stops: [
      [0.0, [22, 6, 42]],
      [0.45, [112, 32, 112]],
      [0.75, [232, 82, 142]],
      [1.0, [255, 202, 122]],
    ],
    wash: 'rgba(196, 77, 255, 0.10)',
    accent: '#ffb347',
    vignette: 0.34,
  },
  gold: {
    name: 'Golden Hour',
    swatch: '#ffc53d',
    stops: [
      [0.0, [26, 17, 8]],
      [0.4, [122, 82, 32]],
      [0.7, [222, 152, 62]],
      [1.0, [255, 232, 172]],
    ],
    wash: 'rgba(255, 197, 61, 0.10)',
    accent: '#ff7a3d',
    vignette: 0.3,
  },
};

function sampleRamp(stops, t) {
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (t <= p1) {
      const f = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

// Draw one photo into a panel rect, cover-fit, with zoom and pan.
// px / py are -0.5..0.5 fractions of the spare room in each direction.
export function drawPanelPhoto(ctx, img, rect, zoom, px, py) {
  if (!img || !img.naturalWidth) return false;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const slackX = Math.max(0, (dw - rect.w) / 2);
  const slackY = Math.max(0, (dh - rect.h) / 2);
  const dx = rect.x + (rect.w - dw) / 2 - px * slackX;
  const dy = rect.y + (rect.h - dh) / 2 - py * slackY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  grainTile = document.createElement('canvas');
  grainTile.width = 128;
  grainTile.height = 128;
  const g = grainTile.getContext('2d');
  const data = g.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  return grainTile;
}

// Recolour the whole cover through the grade ramp, then wash, vignette and grain.
export function applyGrade(ctx, w, h, grade) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const c = sampleRamp(grade.stops, lum);
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
  }
  ctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vg = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${grade.vignette})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawTitleBand(ctx, state, w, h, grade) {
  const bandH = h * 0.26;
  const top = state.titlePos === 'top';
  const bandY = top ? 0 : h - bandH;
  const grad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (top) {
    grad.addColorStop(0, 'rgba(8,5,18,0.92)');
    grad.addColorStop(1, 'rgba(8,5,18,0)');
  } else {
    grad.addColorStop(0, 'rgba(8,5,18,0)');
    grad.addColorStop(1, 'rgba(8,5,18,0.92)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, bandY, w, bandH);
  const pad = w * 0.045;
  let titleSize = Math.round(h * 0.105);
  const subSize = Math.round(h * 0.042);
  const titleY = top ? bandY + titleSize * 1.05 : h - pad - subSize * 1.6;
  const subY = top ? bandY + titleSize * 1.05 + subSize * 1.5 : h - pad;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  try {
    ctx.letterSpacing = '1px';
  } catch {
    /* older canvas: no letter spacing, fine */
  }
  // Shrink a long title until it fits instead of squashing it.
  const titleText = (state.title || 'UNTITLED').toUpperCase();
  ctx.font = `${titleSize}px Anton, 'Arial Black', sans-serif`;
  while (ctx.measureText(titleText).width > w - pad * 2 && titleSize > 12) {
    titleSize -= 2;
    ctx.font = `${titleSize}px Anton, 'Arial Black', sans-serif`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(titleSize * 0.12);
  ctx.shadowOffsetY = Math.round(titleSize * 0.04);
  ctx.fillText(titleText, pad, titleY, w - pad * 2);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // Accent rule under the title.
  const ruleW = Math.min(w * 0.32, ctx.measureText(titleText).width);
  ctx.fillStyle = grade.accent;
  const ruleY = titleY + titleSize * 0.18;
  ctx.fillRect(pad, ruleY, Math.max(ruleW, w * 0.08), Math.max(3, h * 0.006));
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.fillStyle = grade.accent;
  ctx.fillText(state.subtitle || '', pad, subY, w - pad * 2);
  ctx.restore();
}

function drawBrandPill(ctx, w, h) {
  const label = 'NEON BOULEVARD';
  const fs = Math.max(13, Math.round(h * 0.02));
  ctx.save();
  ctx.font = `${fs}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
  const tw = ctx.measureText(label).width;
  const padX = fs * 0.9;
  const pillW = tw + padX * 2;
  const pillH = fs * 2.1;
  const x = w - pillW - w * 0.03;
  const y = h * 0.03;
  ctx.fillStyle = 'rgba(8,5,18,0.78)';
  ctx.beginPath();
  ctx.roundRect(x, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + padX, y + pillH / 2 + 1);
  ctx.restore();
}

// Render the whole cover onto canvas at the size in state.size (or W/H given).
// state: { layout, grade, size, title, subtitle, titlePos, panels, photos }
export function renderCover(canvas, state, width, height) {
  const size = SIZES[state.size] || SIZES.square;
  const w = width || size.w;
  const h = height || size.h;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const gutter = Math.max(4, Math.round(w * 0.007));
  // White poster stock shows through the gutters and the outer frame.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const rects = layout.slots(w, h, gutter);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { src: 'a', zoom: 1, x: 0, y: 0 };
    const img = state.photos ? state.photos[panel.src] : null;
    const ok = drawPanelPhoto(ctx, img, rect, panel.zoom || 1, panel.x || 0, panel.y || 0);
    if (!ok) {
      // Empty slot: dark placeholder so the grid still reads as a poster.
      ctx.fillStyle = '#241a33';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `${Math.max(14, Math.round(rect.h * 0.06))}px 'Bebas Neue', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  });
  applyGrade(ctx, w, h, grade);
  drawTitleBand(ctx, state, w, h, grade);
  drawBrandPill(ctx, w, h);
  return canvas;
}
