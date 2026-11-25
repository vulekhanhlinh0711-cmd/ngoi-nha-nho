// P12.09–P12.10: tranh vẽ SVG cho ngôi nhà (phong cách anime ấm, nhiều nắng và cây xanh, theo Mẫu thiết kế).
// Toàn bộ là chuỗi SVG tĩnh do app viết (không chứa dữ liệu người dùng) nên dựng bằng <template>.
// Màu tường/sàn lấy từ biến CSS --wall/--floor để người dùng đổi được; bầu trời đổi theo giờ (--sky1/--sky2).

export function svgFrom(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

// ---------- Ánh sáng theo giờ ----------
export const LIGHTS = {
  morning: { id: 'morning', name: 'Buổi sáng', sky1: '#a9d8f2', sky2: '#fde4c4', sun: '#fff1c9', dim: 0 },
  day: { id: 'day', name: 'Ban ngày', sky1: '#8ccbef', sky2: '#e3f3fb', sun: '#fff8dc', dim: 0 },
  evening: { id: 'evening', name: 'Hoàng hôn', sky1: '#f2a37f', sky2: '#fbd7a0', sun: '#ffd08a', dim: 0.06 },
  night: { id: 'night', name: 'Buổi tối', sky1: '#24305c', sky2: '#545a8a', sun: '#fff3c4', dim: 0.2 },
};
// pref: 'auto' (theo giờ máy) hoặc một khóa trong LIGHTS.
export function timeOfDay(pref = 'auto', hour = new Date().getHours()) {
  if (LIGHTS[pref]) return LIGHTS[pref];
  if (hour >= 5 && hour < 9) return LIGHTS.morning;
  if (hour >= 9 && hour < 16) return LIGHTS.day;
  if (hour >= 16 && hour < 19) return LIGHTS.evening;
  return LIGHTS.night;
}

// ---------- Mảnh ghép dùng chung ----------
const C = {
  wood: '#c9925f', woodD: '#9a6640', woodL: '#e2b98a', cream: '#fff6e8', leaf: '#74ad6c', leafD: '#4f8a52', leafL: '#9fcd8f',
  pink: '#f3b6b6', pinkD: '#e48f98', terra: '#d98a62', blue: '#8fb5d6', mustard: '#e8bf5f', white: '#fffdf8', lilac: '#c9b5e3',
};
const grad = (id, a, b, vertical = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" style="stop-color:${a}"/><stop offset="1" style="stop-color:${b}"/></linearGradient>`;

function defs(u) {
  return `<defs>
    ${grad(`${u}sky`, 'var(--sky1)', 'var(--sky2)')}
    ${grad(`${u}beam`, 'rgba(255,240,200,.55)', 'rgba(255,240,200,0)')}
    ${grad(`${u}shade`, 'rgba(60,30,10,0)', 'rgba(60,30,10,.18)')}
    <radialGradient id="${u}glow"><stop offset="0" style="stop-color:rgba(255,214,140,.85)"/><stop offset="1" style="stop-color:rgba(255,214,140,0)"/></radialGradient>
    <pattern id="${u}tile" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#f3eee6"/><path d="M0 0H40V40" fill="none" stroke="#dcd3c5" stroke-width="2"/></pattern>
    <pattern id="${u}wtile" width="28" height="22" patternUnits="userSpaceOnUse"><rect width="28" height="22" fill="#e9f1ee"/><path d="M0 0H28M0 11H28M0 0V11M14 11V22" fill="none" stroke="#cddbd6" stroke-width="1.5"/></pattern>
  </defs>`;
}

// Tường + sàn gỗ phối cảnh nhẹ.
function room(u, floorKind = 'wood') {
  const planks = Array.from({ length: 11 }, (_, i) => {
    const x = -200 + i * 120;
    return `<line x1="${400 + (x - 400) * 0.62}" y1="340" x2="${x}" y2="500" stroke="rgba(90,50,20,.16)" stroke-width="2"/>`;
  }).join('');
  const floor = floorKind === 'tile'
    ? `<rect y="340" width="800" height="160" fill="url(#${u}tile)"/>`
    : `<rect y="340" width="800" height="160" style="fill:var(--floor)"/>${planks}
       <line x1="0" y1="395" x2="800" y2="395" stroke="rgba(90,50,20,.10)" stroke-width="2"/><line x1="0" y1="450" x2="800" y2="450" stroke="rgba(90,50,20,.10)" stroke-width="2"/>`;
  return `<rect width="800" height="340" style="fill:var(--wall)"/>
    <rect width="800" height="340" fill="url(#${u}shade)"/>
    <rect y="0" width="800" height="14" fill="rgba(255,255,255,.35)"/>
    ${floor}
    <rect y="330" width="800" height="12" fill="${C.cream}" opacity=".85"/><rect y="340" width="800" height="3" fill="rgba(90,50,20,.18)"/>`;
}

// Cửa sổ lớn có bầu trời, mây, đồi xa và vệt nắng chiếu xuống sàn.
function windowBig(u, x, y, w, hgt, { panes = 2, view = 'hills' } = {}) {
  const bars = Array.from({ length: panes - 1 }, (_, i) => `<rect x="${x + (w / panes) * (i + 1) - 4}" y="${y}" width="8" height="${hgt}" fill="${C.cream}"/>`).join('');
  const scenery = view === 'city'
    ? `<g fill="rgba(120,140,170,.45)"><rect x="${x + 10}" y="${y + hgt * 0.55}" width="40" height="${hgt * 0.45}"/><rect x="${x + 60}" y="${y + hgt * 0.4}" width="34" height="${hgt * 0.6}"/><rect x="${x + w - 80}" y="${y + hgt * 0.5}" width="50" height="${hgt * 0.5}"/></g>`
    : `<path d="M${x} ${y + hgt * 0.78} Q${x + w * 0.3} ${y + hgt * 0.55} ${x + w * 0.6} ${y + hgt * 0.72} T${x + w} ${y + hgt * 0.62} V${y + hgt} H${x}Z" fill="#9cc98d"/>
       <path d="M${x} ${y + hgt * 0.88} Q${x + w * 0.5} ${y + hgt * 0.7} ${x + w} ${y + hgt * 0.86} V${y + hgt} H${x}Z" fill="#7fb574"/>`;
  return `<g>
    <path d="M${x + w * 0.1} ${y + hgt} L${x + w * 1.15} 500 L${x - w * 0.35} 500 Z" fill="url(#${u}beam)" class="sunbeam"/>
    <rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${hgt + 20}" rx="10" fill="${C.cream}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="url(#${u}sky)"/>
    <circle cx="${x + w * 0.75}" cy="${y + hgt * 0.28}" r="${Math.min(w, hgt) * 0.1}" style="fill:var(--sun)" class="sun"/>
    <g class="stars" fill="#fff">${[[0.15, 0.15], [0.3, 0.4], [0.5, 0.12], [0.62, 0.45], [0.9, 0.2], [0.42, 0.3]].map(([a, b]) => `<circle cx="${x + w * a}" cy="${y + hgt * b}" r="1.6"/>`).join('')}</g>
    <g fill="#fff" opacity=".85" class="cloud"><ellipse cx="${x + w * 0.3}" cy="${y + hgt * 0.25}" rx="${w * 0.12}" ry="10"/><ellipse cx="${x + w * 0.38}" cy="${y + hgt * 0.22}" rx="${w * 0.08}" ry="12"/></g>
    ${scenery}
    ${bars}
    <rect x="${x}" y="${y + hgt / 2 - 3}" width="${w}" height="6" fill="${C.cream}" opacity=".9"/>
    <rect x="${x - 18}" y="${y + hgt + 6}" width="${w + 36}" height="12" rx="4" fill="${C.cream}"/>
    <rect x="${x - 18}" y="${y + hgt + 16}" width="${w + 36}" height="4" fill="rgba(90,50,20,.15)"/>
  </g>`;
}

function curtains(x, y, w, hgt, color = C.pink) {
  return `<g>
    <rect x="${x - 30}" y="${y - 26}" width="${w + 60}" height="8" rx="4" fill="${C.woodD}"/>
    <path d="M${x - 26} ${y - 20} q20 ${hgt * 0.5} 4 ${hgt + 20} h46 q-26 -${hgt * 0.6} 10 -${hgt + 20}Z" fill="${color}" opacity=".92"/>
    <path d="M${x + w + 26} ${y - 20} q-20 ${hgt * 0.5} -4 ${hgt + 20} h-46 q26 -${hgt * 0.6} -10 -${hgt + 20}Z" fill="${color}" opacity=".92"/>
    <path d="M${x - 8} ${y - 18} q6 ${hgt * 0.5} 2 ${hgt + 16}" stroke="rgba(255,255,255,.4)" stroke-width="3" fill="none"/>
  </g>`;
}

export function pot(x, y, s = 1, kind = 'leafy', potColor = C.terra) {
  const leaves = {
    leafy: `<path d="M0 -10 C-30 -30 -34 -64 -10 -78 C-6 -50 -2 -30 0 -10Z" fill="${C.leaf}"/><path d="M0 -10 C30 -34 40 -66 14 -84 C8 -54 4 -32 0 -10Z" fill="${C.leafD}"/><path d="M0 -10 C-12 -40 0 -74 6 -96 C14 -66 8 -36 0 -10Z" fill="${C.leafL}"/>`,
    monstera: `<ellipse cx="-22" cy="-52" rx="24" ry="16" transform="rotate(-30 -22 -52)" fill="${C.leafD}"/><ellipse cx="20" cy="-62" rx="26" ry="17" transform="rotate(25 20 -62)" fill="${C.leaf}"/><ellipse cx="-2" cy="-86" rx="20" ry="14" fill="${C.leafL}"/><path d="M0 -8 L-18 -50 M0 -8 L18 -58 M0 -8 L-2 -84" stroke="${C.leafD}" stroke-width="2"/>`,
    cactus: `<rect x="-9" y="-62" width="18" height="56" rx="9" fill="${C.leaf}"/><rect x="-24" y="-44" width="12" height="26" rx="6" fill="${C.leaf}"/><rect x="12" y="-52" width="12" height="22" rx="6" fill="${C.leafD}"/><circle cx="0" cy="-64" r="5" fill="${C.pink}"/>`,
    flower: `<path d="M0 -8 V-50" stroke="${C.leafD}" stroke-width="3"/><ellipse cx="-10" cy="-26" rx="10" ry="5" transform="rotate(-30 -10 -26)" fill="${C.leaf}"/><ellipse cx="10" cy="-34" rx="10" ry="5" transform="rotate(30 10 -34)" fill="${C.leaf}"/>
      ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-62" rx="7" ry="12" transform="rotate(${a} 0 -52)" fill="${C.pink}"/>`).join('')}<circle cx="0" cy="-52" r="6" fill="${C.mustard}"/>`,
    tulips: [-14, 0, 14].map((dx, i) => `<path d="M${dx} -8 V${-44 - i * 6}" stroke="${C.leafD}" stroke-width="3"/><path d="M${dx - 8} ${-48 - i * 6} q8 -18 16 0 q-8 10 -16 0Z" fill="${['#f28c8c', '#f6c35b', '#e98fc1'][i]}"/>`).join(''),
    lavender: Array.from({ length: 7 }, (_, i) => { const dx = -18 + i * 6; return `<path d="M${dx} -8 V${-40 - (i % 3) * 8}" stroke="${C.leafD}" stroke-width="2"/>${[0, 1, 2, 3].map((k) => `<circle cx="${dx}" cy="${-40 - (i % 3) * 8 + k * 6}" r="3" fill="#a98bd6"/>`).join('')}`; }).join(''),
    bonsai: `<path d="M0 -6 C-4 -24 10 -30 4 -46" stroke="${C.woodD}" stroke-width="6" fill="none"/><ellipse cx="-14" cy="-48" rx="22" ry="12" fill="${C.leafD}"/><ellipse cx="14" cy="-58" rx="20" ry="11" fill="${C.leaf}"/>`,
  }[kind];
  return `<g transform="translate(${x} ${y}) scale(${s})">${leaves}<path d="M-20 -10 H20 L15 18 H-15Z" fill="${potColor}"/><rect x="-23" y="-14" width="46" height="8" rx="3" fill="${potColor}" opacity=".85"/><path d="M-16 -2 H16" stroke="rgba(255,255,255,.3)" stroke-width="3"/></g>`;
}

function hanging(x, y, len = 60) {
  return `<g><line x1="${x}" y1="0" x2="${x}" y2="${y + len - 20}" stroke="#8a6a50" stroke-width="2"/>
    <path d="M${x - 18} ${y + len - 22} H${x + 18} L${x + 13} ${y + len} H${x - 13}Z" fill="${C.cream}"/>
    ${[-16, -6, 6, 16].map((dx, i) => `<path d="M${x + dx * 0.6} ${y + len - 20} q${dx} ${20 + i * 6} ${dx * 0.4} ${40 + i * 10}" stroke="${i % 2 ? C.leaf : C.leafD}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}
    ${[-12, 0, 12].map((dx) => `<ellipse cx="${x + dx}" cy="${y + len - 24}" rx="9" ry="6" fill="${C.leaf}"/>`).join('')}</g>`;
}

function shelf(x, y, w) {
  const books = [];
  let bx = x + 6;
  const colors = ['#e8a0a0', '#93aee0', '#e9cf7a', '#9cc79a', '#b9a3dd', '#f2b880'];
  for (let i = 0; bx < x + w - 50; i++) { const bw = 9 + (i % 3) * 3; const bh = 26 + (i % 4) * 4; books.push(`<rect x="${bx}" y="${y - bh}" width="${bw}" height="${bh}" rx="1.5" fill="${colors[i % 6]}"/>`); bx += bw + 2; }
  return `<g>${books.join('')}${pot(x + w - 22, y - 4, 0.38, 'leafy', C.cream)}<rect x="${x}" y="${y}" width="${w}" height="7" rx="2" fill="${C.woodD}"/></g>`;
}

const frameArt = (x, y, w, hgt, tone = '#bfe0d0') => `<g><rect x="${x}" y="${y}" width="${w}" height="${hgt}" rx="3" fill="${C.woodL}"/><rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${hgt - 10}" fill="${tone}"/><path d="M${x + 5} ${y + hgt - 5} L${x + w * 0.4} ${y + hgt * 0.45} L${x + w * 0.6} ${y + hgt * 0.7} L${x + w * 0.75} ${y + hgt * 0.55} L${x + w - 5} ${y + hgt - 5}Z" fill="rgba(80,120,80,.45)"/><circle cx="${x + w * 0.72}" cy="${y + hgt * 0.3}" r="${w * 0.08}" fill="#fff3c4"/></g>`;
const rug = (cx, cy, rx, ry, color = C.pink) => `<g><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity=".85"/><ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.78}" ry="${ry * 0.7}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4" stroke-dasharray="10 8"/></g>`;
const pendant = (u, x, len, color = C.mustard) => `<g><line x1="${x}" y1="0" x2="${x}" y2="${len}" stroke="#5a4636" stroke-width="2"/><path d="M${x - 22} ${len + 22} Q${x} ${len - 8} ${x + 22} ${len + 22}Z" fill="${color}"/><circle cx="${x}" cy="${len + 40}" r="70" fill="url(#${u}glow)" class="lampglow"/></g>`;
const lights = (x1, x2, y) => {
  const n = Math.floor((x2 - x1) / 44);
  return `<g><path d="M${x1} ${y} Q${(x1 + x2) / 2} ${y + 30} ${x2} ${y}" stroke="#6b5240" stroke-width="1.5" fill="none"/>${Array.from({ length: n }, (_, i) => { const t = (i + 0.5) / n; const px = x1 + (x2 - x1) * t; const py = y + 30 * 4 * t * (1 - t) * 0.5 + 6; return `<circle cx="${px}" cy="${py}" r="5" fill="#ffe08f" class="bulb"/>`; }).join('')}</g>`;
};
const dimLayer = () => '<rect width="800" height="500" style="fill:#1b2142;opacity:var(--dim)" pointer-events="none"/>';

// ---------- 8 khu ----------
const SCENES = {
  living: (u) => `${room(u)}
    ${windowBig(u, 290, 50, 220, 200, { panes: 3 })}${curtains(290, 50, 220, 200, C.pink)}
    ${shelf(40, 120, 170)}${shelf(40, 200, 170)}
    ${frameArt(600, 80, 90, 70)}${frameArt(700, 120, 60, 80, '#f4d9c6')}
    ${hanging(250, 0, 90)}${hanging(560, 0, 70)}
    ${rug(400, 440, 230, 45, '#e9c3a8')}
    <g><rect x="250" y="300" width="300" height="70" rx="26" fill="${C.blue}"/><rect x="240" y="270" width="320" height="60" rx="26" fill="#a3c3df"/><rect x="232" y="300" width="40" height="80" rx="18" fill="${C.blue}"/><rect x="528" y="300" width="40" height="80" rx="18" fill="${C.blue}"/>
      <rect x="290" y="282" width="60" height="44" rx="14" fill="${C.mustard}"/><rect x="450" y="282" width="60" height="44" rx="14" fill="${C.pink}"/><rect x="262" y="378" width="10" height="16" fill="${C.woodD}"/><rect x="528" y="378" width="10" height="16" fill="${C.woodD}"/></g>
    <g><ellipse cx="400" cy="440" rx="90" ry="14" fill="rgba(60,30,10,.15)"/><rect x="320" y="405" width="160" height="14" rx="6" fill="${C.wood}"/><rect x="332" y="418" width="10" height="24" fill="${C.woodD}"/><rect x="458" y="418" width="10" height="24" fill="${C.woodD}"/><rect x="380" y="392" width="16" height="14" rx="3" fill="${C.white}"/><path d="M386 388 q4 -8 0 -14" stroke="rgba(255,255,255,.7)" stroke-width="2" fill="none"/></g>
    ${pot(70, 390, 1.3, 'monstera')}${pot(730, 400, 1.1, 'leafy', C.cream)}
    ${dimLayer()}`,

  bedroom: (u) => `${room(u)}
    ${windowBig(u, 470, 60, 200, 180)}${curtains(470, 60, 200, 180, '#fde8e0')}
    ${lights(60, 420, 40)}
    ${frameArt(120, 90, 80, 100, '#e3d5f0')}${frameArt(215, 110, 60, 60, '#d5ecf0')}
    <g><rect x="60" y="230" width="340" height="40" rx="18" fill="${C.woodL}"/><rect x="70" y="260" width="330" height="90" rx="20" fill="${C.white}"/>
      <path d="M70 300 Q235 280 400 300 V360 Q235 380 70 360Z" fill="#f6c9cf"/><path d="M90 320 Q140 310 190 320" stroke="#fff" stroke-width="5" fill="none" opacity=".6"/>
      <rect x="90" y="248" width="90" height="40" rx="18" fill="${C.cream}"/><rect x="190" y="252" width="80" height="36" rx="16" fill="#cfe3f2"/>
      <rect x="70" y="350" width="330" height="16" rx="6" fill="${C.wood}"/><rect x="80" y="364" width="12" height="18" fill="${C.woodD}"/><rect x="378" y="364" width="12" height="18" fill="${C.woodD}"/>
      <g transform="translate(330 270)"><circle r="20" fill="#f4e1cf"/><circle cx="-14" cy="-16" r="8" fill="#f4e1cf"/><circle cx="14" cy="-16" r="8" fill="#f4e1cf"/><circle cx="-6" cy="-2" r="2.5" fill="#5a4636"/><circle cx="6" cy="-2" r="2.5" fill="#5a4636"/><ellipse cx="0" cy="6" rx="5" ry="3.5" fill="#e3b8a0"/></g></g>
    <g><rect x="420" y="300" width="70" height="60" rx="6" fill="${C.wood}"/><rect x="426" y="312" width="58" height="18" rx="3" fill="${C.woodL}"/><circle cx="455" cy="321" r="3" fill="${C.woodD}"/>
      <path d="M440 300 L446 262 H464 L470 300Z" fill="${C.cream}"/><circle cx="455" cy="280" r="40" fill="url(#${u}glow)" class="lampglow"/></g>
    ${rug(240, 450, 200, 32, '#cdb8e6')}
    ${pot(730, 410, 1.2, 'monstera', C.cream)}${pot(620, 262, 0.55, 'flower', C.pink)}
    ${dimLayer()}`,

  kitchen: (u) => `${room(u, 'tile')}
    <rect x="0" y="170" width="800" height="110" fill="url(#${u}wtile)"/>
    ${windowBig(u, 300, 50, 200, 130, { panes: 2 })}
    <g>${[40, 140, 560, 660].map((x) => `<rect x="${x}" y="40" width="96" height="110" rx="6" fill="${C.cream}"/><rect x="${x + 8}" y="48" width="80" height="94" rx="4" fill="#f8efe1"/><circle cx="${x + 82}" cy="${100}" r="3" fill="${C.woodD}"/>`).join('')}</g>
    <g><rect x="0" y="272" width="800" height="14" rx="3" fill="${C.woodL}"/><rect x="0" y="286" width="800" height="70" fill="${C.cream}"/>
      ${[20, 140, 260, 520, 640].map((x) => `<rect x="${x}" y="294" width="110" height="54" rx="5" fill="#f8efe1" stroke="#eadcc8"/><rect x="${x + 45}" y="302" width="20" height="4" rx="2" fill="${C.woodD}"/>`).join('')}
      <rect x="380" y="294" width="120" height="56" rx="6" fill="#cfd6db"/><rect x="392" y="304" width="96" height="30" rx="4" fill="#3d4448"/></g>
    <g><rect x="360" y="262" width="80" height="12" rx="5" fill="#d4dde2"/><path d="M400 262 V238 q0 -10 10 -10 h6" stroke="#aab4ba" stroke-width="5" fill="none"/></g>
    <g>${[[600, 168], [640, 178], [690, 170]].map(([x, l], i) => `<line x1="${x}" y1="150" x2="${x}" y2="${l}" stroke="#8a6a50" stroke-width="2"/><circle cx="${x}" cy="${l + 16}" r="16" fill="${['#8a8f96', '#c87f5a', '#8a8f96'][i]}"/><rect x="${x - 3}" y="${l}" width="6" height="8" fill="#5a4636"/>`).join('')}</g>
    <g><rect x="120" y="244" width="70" height="30" rx="8" fill="${C.terra}"/><ellipse cx="155" cy="244" rx="35" ry="8" fill="#e6a27f"/>
      <circle cx="140" cy="236" r="9" fill="#f28c8c"/><circle cx="160" cy="232" r="9" fill="#f6c35b"/><circle cx="172" cy="240" r="8" fill="${C.leafL}"/></g>
    ${pot(320, 192, 0.45, 'leafy', C.cream)}${pot(480, 192, 0.45, 'flower', C.cream)}
    <g><ellipse cx="400" cy="460" rx="150" ry="14" fill="rgba(60,30,10,.12)"/><rect x="260" y="400" width="280" height="16" rx="6" fill="${C.wood}"/><rect x="276" y="414" width="12" height="50" fill="${C.woodD}"/><rect x="512" y="414" width="12" height="50" fill="${C.woodD}"/>
      <rect x="350" y="388" width="44" height="14" rx="6" fill="${C.white}"/><circle cx="440" cy="392" r="12" fill="#f2c48d"/></g>
    ${pendant(u, 400, 20, '#9cc79a')}
    ${dimLayer()}`,

  study: (u) => `${room(u)}
    ${windowBig(u, 90, 60, 230, 170, { panes: 2, view: 'city' })}${curtains(90, 60, 230, 170, '#d9ead3')}
    <g><rect x="520" y="40" width="230" height="300" rx="6" fill="${C.wood}"/>${[90, 160, 230, 300].map((y) => `<rect x="530" y="${y}" width="210" height="6" fill="${C.woodD}"/>`).join('')}
      ${[0, 1, 2, 3].map((r) => Array.from({ length: 9 }, (_, i) => `<rect x="${536 + i * 22 + (r % 2) * 6}" y="${(r + 1) * 70 + 20 - 22 - (i % 3) * 5}" width="16" height="${22 + (i % 3) * 5}" rx="2" fill="${['#e8a0a0', '#93aee0', '#e9cf7a', '#9cc79a', '#b9a3dd', '#f2b880'][(i + r) % 6]}"/>`).join('')).join('')}</g>
    <g><rect x="380" y="110" width="110" height="80" rx="4" fill="#d9b48a"/>${[[390, 120, '#fff3b0'], [430, 125, '#cfe8ff'], [455, 150, '#ffd6d6'], [395, 155, '#d9f2d0']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="26" height="24" fill="${c}" transform="rotate(-4 ${x} ${y})"/>`).join('')}</g>
    <g><rect x="60" y="300" width="360" height="16" rx="5" fill="${C.woodL}"/><rect x="74" y="314" width="12" height="80" fill="${C.woodD}"/><rect x="394" y="314" width="12" height="80" fill="${C.woodD}"/><rect x="300" y="316" width="100" height="56" rx="4" fill="${C.wood}"/>
      <rect x="150" y="214" width="140" height="84" rx="8" fill="#41444a"/><rect x="158" y="222" width="124" height="66" rx="4" fill="#bfe3d8"/><path d="M158 288 L200 250 L230 270 L282 236 V288Z" fill="#8cc59f"/><rect x="210" y="296" width="20" height="6" fill="#41444a"/>
      <rect x="170" y="304" width="110" height="8" rx="3" fill="#f1ece4"/><rect x="100" y="270" width="16" height="30" rx="3" fill="${C.pink}"/><path d="M108 270 L90 240 H126Z" fill="${C.mustard}"/><circle cx="108" cy="262" r="45" fill="url(#${u}glow)" class="lampglow"/>
      <rect x="340" y="282" width="34" height="20" rx="3" fill="#f6efe6"/></g>
    <g><rect x="200" y="360" width="80" height="20" rx="8" fill="${C.terra}"/><rect x="210" y="320" width="60" height="44" rx="12" fill="#e09d79"/><rect x="236" y="378" width="8" height="40" fill="#5a4636"/><path d="M210 420 H270" stroke="#5a4636" stroke-width="6" stroke-linecap="round"/></g>
    ${pot(460, 410, 1.2, 'monstera')}${pot(345, 300, 0.4, 'cactus', C.cream)}
    ${dimLayer()}`,

  dressing: (u) => `${room(u)}
    <rect x="0" y="0" width="800" height="340" fill="rgba(255,240,240,.25)"/>
    <g><path d="M380 0 V40" stroke="#c9a95f" stroke-width="2"/><path d="M340 40 H420 L400 70 H360Z" fill="#f5d98a"/>${[350, 370, 390, 410].map((x) => `<circle cx="${x}" cy="76" r="4" fill="#fff3c4"/>`).join('')}<circle cx="380" cy="60" r="80" fill="url(#${u}glow)" class="lampglow"/></g>
    ${[[30, 'L'], [570, 'R']].map(([x]) => `<g><rect x="${x}" y="40" width="200" height="300" rx="8" fill="${C.cream}"/><rect x="${x + 10}" y="50" width="180" height="160" rx="4" fill="#f6eee4"/>
      <line x1="${x + 18}" y1="66" x2="${x + 182}" y2="66" stroke="#b9a07e" stroke-width="4"/>
      ${Array.from({ length: 7 }, (_, i) => { const cx = x + 32 + i * 23; const col = ['#f3b6b6', '#cfe3f2', '#fff0c9', '#c9b5e3', '#bfe0c8', '#f6c9a8', '#e8a0a0'][i]; return `<path d="M${cx} 66 l-12 14 v${80 + (i % 3) * 20} h24 v-${80 + (i % 3) * 20} z" fill="${col}"/><path d="M${cx} 60 v6" stroke="#9a8a70" stroke-width="2"/>`; }).join('')}
      ${[220, 255, 290].map((y) => `<rect x="${x + 10}" y="${y}" width="180" height="28" rx="3" fill="#f3e8da"/><rect x="${x + 90}" y="${y + 12}" width="20" height="4" rx="2" fill="#c9a95f"/>`).join('')}</g>`).join('')}
    <g><rect x="320" y="110" width="120" height="200" rx="60" fill="#e8d9c1"/><rect x="330" y="120" width="100" height="180" rx="50" fill="#dcecf3"/><path d="M345 160 Q380 140 415 200" stroke="rgba(255,255,255,.7)" stroke-width="6" fill="none"/><rect x="350" y="306" width="60" height="30" rx="6" fill="#e8d9c1"/></g>
    <g><ellipse cx="560" cy="430" rx="60" ry="14" fill="rgba(60,30,10,.12)"/><rect x="510" y="390" width="100" height="40" rx="20" fill="${C.pink}"/><rect x="518" y="382" width="84" height="16" rx="8" fill="#f8cfd2"/></g>
    <g>${[[250, '#e48f98'], [275, '#8fb5d6'], [300, '#e9cf7a']].map(([x, c]) => `<path d="M${x} 330 q-4 -20 6 -20 h8 v18 h6 v2Z" fill="${c}"/>`).join('')}</g>
    ${rug(400, 450, 240, 34, '#f6dcd6')}
    ${pot(470, 330, 0.8, 'tulips', C.cream)}${pot(740, 420, 1, 'leafy', C.cream)}
    ${dimLayer()}`,

  bathroom: (u) => `${room(u, 'tile')}
    <rect x="0" y="0" width="800" height="340" fill="url(#${u}wtile)"/>
    ${windowBig(u, 520, 50, 160, 120, { panes: 2 })}
    <g><rect x="80" y="70" width="130" height="150" rx="65" fill="${C.woodL}"/><rect x="90" y="80" width="110" height="130" rx="55" fill="#dcecf3"/><path d="M110 120 Q140 100 170 150" stroke="rgba(255,255,255,.7)" stroke-width="5" fill="none"/>
      <rect x="60" y="240" width="170" height="16" rx="6" fill="${C.white}"/><rect x="80" y="256" width="130" height="80" rx="6" fill="${C.wood}"/><rect x="88" y="266" width="54" height="60" rx="3" fill="${C.woodL}"/><rect x="148" y="266" width="54" height="60" rx="3" fill="${C.woodL}"/>
      <path d="M145 240 V222 q0 -8 8 -8 h8" stroke="#aab4ba" stroke-width="4" fill="none"/><rect x="190" y="222" width="12" height="18" rx="3" fill="${C.pink}"/><rect x="72" y="226" width="10" height="14" rx="3" fill="#9cc79a"/></g>
    <g><path d="M330 330 Q330 410 400 410 H660 Q730 410 730 330Z" fill="${C.white}"/><rect x="320" y="318" width="420" height="20" rx="10" fill="#f1ece4"/>
      ${[[380, 314, 16], [410, 304, 22], [450, 310, 18], [490, 300, 24], [530, 308, 18], [580, 302, 20], [620, 312, 16], [660, 306, 18]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".95"/>`).join('')}
      <path d="M730 320 V250 q0 -16 -16 -16 h-16" stroke="#aab4ba" stroke-width="6" fill="none"/><rect x="350" y="408" width="14" height="20" rx="4" fill="#c9a95f"/><rect x="696" y="408" width="14" height="20" rx="4" fill="#c9a95f"/>
      <circle cx="460" cy="288" r="7" fill="#fff" opacity=".7" class="bubble"/><circle cx="520" cy="270" r="5" fill="#fff" opacity=".6" class="bubble"/></g>
    <g><rect x="270" y="140" width="10" height="120" fill="${C.woodD}"/><rect x="250" y="150" width="50" height="8" rx="4" fill="${C.woodD}"/><rect x="252" y="156" width="46" height="70" rx="6" fill="#f6c9a8"/><rect x="252" y="200" width="46" height="8" fill="#fff" opacity=".6"/></g>
    ${hanging(470, 0, 100)}${pot(770, 330, 0.9, 'leafy', C.cream)}${pot(560, 186, 0.5, 'cactus', C.cream)}
    ${rug(180, 450, 110, 26, '#bfe0d0')}
    ${dimLayer()}`,

  yard: (u) => `<rect width="800" height="500" fill="url(#${u}sky)"/>
    <circle cx="640" cy="80" r="40" style="fill:var(--sun)" class="sun"/><g class="stars" fill="#fff">${[[60, 40], [140, 120], [260, 30], [330, 150], [420, 60], [520, 30], [700, 160], [760, 50], [380, 110], [610, 180]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.8"/>`).join('')}</g>
    <g fill="#fff" opacity=".9" class="cloud"><ellipse cx="180" cy="80" rx="60" ry="18"/><ellipse cx="220" cy="66" rx="40" ry="20"/><ellipse cx="480" cy="110" rx="50" ry="14"/></g>
    <path d="M0 250 Q200 180 420 230 T800 210 V500 H0Z" fill="#a9d295"/><path d="M0 300 Q300 250 560 290 T800 280 V500 H0Z" fill="#8cc47d"/>
    <g>${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 52}" y="262" width="16" height="70" rx="6" fill="${C.cream}"/>`).join('')}<rect x="0" y="280" width="800" height="8" fill="${C.cream}"/><rect x="0" y="310" width="800" height="8" fill="${C.cream}"/></g>
    <g><rect x="80" y="150" width="20" height="190" rx="6" fill="${C.woodD}"/><circle cx="90" cy="140" r="70" fill="${C.leafD}"/><circle cx="50" cy="170" r="45" fill="${C.leaf}"/><circle cx="130" cy="170" r="50" fill="${C.leaf}"/><circle cx="96" cy="110" r="40" fill="${C.leafL}"/>
      ${[[60, 150], [120, 130], [100, 180], [140, 190]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#f28c8c"/>`).join('')}</g>
    <path d="M360 500 Q380 420 420 360 Q440 330 470 320" stroke="#e8d2a8" stroke-width="60" fill="none" stroke-linecap="round"/>
    <path d="M360 500 Q380 420 420 360 Q440 330 470 320" stroke="#dcc396" stroke-width="60" fill="none" stroke-dasharray="4 26" stroke-linecap="round"/>
    ${[[180, 400], [260, 430], [560, 400], [650, 440], [730, 380], [140, 460], [600, 470]].map(([x, y], i) => `<g>${Array.from({ length: 6 }, (_, k) => { const dx = x - 30 + k * 12; const col = ['#f28c8c', '#f6c35b', '#e98fc1', '#a98bd6', '#fff', '#f5a96b'][(i + k) % 6]; return `<path d="M${dx} ${y} v-${16 + (k % 3) * 6}" stroke="${C.leafD}" stroke-width="2"/><circle cx="${dx}" cy="${y - 18 - (k % 3) * 6}" r="6" fill="${col}"/><circle cx="${dx}" cy="${y - 18 - (k % 3) * 6}" r="2" fill="${C.mustard}"/>`; }).join('')}<ellipse cx="${x}" cy="${y + 4}" rx="40" ry="8" fill="${C.leafD}" opacity=".5"/></g>`).join('')}
    <g><rect x="660" y="250" width="70" height="60" rx="6" fill="${C.wood}"/><path d="M650 254 L695 220 L740 254Z" fill="${C.terra}"/><rect x="684" y="276" width="22" height="34" rx="10" fill="${C.woodD}"/></g>
    <g><rect x="470" y="330" width="40" height="30" rx="4" fill="#8fb5d6"/><path d="M510 340 q20 -4 24 10" stroke="#8fb5d6" stroke-width="5" fill="none"/><path d="M470 334 h-14" stroke="#8fb5d6" stroke-width="5"/></g>
    ${dimLayer()}`,

  balcony: (u) => `<rect width="800" height="500" fill="url(#${u}sky)"/>
    <circle cx="600" cy="110" r="36" style="fill:var(--sun)" class="sun"/><g class="stars" fill="#fff">${[[60, 40], [140, 120], [260, 30], [330, 150], [420, 60], [520, 30], [700, 160], [760, 50], [380, 110], [610, 180]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.8"/>`).join('')}</g>
    <g fill="#fff" opacity=".9" class="cloud"><ellipse cx="200" cy="90" rx="70" ry="18"/><ellipse cx="250" cy="74" rx="40" ry="18"/></g>
    <path d="M0 260 Q150 200 320 240 T640 220 T800 240 V500 H0Z" fill="#b7d9a5"/>
    <g fill="#d8cbe6" opacity=".9">${[[60, 60], [130, 90], [210, 50], [520, 70], [600, 100], [690, 60]].map(([x, hgt]) => `<rect x="${x}" y="${270 - hgt}" width="54" height="${hgt + 30}" rx="3"/>`).join('')}</g>
    <rect x="0" y="0" width="800" height="30" fill="${C.woodD}"/><rect x="0" y="0" width="30" height="500" fill="${C.cream}"/><rect x="770" y="0" width="30" height="500" fill="${C.cream}"/>
    ${lights(40, 760, 30)}
    <rect x="0" y="360" width="800" height="140" style="fill:var(--floor)"/>${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${370 + i * 18}" x2="800" y2="${370 + i * 18}" stroke="rgba(90,50,20,.12)" stroke-width="2"/>`).join('')}
    <g><rect x="0" y="270" width="800" height="10" rx="4" fill="${C.woodL}"/>${Array.from({ length: 27 }, (_, i) => `<rect x="${16 + i * 30}" y="280" width="6" height="84" fill="${C.woodL}"/>`).join('')}<rect x="0" y="356" width="800" height="8" fill="${C.woodD}"/></g>
    <g><rect x="80" y="246" width="200" height="30" rx="4" fill="${C.terra}"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${94 + i * 21} 246 v-${14 + (i % 3) * 6}" stroke="${C.leafD}" stroke-width="2"/><circle cx="${94 + i * 21}" cy="${230 - (i % 3) * 6}" r="7" fill="${['#f28c8c', '#e98fc1', '#fff', '#f6c35b'][i % 4]}"/>`).join('')}
      <rect x="520" y="246" width="200" height="30" rx="4" fill="${C.terra}"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${534 + i * 21} 246 v-${14 + (i % 3) * 6}" stroke="${C.leafD}" stroke-width="2"/><circle cx="${534 + i * 21}" cy="${230 - (i % 3) * 6}" r="7" fill="${['#a98bd6', '#f6c35b', '#f28c8c', '#fff'][i % 4]}"/>`).join('')}</g>
    ${hanging(140, 20, 80)}${hanging(660, 20, 100)}
    <g><ellipse cx="400" cy="470" rx="110" ry="14" fill="rgba(60,30,10,.15)"/><ellipse cx="400" cy="408" rx="70" ry="16" fill="${C.white}"/><rect x="394" y="410" width="12" height="56" fill="#9a8a70"/><rect x="360" y="460" width="80" height="6" rx="3" fill="#9a8a70"/>
      <rect x="378" y="390" width="18" height="16" rx="4" fill="${C.pink}"/><path d="M396 394 q8 0 6 8" stroke="${C.pink}" stroke-width="3" fill="none"/><rect x="410" y="392" width="26" height="12" rx="3" fill="#f2c48d"/>
      <path d="M260 470 Q250 410 290 400 Q320 396 326 430 L330 470Z" fill="${C.mustard}"/><path d="M540 470 Q550 410 510 400 Q480 396 474 430 L470 470Z" fill="${C.mustard}"/></g>
    ${pot(70, 440, 1.2, 'monstera')}${pot(730, 450, 1.1, 'lavender', C.cream)}
    ${dimLayer()}`,
};

let uidSeq = 0;
export function sceneSvg(roomId) {
  const u = `s${(uidSeq++).toString(36)}`;
  const body = (SCENES[roomId] ?? SCENES.living)(u);
  return svgFrom(`<svg class="scene-art" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${defs(u)}${body}</svg>`);
}

// ---------- Nội thất mua được (viewBox 100×100, gốc ở đáy giữa) ----------
const SPRITES = {
  sofa: `<rect x="8" y="46" width="84" height="34" rx="12" fill="${C.blue}"/><rect x="12" y="30" width="76" height="30" rx="12" fill="#a3c3df"/><rect x="4" y="50" width="16" height="36" rx="8" fill="${C.blue}"/><rect x="80" y="50" width="16" height="36" rx="8" fill="${C.blue}"/><rect x="24" y="38" width="22" height="18" rx="6" fill="${C.mustard}"/><rect x="14" y="86" width="5" height="8" fill="${C.woodD}"/><rect x="81" y="86" width="5" height="8" fill="${C.woodD}"/>`,
  bed: `<rect x="6" y="30" width="16" height="64" rx="5" fill="${C.wood}"/><rect x="14" y="52" width="82" height="30" rx="8" fill="${C.white}"/><path d="M34 52 H96 V82 H34Z" fill="#f6c9cf"/><rect x="18" y="44" width="24" height="16" rx="7" fill="${C.cream}"/><rect x="14" y="80" width="82" height="8" rx="3" fill="${C.wood}"/><rect x="90" y="86" width="5" height="8" fill="${C.woodD}"/>`,
  chair: `<rect x="30" y="14" width="40" height="44" rx="10" fill="${C.terra}"/><rect x="24" y="52" width="52" height="16" rx="7" fill="#e09d79"/><rect x="30" y="66" width="5" height="28" fill="${C.woodD}"/><rect x="65" y="66" width="5" height="28" fill="${C.woodD}"/>`,
  lamp: `<path d="M30 40 L38 8 H62 L70 40Z" fill="${C.mustard}"/><rect x="47" y="40" width="6" height="46" fill="${C.woodD}"/><ellipse cx="50" cy="92" rx="18" ry="5" fill="${C.woodD}"/><circle cx="50" cy="30" r="28" fill="rgba(255,214,140,.35)"/>`,
  plant: pot(50, 80, 0.8, 'leafy').replace(/^<g transform="[^"]+">/, '<g transform="translate(50 80) scale(.8)">'),
  books: `<rect x="10" y="20" width="80" height="74" rx="4" fill="${C.wood}"/><rect x="14" y="54" width="72" height="4" fill="${C.woodD}"/>${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${16 + i * 11}" y="${28 + (i % 2) * 4}" width="9" height="${26 - (i % 2) * 4}" fill="${['#e8a0a0', '#93aee0', '#e9cf7a', '#9cc79a', '#b9a3dd', '#f2b880'][i]}"/><rect x="${16 + i * 11}" y="${64 + (i % 3) * 3}" width="9" height="${26 - (i % 3) * 3}" fill="${['#9cc79a', '#f2b880', '#e8a0a0', '#93aee0', '#e9cf7a', '#b9a3dd'][i]}"/>`).join('')}`,
  clock: `<rect x="34" y="10" width="32" height="84" rx="10" fill="${C.woodD}"/><circle cx="50" cy="32" r="13" fill="${C.cream}"/><path d="M50 32 V24 M50 32 L56 35" stroke="#5a4636" stroke-width="2"/><rect x="46" y="50" width="8" height="30" rx="4" fill="#e9cf7a"/>`,
  frame: `<rect x="16" y="14" width="68" height="56" rx="3" fill="${C.woodL}"/><rect x="22" y="20" width="56" height="44" fill="#bfe0d0"/><path d="M22 64 L44 40 L58 54 L66 46 L78 64Z" fill="#7fb574"/><circle cx="66" cy="30" r="5" fill="#fff3c4"/>`,
  window: `<rect x="12" y="10" width="76" height="70" rx="4" fill="${C.cream}"/><rect x="18" y="16" width="64" height="58" fill="#a9d8f2"/><rect x="48" y="16" width="4" height="58" fill="${C.cream}"/><rect x="18" y="43" width="64" height="4" fill="${C.cream}"/><rect x="8" y="80" width="84" height="6" rx="2" fill="${C.cream}"/>`,
  mirror: `<rect x="28" y="6" width="44" height="80" rx="22" fill="${C.woodL}"/><rect x="33" y="11" width="34" height="70" rx="17" fill="#dcecf3"/><path d="M40 30 Q50 22 58 44" stroke="#fff" stroke-width="3" fill="none"/><rect x="40" y="86" width="20" height="8" rx="3" fill="${C.woodL}"/>`,
  tv: `<rect x="10" y="20" width="80" height="50" rx="5" fill="#41444a"/><rect x="15" y="25" width="70" height="40" rx="3" fill="#bfe3d8"/><rect x="20" y="74" width="60" height="18" rx="4" fill="${C.wood}"/>`,
  teddy: `<circle cx="50" cy="70" r="22" fill="#d9a77a"/><circle cx="50" cy="38" r="18" fill="#d9a77a"/><circle cx="36" cy="24" r="7" fill="#d9a77a"/><circle cx="64" cy="24" r="7" fill="#d9a77a"/><circle cx="44" cy="36" r="2.5" fill="#4b3f36"/><circle cx="56" cy="36" r="2.5" fill="#4b3f36"/><ellipse cx="50" cy="45" rx="6" ry="4" fill="#f3d4b8"/><path d="M40 60 q10 8 20 0" stroke="${C.pinkD}" stroke-width="4" fill="none"/>`,
  guitar: `<rect x="46" y="6" width="8" height="50" fill="${C.woodD}"/><circle cx="50" cy="62" r="16" fill="${C.terra}"/><circle cx="50" cy="80" r="18" fill="${C.terra}"/><circle cx="50" cy="70" r="5" fill="#5a4636"/>`,
  candle: `<rect x="38" y="50" width="24" height="40" rx="4" fill="${C.cream}"/><path d="M50 50 V44" stroke="#5a4636" stroke-width="2"/><path d="M50 30 q-6 8 0 14 q6 -6 0 -14Z" fill="#f6c35b"/><circle cx="50" cy="38" r="16" fill="rgba(255,214,140,.4)"/>`,
  flowers: `${[[-12, '#f28c8c'], [0, '#f6c35b'], [12, '#e98fc1'], [-6, '#fff'], [6, '#a98bd6']].map(([dx, c], i) => `<path d="M50 62 L${50 + dx} ${26 + (i % 2) * 8}" stroke="${C.leafD}" stroke-width="2"/><circle cx="${50 + dx}" cy="${24 + (i % 2) * 8}" r="7" fill="${c}"/>`).join('')}<path d="M36 60 H64 L60 92 H40Z" fill="#cfe3f2"/>`,
  cat: `<ellipse cx="54" cy="76" rx="28" ry="16" fill="#f2b880"/><circle cx="30" cy="62" r="15" fill="#f2b880"/><path d="M19 54 L22 40 L30 50Z M41 54 L38 40 L30 50Z" fill="#f2b880"/><circle cx="25" cy="62" r="2" fill="#4b3f36"/><circle cx="35" cy="62" r="2" fill="#4b3f36"/><path d="M80 76 q14 -4 10 -22" stroke="#f2b880" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M44 70 q6 -4 12 0 M58 72 q6 -4 12 0" stroke="#e0965c" stroke-width="3" fill="none"/>`,
  bath: `<path d="M8 50 Q8 86 30 86 H70 Q92 86 92 50Z" fill="${C.white}"/><rect x="4" y="44" width="92" height="10" rx="5" fill="#f1ece4"/>${[20, 34, 48, 62, 76].map((x, i) => `<circle cx="${x}" cy="${42 - (i % 2) * 4}" r="${8 + (i % 2) * 3}" fill="#fff"/>`).join('')}<rect x="18" y="86" width="6" height="8" fill="#c9a95f"/><rect x="76" y="86" width="6" height="8" fill="#c9a95f"/>`,
  cup: `<path d="M30 54 H66 L62 86 H34Z" fill="${C.white}"/><path d="M66 60 q12 0 10 12 q-2 8 -12 8" stroke="${C.white}" stroke-width="5" fill="none"/><ellipse cx="48" cy="90" rx="26" ry="5" fill="${C.cream}"/><path d="M42 48 q4 -8 0 -14 M54 48 q4 -8 0 -14" stroke="rgba(180,160,140,.6)" stroke-width="3" fill="none"/>`,
  radio: `<rect x="14" y="40" width="72" height="48" rx="10" fill="${C.terra}"/><circle cx="38" cy="64" r="14" fill="#f6e3cf"/><rect x="58" y="52" width="20" height="8" rx="3" fill="#f6e3cf"/><circle cx="68" cy="74" r="5" fill="#f6e3cf"/><path d="M24 40 L40 20" stroke="#5a4636" stroke-width="3"/>`,
  globe: `<circle cx="50" cy="42" r="26" fill="#8fc5e6"/><path d="M36 30 q10 6 6 16 q-6 6 2 12 M58 24 q8 10 2 18 q-6 6 4 16" stroke="#7fb574" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M22 42 a28 28 0 0 0 56 0" stroke="#c9a95f" stroke-width="3" fill="none"/><rect x="47" y="70" width="6" height="14" fill="#c9a95f"/><ellipse cx="50" cy="88" rx="18" ry="5" fill="${C.woodD}"/>`,
  monstera: pot(50, 80, 0.85, 'monstera').replace(/^<g transform="[^"]+">/, '<g transform="translate(50 80) scale(.85)">'),
  cactus: pot(50, 80, 0.9, 'cactus', C.cream).replace(/^<g transform="[^"]+">/, '<g transform="translate(50 80) scale(.9)">'),
  tulips: pot(50, 80, 0.9, 'tulips', '#cfe3f2').replace(/^<g transform="[^"]+">/, '<g transform="translate(50 80) scale(.9)">'),
  lavender: pot(50, 80, 0.95, 'lavender', C.cream).replace(/^<g transform="[^"]+">/, '<g transform="translate(50 80) scale(.95)">'),
  bonsai: pot(50, 80, 0.95, 'bonsai', '#8fb5d6').replace(/^<g transform="[^"]+">/, '<g transform="translate(50 80) scale(.95)">'),
  sunflower: `<path d="M50 92 V34" stroke="${C.leafD}" stroke-width="4"/><ellipse cx="38" cy="64" rx="12" ry="6" transform="rotate(-30 38 64)" fill="${C.leaf}"/><ellipse cx="62" cy="56" rx="12" ry="6" transform="rotate(30 62 56)" fill="${C.leaf}"/>${Array.from({ length: 12 }, (_, i) => `<ellipse cx="50" cy="16" rx="5" ry="11" transform="rotate(${i * 30} 50 30)" fill="#f6c35b"/>`).join('')}<circle cx="50" cy="30" r="9" fill="#8a5a3a"/>`,
  hangplant: `<line x1="50" y1="0" x2="50" y2="30" stroke="#8a6a50" stroke-width="2"/><path d="M32 30 H68 L62 50 H38Z" fill="${C.cream}"/>${[-14, -5, 5, 14].map((dx, i) => `<path d="M${50 + dx * 0.6} 34 q${dx} ${18 + i * 6} ${dx * 0.4} ${40 + i * 8}" stroke="${i % 2 ? C.leaf : C.leafD}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}`,
  lights: `<path d="M4 20 Q50 54 96 20" stroke="#6b5240" stroke-width="1.5" fill="none"/>${[12, 26, 40, 54, 68, 82].map((x) => `<circle cx="${x}" cy="${20 + 34 * 4 * ((x - 4) / 92) * (1 - (x - 4) / 92) * 0.5 + 5}" r="4.5" fill="#ffe08f"/>`).join('')}`,
  rug: `<ellipse cx="50" cy="76" rx="46" ry="16" fill="${C.pink}"/><ellipse cx="50" cy="76" rx="36" ry="11" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 5"/>`,
  cushion: `<rect x="22" y="46" width="56" height="42" rx="16" fill="${C.mustard}"/><path d="M30 54 L70 80 M70 54 L30 80" stroke="rgba(255,255,255,.4)" stroke-width="3"/>`,
};
export const spriteSvg = (id) => svgFrom(`<svg class="sprite" viewBox="0 0 100 100" aria-hidden="true">${SPRITES[id] ?? `<text x="50" y="70" font-size="60" text-anchor="middle">?</text>`}</svg>`);
export const hasSprite = (id) => id in SPRITES;

// ---------- Cây trong vườn (P12.10): 4 giai đoạn, giai đoạn cuối vẽ riêng từng loại ----------
const RIPE = {
  carrot: `<path d="M44 58 q-8 -26 -2 -40 M50 58 q0 -30 4 -44 M56 58 q8 -24 14 -34" stroke="${C.leaf}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M40 60 H60 L52 84 Q50 88 48 84Z" fill="#f2914b"/>`,
  cabbage: `<circle cx="50" cy="62" r="24" fill="${C.leafL}"/><path d="M30 60 q20 -30 40 0" fill="${C.leaf}"/><path d="M36 66 q14 -20 28 0" fill="#bfe3a8"/><path d="M50 40 V80" stroke="${C.leafD}" stroke-width="2"/>`,
  sunflower: SPRITES.sunflower,
  tulip: `${[-12, 0, 12].map((dx, i) => `<path d="M${50 + dx} 86 V${40 + i * 4}" stroke="${C.leafD}" stroke-width="3"/><path d="M${42 + dx} ${38 + i * 4} q8 -20 16 0 q-8 12 -16 0Z" fill="${['#f28c8c', '#f6c35b', '#e98fc1'][i]}"/>`).join('')}<ellipse cx="38" cy="72" rx="10" ry="4" transform="rotate(-40 38 72)" fill="${C.leaf}"/><ellipse cx="62" cy="70" rx="10" ry="4" transform="rotate(40 62 70)" fill="${C.leaf}"/>`,
  strawberry: `<ellipse cx="50" cy="66" rx="30" ry="14" fill="${C.leaf}"/>${[[36, 66], [52, 72], [64, 62]].map(([x, y]) => `<path d="M${x - 8} ${y - 4} Q${x} ${y + 16} ${x + 8} ${y - 4}Z" fill="#ef5f6a"/><path d="M${x - 6} ${y - 5} L${x} ${y - 10} L${x + 6} ${y - 5}" fill="${C.leafD}"/>`).join('')}`,
  rose: `<path d="M50 86 V40" stroke="${C.leafD}" stroke-width="3"/><ellipse cx="40" cy="64" rx="10" ry="5" transform="rotate(-30 40 64)" fill="${C.leaf}"/><ellipse cx="60" cy="56" rx="10" ry="5" transform="rotate(30 60 56)" fill="${C.leaf}"/><circle cx="50" cy="34" r="14" fill="#e85d75"/><path d="M42 34 q8 -10 16 0 q-8 8 -16 0Z" fill="#c94360"/><path d="M46 30 q4 -4 8 0" stroke="#f7a1b1" stroke-width="2" fill="none"/>`,
  pumpkin: `<path d="M50 50 q4 -10 10 -12" stroke="${C.leafD}" stroke-width="4" fill="none"/><ellipse cx="50" cy="68" rx="28" ry="20" fill="#f29a3f"/><ellipse cx="50" cy="68" rx="12" ry="20" fill="#f7b15c"/><path d="M38 50 q-4 18 0 36 M62 50 q4 18 0 36" stroke="#d97d2a" stroke-width="2" fill="none"/>`,
  tomato: `<path d="M50 86 V30" stroke="${C.leafD}" stroke-width="3"/><path d="M50 50 L30 40 M50 60 L72 48" stroke="${C.leafD}" stroke-width="3"/>${[[30, 46], [40, 36], [70, 54], [60, 66], [38, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#ef4f4f"/><path d="M${x - 3} ${y - 6} h6" stroke="${C.leafD}" stroke-width="2"/>`).join('')}`,
};
export function plantSvg(seedId, stage, ripe) {
  let body;
  if (ripe) body = RIPE[seedId] ?? RIPE.carrot;
  else if (stage === 0) body = `<ellipse cx="50" cy="80" rx="8" ry="5" fill="#8a5a3a"/><circle cx="50" cy="76" r="3" fill="#e9cf7a"/>`;
  else if (stage === 1) body = `<path d="M50 84 V66" stroke="${C.leafD}" stroke-width="3"/><ellipse cx="42" cy="64" rx="9" ry="5" transform="rotate(-25 42 64)" fill="${C.leafL}"/><ellipse cx="58" cy="64" rx="9" ry="5" transform="rotate(25 58 64)" fill="${C.leaf}"/>`;
  else body = `<path d="M50 86 V44" stroke="${C.leafD}" stroke-width="3"/>${[[38, 72, -30], [62, 66, 30], [40, 56, -35], [60, 50, 35], [50, 42, 0]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="6" transform="rotate(${r} ${x} ${y})" fill="${r < 0 ? C.leaf : C.leafL}"/>`).join('')}`;
  return svgFrom(`<svg class="plant-art${ripe ? ' ripe' : ''}" viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`);
}

export function gardenBackdrop() {
  const u = `g${(uidSeq++).toString(36)}`;
  return svgFrom(`<svg class="garden-sky" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${defs(u)}
    <rect width="800" height="300" fill="url(#${u}sky)"/><circle cx="660" cy="70" r="34" style="fill:var(--sun)" class="sun"/><g class="stars" fill="#fff">${[[60, 40], [140, 120], [260, 30], [330, 150], [420, 60], [520, 30], [700, 160], [760, 50], [380, 110], [610, 180]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.8"/>`).join('')}</g><g class="cloud">
    <g fill="#fff" opacity=".9"><ellipse cx="160" cy="70" rx="60" ry="16"/><ellipse cx="200" cy="56" rx="36" ry="18"/><ellipse cx="460" cy="90" rx="46" ry="12"/></g></g>
    <path d="M0 200 Q200 140 420 180 T800 170 V300 H0Z" fill="#a9d295"/><path d="M0 240 Q300 200 560 230 T800 225 V300 H0Z" fill="#8cc47d"/>
    <g>${Array.from({ length: 17 }, (_, i) => `<rect x="${i * 50}" y="214" width="14" height="60" rx="5" fill="${C.cream}"/>`).join('')}<rect y="228" width="800" height="7" fill="${C.cream}"/><rect y="252" width="800" height="7" fill="${C.cream}"/></g>
    <g><rect x="700" y="140" width="16" height="130" rx="5" fill="${C.woodD}"/><circle cx="708" cy="130" r="50" fill="${C.leafD}"/><circle cx="680" cy="150" r="32" fill="${C.leaf}"/><circle cx="736" cy="152" r="34" fill="${C.leaf}"/>${[[690, 130], [726, 120], [712, 160]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#f28c8c"/>`).join('')}</g>
    ${[[80, 285], [300, 290], [520, 285]].map(([x, y], i) => Array.from({ length: 6 }, (_, k) => { const dx = x - 30 + k * 12; return `<path d="M${dx} ${y} v-${14 + (k % 3) * 5}" stroke="${C.leafD}" stroke-width="2"/><circle cx="${dx}" cy="${y - 16 - (k % 3) * 5}" r="5" fill="${['#f28c8c', '#f6c35b', '#e98fc1', '#a98bd6', '#fff'][(i + k) % 5]}"/>`; }).join('')).join('')}
    ${dimLayer().replace('800" height="500', '800" height="300')}</svg>`);
}
