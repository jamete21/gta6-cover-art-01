// Neon Boulevard editor wiring: state, controls, preview and PNG export.
// Photos stay on the machine (FileReader / local samples only); nothing uploads.
import { LAYOUTS, GRADES, SIZES, renderCover } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const status = $('status');

// Default panels for a layout: alternate the two photos so a fresh cover already
// looks like a poster, and let the user re-assign any panel.
function defaultPanels(layoutKey) {
  const count = LAYOUTS[layoutKey].slots(100, 100, 2).length;
  const panels = [];
  for (let i = 0; i < count; i++) {
    panels.push({ src: i % 2 === 0 ? 'a' : 'b', zoom: 1, x: 0, y: 0 });
  }
  return panels;
}

const state = {
  layout: 'hero',
  grade: 'sunset',
  size: 'square',
  title: 'Sunset Run',
  subtitle: 'neon nights on the boulevard',
  titlePos: 'bottom',
  panels: defaultPanels('hero'),
  photos: { a: null, b: null },
  selected: 0,
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${url}`));
    img.src = url;
  });
}

function previewSize() {
  const size = SIZES[state.size];
  const maxH = 560;
  const scale = Math.min(1, maxH / size.h);
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function renderPreview() {
  const { w, h } = previewSize();
  renderCover(preview, state, w, h);
  syncPanelStrip();
}

function syncPanelStrip() {
  const strip = $('panels');
  strip.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-chip' + (i === state.selected ? ' selected' : '');
    b.textContent = `Panel ${i + 1} · Photo ${panel.src.toUpperCase()}`;
    b.addEventListener('click', () => {
      state.selected = i;
      syncControls();
      renderPreview();
    });
    strip.appendChild(b);
  });
}

function syncControls() {
  const panel = state.panels[state.selected];
  if (!panel) return;
  $('zoom').value = panel.zoom;
  $('panx').value = panel.x;
  $('pany').value = panel.y;
  $('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  $('panxVal').textContent = panel.x.toFixed(2);
  $('panyVal').textContent = panel.y.toFixed(2);
  document.querySelectorAll('[data-src]').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.src === panel.src);
  });
}

// Bring every visible control in line with the state (used after a ?shot= scene
// sets the state directly, so the buttons show the scene instead of the defaults).
function syncOptionButtons() {
  document.querySelectorAll('#layoutRow .choice').forEach((el) => {
    el.classList.toggle('selected', el.textContent === LAYOUTS[state.layout].name);
  });
  document.querySelectorAll('#gradeRow .choice').forEach((el) => {
    el.classList.toggle('selected', el.textContent.includes(GRADES[state.grade].name));
  });
  document.querySelectorAll('#sizeRow .choice').forEach((el) => {
    el.classList.toggle('selected', el.textContent === SIZES[state.size].label);
  });
  $('layoutHint').textContent = LAYOUTS[state.layout].hint;
  $('titlePos').textContent = `Title: ${state.titlePos}`;
}

function syncTextInputs() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
}

function buildButtonGroups() {
  const layoutRow = $('layoutRow');
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (key === state.layout ? ' selected' : '');
    b.textContent = def.name;
    b.title = def.hint;
    b.addEventListener('click', () => {
      state.layout = key;
      state.panels = defaultPanels(key);
      state.selected = 0;
      document.querySelectorAll('#layoutRow .choice').forEach((el) => el.classList.remove('selected'));
      b.classList.add('selected');
      $('layoutHint').textContent = def.hint;
      syncControls();
      renderPreview();
    });
    layoutRow.appendChild(b);
  });
  const gradeRow = $('gradeRow');
  Object.entries(GRADES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice swatch' + (key === state.grade ? ' selected' : '');
    b.innerHTML = `<span class="dot" style="background:${def.swatch}"></span>${def.name}`;
    b.addEventListener('click', () => {
      state.grade = key;
      document.querySelectorAll('#gradeRow .choice').forEach((el) => el.classList.remove('selected'));
      b.classList.add('selected');
      renderPreview();
    });
    gradeRow.appendChild(b);
  });
  const sizeRow = $('sizeRow');
  Object.entries(SIZES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (key === state.size ? ' selected' : '');
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.size = key;
      document.querySelectorAll('#sizeRow .choice').forEach((el) => el.classList.remove('selected'));
      b.classList.add('selected');
      renderPreview();
    });
    sizeRow.appendChild(b);
  });
}

function wireInputs() {
  $('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    renderPreview();
  });
  $('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    renderPreview();
  });
  $('titlePos').addEventListener('click', () => {
    state.titlePos = state.titlePos === 'bottom' ? 'top' : 'bottom';
    $('titlePos').textContent = `Title: ${state.titlePos}`;
    renderPreview();
  });
  $('zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value);
    syncControls();
    renderPreview();
  });
  $('panx').addEventListener('input', (e) => {
    state.panels[state.selected].x = Number(e.target.value);
    syncControls();
    renderPreview();
  });
  $('pany').addEventListener('input', (e) => {
    state.panels[state.selected].y = Number(e.target.value);
    syncControls();
    renderPreview();
  });
  document.querySelectorAll('[data-src]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.panels[state.selected].src = btn.dataset.src;
      syncControls();
      renderPreview();
    });
  });
  $('fillA').addEventListener('click', () => {
    state.panels.forEach((p) => { p.src = 'a'; });
    syncControls();
    renderPreview();
  });
  $('fillB').addEventListener('click', () => {
    state.panels.forEach((p) => { p.src = 'b'; });
    syncControls();
    renderPreview();
  });
  $('resetPanels').addEventListener('click', () => {
    state.panels = defaultPanels(state.layout);
    state.selected = 0;
    syncControls();
    renderPreview();
  });
  $('photoA').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photos.a = await loadImage(URL.createObjectURL(file));
    status.textContent = `Photo A: ${file.name}`;
    renderPreview();
  });
  $('photoB').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photos.b = await loadImage(URL.createObjectURL(file));
    status.textContent = `Photo B: ${file.name}`;
    renderPreview();
  });
  $('export').addEventListener('click', () => {
    const size = SIZES[state.size];
    const off = document.createElement('canvas');
    renderCover(off, state, size.w, size.h);
    off.toBlob((blob) => {
      if (!blob) {
        status.textContent = 'Export failed in this browser.';
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-boulevard-cover-${size.w}x${size.h}.png`;
      a.click();
      status.textContent = `Saved neon-boulevard-cover-${size.w}x${size.h}.png`;
    }, 'image/png');
  });
  // Clicking the preview selects the panel under the pointer.
  preview.addEventListener('click', (e) => {
    const rect = preview.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const size = SIZES[state.size];
    const px = fx * size.w;
    const py = fy * size.h;
    const rects = LAYOUTS[state.layout].slots(size.w, size.h, Math.max(4, Math.round(size.w * 0.007)));
    const hit = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
    if (hit >= 0) {
      state.selected = hit;
      syncControls();
      renderPreview();
    }
  });
}

async function boot() {
  buildButtonGroups();
  wireInputs();
  $('layoutHint').textContent = LAYOUTS[state.layout].hint;
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runShot(query, state, loadImage, renderPreview, () => {
      syncControls();
      syncOptionButtons();
      syncTextInputs();
    });
    return;
  }
  try {
    const [a, b] = await Promise.all([
      loadImage('samples/boulevard.jpg'),
      loadImage('samples/pier.jpg'),
    ]);
    state.photos.a = a;
    state.photos.b = b;
  } catch {
    status.textContent = 'Sample photos did not load; add your own photos below.';
  }
  try {
    await Promise.all([
      document.fonts.load('16px Anton'),
      document.fonts.load('16px Pacifico'),
      document.fonts.load('16px "Bebas Neue"'),
    ]);
  } catch {
    /* system fallbacks still render */
  }
  syncControls();
  renderPreview();
}

boot();
