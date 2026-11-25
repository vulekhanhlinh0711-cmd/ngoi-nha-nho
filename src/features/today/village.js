// P19.02: ngôi làng Giáng sinh (nhà bánh gừng, thông phủ tuyết, quả châu, đốm sáng vàng) — vẽ riêng bằng SVG.
import { svgFrom } from '../home/art.js';

const R = (seed) => { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };

function tree(x, base, w, h, tone = '#2f6b4f') {
  const tiers = 4;
  let s = `<rect x="${x - 4}" y="${base - 10}" width="8" height="12" fill="#6b4a32"/>`;
  for (let i = 0; i < tiers; i++) {
    const tw = w * (1 - i * 0.2), y0 = base - 8 - i * (h / tiers) * 0.85, y1 = y0 - (h / tiers) * 1.25;
    s += `<path d="M${x - tw / 2} ${y0} L${x} ${y1} L${x + tw / 2} ${y0} Q${x} ${y0 + 6} ${x - tw / 2} ${y0}Z" fill="${tone}"/>`;
    s += `<path d="M${x - tw / 2} ${y0} Q${x - tw / 4} ${y0 - 5} ${x} ${y0 - 1} Q${x + tw / 4} ${y0 - 6} ${x + tw / 2} ${y0}" stroke="#f4f1ea" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>`;
  }
  return s;
}

function house(x, base, w, h, { roof = '#c9433e', wall = '#d9a26f', door = '#8a4a2c', sign } = {}) {
  const rh = h * 0.55;
  const win = (wx, wy, ww, wh) => `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="2" fill="#ffcf73"/><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="2" fill="url(#vglow)" opacity=".8"/><path d="M${wx + ww / 2} ${wy} V${wy + wh} M${wx} ${wy + wh / 2} H${wx + ww}" stroke="${roof}" stroke-width="1.6"/>`;
  return `<g>
    <rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="4" fill="${wall}"/>
    <rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="4" fill="url(#vshade)"/>
    <path d="M${x - 10} ${base - h + 4} L${x + w / 2} ${base - h - rh} L${x + w + 10} ${base - h + 4}Z" fill="${roof}"/>
    <path d="M${x - 6} ${base - h + 2} L${x + w / 2} ${base - h - rh + 8} L${x + w + 6} ${base - h + 2} Q${x + w / 2} ${base - h - rh + 22} ${x - 6} ${base - h + 2}Z" fill="#f7f3ec"/>
    <path d="M${x - 10} ${base - h + 4} L${x + w / 2} ${base - h - rh} L${x + w + 10} ${base - h + 4}" stroke="#fff" stroke-width="5" fill="none" stroke-dasharray="2 7" stroke-linecap="round"/>
    <rect x="${x + w * 0.66}" y="${base - h - rh * 0.75}" width="${w * 0.12}" height="${rh * 0.5}" fill="#b5554a"/><rect x="${x + w * 0.64}" y="${base - h - rh * 0.8}" width="${w * 0.16}" height="6" rx="3" fill="#f7f3ec"/>
    ${win(x + w * 0.12, base - h * 0.78, w * 0.22, h * 0.26)}${win(x + w * 0.66, base - h * 0.78, w * 0.22, h * 0.26)}
    <rect x="${x + w * 0.4}" y="${base - h * 0.48}" width="${w * 0.2}" height="${h * 0.48}" rx="${w * 0.1}" fill="${door}"/><circle cx="${x + w * 0.55}" cy="${base - h * 0.24}" r="1.8" fill="#ffd773"/>
    <circle cx="${x + w * 0.5}" cy="${base - h * 0.56}" r="${w * 0.06}" fill="none" stroke="#2f6b4f" stroke-width="3"/><circle cx="${x + w * 0.5}" cy="${base - h * 0.5}" r="2" fill="#e84a4a"/>
    ${sign ? `<rect x="${x + w * 0.2}" y="${base - h * 0.98}" width="${w * 0.6}" height="12" rx="3" fill="#c9433e"/><text x="${x + w * 0.5}" y="${base - h * 0.98 + 9}" text-anchor="middle" font-size="8" font-weight="700" fill="#fff4dc" font-family="Georgia,serif">${sign}</text>` : ''}
    <path d="M${x - 4} ${base} q${w / 2 + 4} -8 ${w + 8} 0" fill="#f7f3ec"/>
  </g>`;
}

const ball = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff" opacity=".55"/>`;

export function villageSvg() {
  const rnd = R(7);
  const dots = Array.from({ length: 34 }, () => `<circle cx="${(rnd() * 800).toFixed(0)}" cy="${(rnd() * 130).toFixed(0)}" r="${(1.5 + rnd() * 4).toFixed(1)}" fill="#e3b964" opacity="${(0.35 + rnd() * 0.6).toFixed(2)}" class="vdot"/>`).join('');
  const base = 200;
  return svgFrom(`<svg class="village" viewBox="0 0 800 230" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <radialGradient id="vglow"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
      <linearGradient id="vshade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
      <linearGradient id="vsnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf8f2"/><stop offset="1" stop-color="#e6e1d6"/></linearGradient>
    </defs>
    ${dots}
    <g opacity=".35">${tree(70, base - 20, 60, 120, '#244c3b')}${tree(330, base - 25, 50, 110, '#244c3b')}${tree(520, base - 20, 60, 130, '#244c3b')}${tree(760, base - 25, 55, 120, '#244c3b')}</g>
    ${tree(110, base, 80, 150)}${tree(190, base, 56, 110, '#3d7a5c')}
    ${house(230, base, 110, 100, { roof: '#c9433e', wall: '#d9a26f' })}
    ${tree(385, base, 64, 130)}${tree(445, base, 48, 96, '#3d7a5c')}
    ${house(480, base, 130, 110, { roof: '#c9433e', wall: '#cf9563', sign: 'NOEL' })}
    ${tree(655, base, 74, 150)}${tree(730, base, 56, 110, '#3d7a5c')}
    <rect x="0" y="${base - 4}" width="800" height="40" fill="url(#vsnow)"/>
    <path d="M0 ${base - 2} Q120 ${base - 14} 260 ${base - 4} T560 ${base - 6} T800 ${base - 3} V${base + 6} H0Z" fill="#fbf8f2"/>
    ${ball(150, base - 2, 9, '#d6413e')}${ball(172, base + 2, 7, '#e3b964')}${ball(360, base, 10, '#e3b964')}${ball(383, base + 3, 7, '#d6413e')}
    ${ball(470, base + 1, 8, '#d6413e')}${ball(630, base, 10, '#e3b964')}${ball(650, base + 4, 7, '#2f6b4f')}${ball(700, base + 1, 9, '#d6413e')}
    <g transform="translate(40 ${base - 34})"><path d="M0 30 h34 l4 -10 h-6 v-10 h-8 v10 h-24Z" fill="#c9433e"/><circle cx="8" cy="32" r="4" fill="#6b4a32"/><circle cx="28" cy="32" r="4" fill="#6b4a32"/><rect x="12" y="2" width="10" height="10" rx="2" fill="#2f6b4f"/><path d="M12 7 h10 M17 2 v10" stroke="#e3b964" stroke-width="2"/></g>
  </svg>`);
}
