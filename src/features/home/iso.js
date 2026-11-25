// P14.03: bản đồ ngôi nhà kiểu "nhà búp bê" isometric (cắt mở, nhìn từ trên xuống), theo ảnh mẫu.
// 6 phòng trong nhà (2 hàng × 3) + ban công gỗ bên phải + khu vườn nhỏ phía trước. Bấm vào phòng để vào phòng đó.
// Vẽ hoàn toàn bằng SVG do app tạo (không chứa dữ liệu người dùng).
import { svgFrom } from './art.js';

const U = 24;
const OX = 470, OY = 150;
const P = (x, y, z = 0) => [OX + (x - y) * U * 0.866, OY + (x + y) * U * 0.5 - z * U];
const pts = (...ps) => ps.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
const poly = (ps, fill, extra = '') => `<polygon points="${pts(...ps)}" fill="${fill}" ${extra}/>`;

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

// Khối hộp: mặt trên + mặt hướng +y (trái-trước) + mặt hướng +x (phải-trước).
function box(x, y, z, w, d, h, color, { top, stroke = true } = {}) {
  const t = top ?? shade(color, 1.08);
  const s = stroke ? 'stroke="rgba(70,40,20,.25)" stroke-width=".8" stroke-linejoin="round"' : '';
  return poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], shade(color, 0.86), s)
    + poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], shade(color, 0.72), s)
    + poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], t, s);
}
const flat = (x, y, w, d, color, z = 0.02, extra = '') => poly([P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], color, extra);
// Hình trên tường y=0 (mặt phẳng x–z) và tường x=0 (mặt phẳng y–z).
const onWallY = (x, z, w, h, fill, extra = '') => poly([P(x, 0.05, z), P(x + w, 0.05, z), P(x + w, 0.05, z + h), P(x, 0.05, z + h)], fill, extra);
const onWallX = (y, z, w, h, fill, extra = '') => poly([P(0.05, y, z), P(0.05, y + w, z), P(0.05, y + w, z + h), P(0.05, y, z + h)], fill, extra);

