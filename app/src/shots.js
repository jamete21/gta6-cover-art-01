// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo
// loaded; ?shot=cover shows the cover alone, drawn at the viewport size.
// Params: layout, grade, size, title, subtitle, titlePos, photo, photoB.
// syncUI (optional) brings the editor's buttons and inputs in line with the
// scene before it renders. window.__shotReady is set once the scene has painted.
import { LAYOUTS, renderCover } from './cover.js';

export async function runShot(query, state, loadImage, renderPreview, syncUI) {
  const shot = query.get('shot');
  const layout = query.get('layout');
  const grade = query.get('grade');
  const size = query.get('size');
  if (layout && LAYOUTS[layout]) state.layout = layout;
  if (grade) state.grade = grade;
  if (size) state.size = size;
  if (query.get('title') !== null) state.title = query.get('title');
  if (query.get('subtitle') !== null) state.subtitle = query.get('subtitle');
  if (query.get('titlePos')) state.titlePos = query.get('titlePos');
  const photoA = query.get('photo') || 'boulevard';
  const photoB = query.get('photoB') || 'pier';
  try {
    const [a, b] = await Promise.all([
      loadImage(`samples/${photoA}.jpg`),
      loadImage(`samples/${photoB}.jpg`),
    ]);
    state.photos.a = a;
    state.photos.b = b;
  } catch {
    /* editor still renders with placeholders */
  }
  // Rebuild panels for the chosen layout (fresh alternation of the two photos).
  const count = LAYOUTS[state.layout].slots(100, 100, 2).length;
  state.panels = [];
  for (let i = 0; i < count; i++) {
    state.panels.push({ src: i % 2 === 0 ? 'a' : 'b', zoom: 1, x: 0, y: 0 });
  }
  state.selected = 0;
  try {
    await Promise.all([
      document.fonts.load('16px Anton'),
      document.fonts.load('16px Pacifico'),
      document.fonts.load('16px "Bebas Neue"'),
    ]);
  } catch {
    /* system fallbacks still render */
  }
  if (typeof syncUI === 'function') syncUI();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = document.getElementById('preview');
    renderCover(canvas, state, window.innerWidth, window.innerHeight);
  } else {
    renderPreview();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