function windowY(x, z, w, h) {
  return onWallY(x - 0.2, z - 0.2, w + 0.4, h + 0.4, '#fff7ea') + onWallY(x, z, w, h, 'url(#isoSky)')
    + onWallY(x + w / 2 - 0.08, z, 0.16, h, '#fff7ea') + onWallY(x, z + h / 2 - 0.08, w, 0.16, '#fff7ea')
    + onWallY(x - 0.4, z - 0.35, w + 0.8, 0.18, '#e8cfae');
}
function windowX(y, z, w, h) {
  return onWallX(y - 0.2, z - 0.2, w + 0.4, h + 0.4, '#fff7ea') + onWallX(y, z, w, h, 'url(#isoSky)')
    + onWallX(y + w / 2 - 0.08, z, 0.16, h, '#fff7ea') + onWallX(y, z + h / 2 - 0.08, w, 0.16, '#fff7ea');
}
// Chậu cây: chậu hộp nhỏ + tán lá tròn.
function plant(x, y, s = 1, leaf = '#6fae66', potc = '#d98a62') {
  const [cx, cy] = P(x + 0.4 * s, y + 0.4 * s, 0.8 * s);
  return box(x, y, 0, 0.8 * s, 0.8 * s, 0.7 * s, potc)
    + `<ellipse cx="${cx}" cy="${cy - 10 * s}" rx="${15 * s}" ry="${12 * s}" fill="${leaf}"/>`
    + `<ellipse cx="${cx - 7 * s}" cy="${cy - 4 * s}" rx="${9 * s}" ry="${7 * s}" fill="${shade(leaf, 0.82)}"/>`
    + `<ellipse cx="${cx + 6 * s}" cy="${cy - 16 * s}" rx="${8 * s}" ry="${6 * s}" fill="${shade(leaf, 1.15)}"/>`;
}
function flowers(x, y, n = 6, seed = 1) {
  const cols = ['#f28c8c', '#f6c35b', '#e98fc1', '#ffffff', '#a98bd6', '#f5a96b'];
  let s = '';
  for (let i = 0; i < n; i++) {
    const [px, py] = P(x + (i % 3) * 0.6 + ((i * seed) % 2) * 0.2, y + Math.floor(i / 3) * 0.6, 0);
    s += `<path d="M${px} ${py} v-9" stroke="#4f8a52" stroke-width="1.6"/><circle cx="${px}" cy="${py - 10}" r="3.6" fill="${cols[(i + seed) % 6]}"/><circle cx="${px}" cy="${py - 10}" r="1.3" fill="#f6d36b"/>`;
  }
  return s;
}
function lampGlow(x, y, z, r = 60) { const [cx, cy] = P(x, y, z); return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#isoGlow)" class="lampglow"/>`; }
function books(x, z, w) {
  const cols = ['#e8a0a0', '#93aee0', '#e9cf7a', '#9cc79a', '#b9a3dd', '#f2b880'];
  let s = ''; let bx = x;
  for (let i = 0; bx < x + w - 0.3; i++) { const bw = 0.25 + (i % 3) * 0.06; s += onWallY(bx, z, bw, 0.75 + (i % 4) * 0.1, cols[i % 6]); bx += bw + 0.04; }
  return s;
}

// ---------- từng phòng (gốc ox, oy) ----------
const ROOM_ART = {
  living: (ox, oy) => windowY(ox + 1.6, 1.4, 2.8, 2.2)
    + onWallY(ox + 0.3, 3.4, 1.0, 0.8, '#bfe0d0', 'stroke="#c9925f" stroke-width="2"')
    + flat(ox + 1, oy + 2.4, 4, 2.8, '#e9b8a8', 0.03) + flat(ox + 1.4, oy + 2.8, 3.2, 2, '#f3d3c4', 0.04)
    + box(ox + 0.8, oy + 0.3, 0, 4.4, 1.6, 0.8, '#8fb5d6') + box(ox + 0.8, oy + 0.2, 0.8, 4.4, 0.5, 1.0, '#a3c3df')
    + box(ox + 1.3, oy + 0.75, 0.8, 0.9, 0.35, 0.6, '#e8bf5f') + box(ox + 3.8, oy + 0.75, 0.8, 0.9, 0.35, 0.6, '#f3b6b6')
    + box(ox + 2, oy + 3.1, 0, 2, 1.2, 0.6, '#c9925f') + box(ox + 2.6, oy + 3.4, 0.6, 0.4, 0.4, 0.3, '#fffdf8')
    + plant(ox + 5.1, oy + 0.3, 1.2) + plant(ox + 0.2, oy + 4.8, 0.9, '#7fb574', '#f2e3cf'),
  bedroom: (ox, oy) => windowY(ox + 3.4, 1.6, 2.2, 2.2)
    + onWallY(ox + 0.6, 3.0, 0.9, 1.1, '#e3d5f0', 'stroke="#c9925f" stroke-width="2"') + onWallY(ox + 1.8, 3.3, 0.7, 0.7, '#d5ecf0', 'stroke="#c9925f" stroke-width="2"')
    + flat(ox + 0.8, oy + 3.6, 3.8, 2, '#cdb8e6', 0.03)
    + box(ox + 0.6, oy + 0.15, 0, 3.2, 0.3, 1.8, '#e2b98a') + box(ox + 0.6, oy + 0.45, 0, 3.2, 3.2, 0.7, '#fffdf8')
    + box(ox + 0.6, oy + 1.6, 0.7, 3.2, 2.05, 0.12, '#f6c9cf') + box(ox + 0.9, oy + 0.6, 0.7, 1.1, 0.7, 0.3, '#fff6e8') + box(ox + 2.3, oy + 0.6, 0.7, 1.1, 0.7, 0.3, '#cfe3f2')
    + box(ox + 4.2, oy + 0.3, 0, 0.9, 0.9, 0.9, '#c9925f') + box(ox + 4.45, oy + 0.55, 0.9, 0.4, 0.4, 0.5, '#fff6e8') + lampGlow(ox + 4.65, oy + 0.75, 1.5, 50)
    + plant(ox + 5.1, oy + 4.9, 1.1, '#5f9e5a', '#f2e3cf'),
  study: (ox, oy) => windowY(ox + 0.6, 1.6, 2.4, 2.1)
    + box(ox + 3.9, oy + 0.1, 0, 2.0, 0.8, 4.2, '#c9925f', { top: '#b07a4a' })
    + [0.9, 1.9, 2.9].map((z) => onWallY(ox + 4.0, z, 1.8, 0.08, '#9a6640') + books(ox + 4.05, z + 0.08, 1.8)).join('')
    + box(ox + 0.4, oy + 0.2, 1.3, 3.0, 1.3, 0.15, '#e2b98a') + box(ox + 0.5, oy + 0.3, 0, 0.2, 1.1, 1.3, '#9a6640') + box(ox + 3.1, oy + 0.3, 0, 0.2, 1.1, 1.3, '#9a6640')
    + box(ox + 1.2, oy + 0.35, 1.45, 1.4, 0.12, 0.95, '#41444a', { top: '#41444a' }) + box(ox + 1.25, oy + 0.48, 1.5, 1.3, 0.01, 0.85, '#bfe3d8', { stroke: false })
    + box(ox + 1.4, oy + 1.9, 0, 0.9, 0.9, 0.7, '#e09d79') + box(ox + 1.4, oy + 2.6, 0.7, 0.9, 0.2, 0.9, '#d98a62')
    + flat(ox + 0.6, oy + 1.8, 3, 2.4, '#d9ead3', 0.03) + lampGlow(ox + 0.9, oy + 0.6, 2.2, 40)
    + plant(ox + 0.3, oy + 4.9, 1.1),
  kitchen: (ox, oy) => windowX(oy + 1.2, 2.0, 2.4, 1.5)
    + [0.4, 2.2].map((yy) => onWallX(oy + yy + 3.4, 3.3, 1.5, 1.1, '#fff6e8', 'stroke="#e2b98a" stroke-width="1.5"')).join('')
    + box(ox + 0.05, oy + 0.3, 0, 1.4, 5.4, 1.6, '#fff6e8', { top: '#e2b98a' })
    + box(ox + 0.25, oy + 3.0, 1.6, 1.0, 1.0, 0.05, '#41444a') + box(ox + 0.25, oy + 1.4, 1.58, 1.0, 1.1, 0.04, '#cfd6db')
    + box(ox + 4.4, oy + 0.1, 0, 1.4, 1.3, 3.4, '#cfe3f2')
    + flat(ox + 2.4, oy + 2.4, 2.6, 2.6, '#f3e6c8', 0.03)
    + box(ox + 2.7, oy + 2.7, 1.1, 2.0, 2.0, 0.15, '#c9925f') + box(ox + 3.6, oy + 3.6, 0, 0.2, 0.2, 1.1, '#9a6640')
    + box(ox + 3.4, oy + 3.4, 1.25, 0.6, 0.6, 0.25, '#f28c8c')
    + box(ox + 2.9, oy + 4.9, 0, 0.7, 0.7, 0.6, '#e8bf5f') + box(ox + 4.2, oy + 4.9, 0, 0.7, 0.7, 0.6, '#e8bf5f')
    + plant(ox + 0.4, oy + 0.4, 0.6, '#7fb574', '#fff6e8'),
  bathroom: (ox, oy) => flat(ox + 0.2, oy + 0.2, 5.6, 5.6, 'url(#isoTile)', 0.025)
    + box(ox + 0.3, oy + 0.3, 0, 3.2, 1.7, 1.0, '#fffdf8', { top: '#dcecf3' })
    + [0.6, 1.2, 1.8, 2.4].map((dx, i) => { const [cx, cy] = P(ox + 0.6 + dx, oy + 1.1, 1.05); return `<circle cx="${cx}" cy="${cy}" r="${6 + (i % 2) * 2}" fill="#fff"/>`; }).join('')
    + box(ox + 4.3, oy + 0.3, 0, 1.3, 1.0, 1.4, '#c9925f', { top: '#fffdf8' })
    + flat(ox + 1, oy + 3.0, 2.4, 1.4, '#bfe0d0', 0.04)
    + plant(ox + 5, oy + 4.8, 1, '#5f9e5a', '#fff6e8') + plant(ox + 0.3, oy + 4.9, 0.7, '#7fb574', '#cfe3f2'),
  dressing: (ox, oy) => flat(ox + 1.2, oy + 2.2, 3.4, 2.4, '#f6dcd6', 0.03)
    + box(ox + 0.3, oy + 0.3, 0, 2.6, 0.9, 3.0, '#fff6e8')
    + ['#f3b6b6', '#cfe3f2', '#fff0c9', '#c9b5e3', '#bfe0c8', '#f6c9a8'].map((c, i) => box(ox + 0.45 + i * 0.4, oy + 1.15, 1.2, 0.3, 0.06, 1.5, c, { stroke: false })).join('')
    + box(ox + 3.4, oy + 0.3, 0, 1.0, 0.4, 2.8, '#e8d9c1') + box(ox + 3.5, oy + 0.66, 0.2, 0.8, 0.02, 2.4, '#dcecf3', { stroke: false })
    + box(ox + 4.8, oy + 0.3, 0, 0.9, 2.6, 1.6, '#fff6e8') + box(ox + 2.3, oy + 3.0, 0, 1.1, 1.1, 0.6, '#f3b6b6')
    + plant(ox + 5.1, oy + 4.9, 1, '#6fae66', '#f2e3cf'),
};

// Vị trí 6 phòng trong nhà.
const LAYOUT = { living: [0, 0], bedroom: [6, 0], study: [12, 0], kitchen: [0, 6], bathroom: [6, 6], dressing: [12, 6] };

function roomShell(id, ox, oy, wall, floor, locked) {
  const tiled = id === 'kitchen' || id === 'bathroom';
  let s = flat(ox, oy, 6, 6, tiled ? '#efe6da' : floor, 0.01, 'stroke="rgba(70,40,20,.18)" stroke-width="1"');
  if (!tiled) for (let i = 1; i < 6; i++) s += `<line x1="${P(ox + i, oy, 0.012)[0]}" y1="${P(ox + i, oy, 0.012)[1]}" x2="${P(ox + i, oy + 6, 0.012)[0]}" y2="${P(ox + i, oy + 6, 0.012)[1]}" stroke="rgba(90,50,20,.12)" stroke-width="1"/>`;
  return s;
}

export function isoHouse({ rooms, unlocked, active, colors, light }) {
  const name = Object.fromEntries(rooms.map((r) => [r.id, r]));
  let back = '';
  // Tường sau (y=0) và tường trái (x=0), cao 4.6; màu theo từng phòng.
  for (const [id, [ox, oy]] of Object.entries(LAYOUT)) {
    const c = colors[id];
    if (oy === 0) back += box(ox, -0.35, 0, 6, 0.35, 4.6, c.wall, { top: '#fff7ea' });
    if (ox === 0) back += box(-0.35, oy, 0, 0.35, 6, 4.6, shade(c.wall, 0.97), { top: '#fff7ea' });
  }
  back += box(-0.35, -0.35, 0, 0.35, 0.35, 4.6, '#fff7ea');
  let floors = '';
  let furn = '';
  let dividers = '';
  let hits = '';
  for (const [id, [ox, oy]] of Object.entries(LAYOUT)) {
    const c = colors[id];
    floors += roomShell(id, ox, oy, c.wall, c.floor);
    furn += ROOM_ART[id](ox, oy);
  }
  // Vách ngăn thấp giữa các phòng (để nhìn thấy hết bên trong).
  dividers += box(5.9, 0, 0, 0.2, 12, 0.5, '#fff7ea') + box(11.9, 0, 0, 0.2, 12, 0.5, '#fff7ea') + box(0, 5.9, 0, 18, 0.2, 0.5, '#fff7ea');
  // Ban công gỗ bên phải.
  let deck = box(18.4, 0, 0, 5.2, 6, 0.4, '#c9a27a', { top: colors.balcony?.floor ?? '#c9a27a' });
  for (let i = 0; i < 6; i++) deck += `<line x1="${P(18.4 + i, 0, 0.42)[0]}" y1="${P(18.4 + i, 0, 0.42)[1]}" x2="${P(18.4 + i, 6, 0.42)[0]}" y2="${P(18.4 + i, 6, 0.42)[1]}" stroke="rgba(90,50,20,.18)"/>`;
  deck += box(19.4, 1.2, 0.4, 1.2, 1.2, 0.8, '#e8bf5f') + box(21.6, 1.2, 0.4, 1.2, 1.2, 0.8, '#e8bf5f') + box(20.6, 1.4, 0.4, 0.9, 0.9, 1.0, '#fffdf8')
    + plant(22.6, 4.6, 1.1) + plant(18.6, 4.8, 0.9, '#7fb574', '#cfe3f2') + flowers(19.4, 4.4, 6, 2);
  const rail = Array.from({ length: 13 }, (_, i) => box(18.4 + i * 0.42, 5.85, 0.4, 0.1, 0.1, 1.2, '#e2b98a', { stroke: false })).join('')
    + box(18.4, 5.8, 1.6, 5.2, 0.2, 0.12, '#c9925f') + box(23.5, 0, 0.4, 0.1, 6, 1.3, '#e2b98a');
  // Vườn phía trước: lối đi, luống hoa, cây lớn, hàng rào.
  const yard = flat(-3, -3, 30, 21, '#a9d295', 0) + flat(5.5, 12.4, 2, 5.6, '#e8d2a8', 0.01)
    + flat(0.5, 13.4, 4.5, 2.5, '#8a5a3a', 0.015) + flowers(0.8, 13.7, 9, 1) + flowers(2.6, 14.6, 6, 3)
    + flat(8.2, 13.4, 6, 2.5, '#8a5a3a', 0.015) + flowers(8.5, 13.7, 9, 4) + flowers(11.2, 13.9, 9, 5)
    + flowers(16, 9.6, 9, 2) + flowers(19.2, 8.4, 6, 3);
  const fence = Array.from({ length: 22 }, (_, i) => box(-3 + i * 1.35, 17.7, 0, 0.18, 0.18, 1.1, '#fff7ea', { stroke: false })).join('') + box(-3, 17.7, 0.7, 29, 0.12, 0.14, '#fff7ea', { stroke: false });
  const [tx, ty] = P(24.5, 9, 0);
  const tree = `<g><rect x="${tx - 5}" y="${ty - 70}" width="10" height="70" rx="4" fill="#9a6640"/><circle cx="${tx}" cy="${ty - 90}" r="38" fill="#4f8a52"/><circle cx="${tx - 26}" cy="${ty - 70}" r="26" fill="#74ad6c"/><circle cx="${tx + 24}" cy="${ty - 74}" r="28" fill="#74ad6c"/><circle cx="${tx + 4}" cy="${ty - 110}" r="22" fill="#9fcd8f"/>${[[-14, -96], [16, -84], [-4, -70], [22, -104]].map(([dx, dy]) => `<circle cx="${tx + dx}" cy="${ty + dy}" r="5" fill="#f28c8c"/>`).join('')}</g>`;
  // Dây leo trên tường.
  const [vx, vy] = P(0, 0, 4.6);
  const vines = `<g fill="#74ad6c">${Array.from({ length: 14 }, (_, i) => `<ellipse cx="${vx + i * 17}" cy="${vy + 6 + i * 9.6 + Math.sin(i) * 5}" rx="7" ry="4.5" transform="rotate(${i * 25} ${vx + i * 17} ${vy + 6 + i * 9.6})"/>`).join('')}${Array.from({ length: 10 }, (_, i) => `<ellipse cx="${vx - i * 18}" cy="${vy + 8 + i * 10.4}" rx="7" ry="4.5" transform="rotate(${-i * 30} ${vx - i * 18} ${vy + 8 + i * 10.4})"/>`).join('')}</g>`;

  // Vùng bấm + nhãn.
  const areas = { ...Object.fromEntries(Object.entries(LAYOUT).map(([id, [ox, oy]]) => [id, [ox, oy, 6, 6]])), balcony: [18.4, 0, 5.2, 6], yard: [-1, 12.3, 18, 5.2] };
  for (const [id, [x, y, w, d]] of Object.entries(areas)) {
    const r = name[id];
    if (!r) continue;
    const open = unlocked.includes(id);
    const [lx, ly] = P(x + w / 2, y + d / 2, id === 'yard' ? 0 : 0.2);
    const label = `${open ? r.icon : '🔒'} ${r.name}`;
    const lw = label.length * 6.6 + 18;
    hits += `<g class="iso-room${open ? '' : ' locked'}${active === id ? ' on' : ''}" data-room="${id}" role="button" tabindex="${open ? 0 : -1}" aria-label="${open ? r.name : `${r.name} (mở ở cấp ${r.level})`}">
      ${poly([P(x, y, 0), P(x + w, y, 0), P(x + w, y + d, 0), P(x, y + d, 0)], open ? 'rgba(255,255,255,0)' : 'rgba(60,60,80,.38)', 'class="iso-hit"')}
      <rect x="${lx - lw / 2}" y="${ly - 12}" width="${lw}" height="22" rx="11" class="iso-label"/>
      <text x="${lx}" y="${ly + 3.5}" text-anchor="middle" class="iso-label-text">${label}</text></g>`;
  }
  return svgFrom(`<svg class="iso-house time-${light.id}" viewBox="0 0 980 660" role="group" aria-label="Bản đồ ngôi nhà"
      style="--sky1:${light.sky1};--sky2:${light.sky2}">
    <defs>
      <linearGradient id="isoSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient>
      <radialGradient id="isoGlow"><stop offset="0" style="stop-color:rgba(255,214,140,.8)"/><stop offset="1" style="stop-color:rgba(255,214,140,0)"/></radialGradient>
      <pattern id="isoTile" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#eef4f3"/><path d="M0 0H10V10" fill="none" stroke="#d6e2e0"/></pattern>
    </defs>
    ${yard}${tree}${back}${vines}${floors}${dividers}${furn}${deck}${rail}${fence}
    <rect width="980" height="660" fill="#1b2142" opacity="${light.dim}" pointer-events="none"/>
    ${hits}
  </svg>`);
}
