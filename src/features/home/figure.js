// P20: nhân vật toàn thân kiểu 3D (tóc dài gợn sóng, mắt to, khuyên tai, dáng đứng) mặc đồ trong tủ.
// Đọc đúng dữ liệu cũ của nhân vật (skin, hair, hairColor, wearing) — không đổi cấu trúc lưu trữ.
import { svgFrom } from './art.js';
import { clothOf } from './catalog.js';

let seq = 0;
const shade = (hex, f) => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
const grad = (id, c, dir = 'h') => `<linearGradient id="${id}" x1="0" y1="0" x2="${dir === 'h' ? 1 : 0}" y2="${dir === 'h' ? 0 : 1}"><stop offset="0" stop-color="${shade(c, 1.18)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, 0.78)}"/></linearGradient>`;

// Kiểu dáng theo món đồ.
const TOP_KIND = { 'tee-white': 'tee', 'blouse-silk': 'blouse', 'shirt-stripe': 'shirt', 'shirt-pink': 'shirt', 'knit-cream': 'knit', 'crop-pink': 'crop', 'polo-wine': 'polo' };
const STRIPED = new Set(['shirt-stripe', 'shirt-pink']);

const MOUTH = {
  joy: 'M90 98 q10 10 20 0 q-10 4 -20 0Z', happy: 'M91 97 q9 7 18 0', calm: 'M92 97 q8 5 16 -1',
  meh: 'M93 98 h14', sad: 'M92 100 q8 -5 16 0', tired: 'M94 99 q6 2 12 0',
};

export function figureMarkup(a, items = {}, expression = 'calm') {
  const u = `f${(seq++).toString(36)}`;
  const skin = a.skin ?? '#eec1a0';
  const hair = a.hairColor ?? '#5a3a29';
  const style = a.hair ?? 'long';
  const on = (slot) => (items[slot] ? clothOf(items[slot]) : null);
  const dress = on('dress');
  const top = dress ? null : on('top') ?? { id: 'base-tee', color: '#fbf7f0' };
  const bottom = dress ? null : on('bottom') ?? { id: 'jeans', color: '#6f93c4' };
  const shoes = on('shoes') ?? { id: 'sneakers', color: '#f7f5f0' };
  const outer = on('outer'), bag = on('bag'), acc = on('acc');
  const topKind = top ? TOP_KIND[top.id] ?? 'tee' : null;
  const longSleeve = ['shirt', 'blouse', 'knit'].includes(topKind);
  const legsBare = dress || ['skirt-pleat', 'shorts'].includes(bottom?.id);

  const defs = [
    `<radialGradient id="${u}sk" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="${shade(skin, 1.12)}"/><stop offset=".75" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, 0.85)}"/></radialGradient>`,
    grad(`${u}skl`, skin),
    `<linearGradient id="${u}hr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(hair, 1.35)}"/><stop offset=".5" stop-color="${hair}"/><stop offset="1" stop-color="${shade(hair, 0.65)}"/></linearGradient>`,
    `<radialGradient id="${u}eye" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="#a36a3a"/><stop offset=".6" stop-color="#6b3f1f"/><stop offset="1" stop-color="#2a170c"/></radialGradient>`,
    `<radialGradient id="${u}bl"><stop offset="0" stop-color="#f08c86" stop-opacity=".55"/><stop offset="1" stop-color="#f08c86" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${u}sh" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`,
  ];
  if (top) defs.push(grad(`${u}tp`, top.color));
  if (bottom) defs.push(grad(`${u}bt`, bottom.color));
  if (dress) defs.push(grad(`${u}dr`, dress.color));
  if (outer) defs.push(grad(`${u}ou`, outer.color));
  defs.push(grad(`${u}so`, shoes.color));
  if (top && STRIPED.has(top.id)) {
    const line = top.id === 'shirt-pink' ? '#d9629a' : '#7a9cc6';
    defs.push(`<pattern id="${u}st" width="5" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="10" fill="${top.id === 'shirt-pink' ? '#f6c6dc' : top.color}"/><rect width="1.6" height="10" fill="${line}" opacity=".75"/></pattern>`);
  }
  const topFill = top && STRIPED.has(top.id) ? `url(#${u}st)` : `url(#${u}tp)`;

  // ---- tóc sau ----
  const hairBack = {
    long: `<path d="M64 70 C58 34 82 18 100 18 C122 18 144 34 138 72 C140 98 150 118 146 146 C144 170 156 196 148 222 C140 240 128 236 124 222 L122 140 L78 140 L76 222 C72 238 58 240 52 222 C44 196 56 170 54 146 C50 118 60 98 64 70Z" fill="url(#${u}hr)"/>
      <path d="M56 150 q-8 20 2 40 q8 16 -2 30 M144 150 q8 20 -2 40 q-8 16 2 30" stroke="${shade(hair, 0.6)}" stroke-width="3" fill="none" opacity=".5"/>`,
    bob: `<path d="M62 74 C58 36 82 20 100 20 C122 20 144 36 138 74 C140 92 146 108 140 120 L60 120 C54 108 60 92 62 74Z" fill="url(#${u}hr)"/>`,
    bun: `<circle cx="100" cy="22" r="17" fill="url(#${u}hr)"/><path d="M64 74 C60 40 82 28 100 28 C120 28 142 40 136 74 L136 96 L64 96Z" fill="url(#${u}hr)"/>`,
    ponytail: `<path d="M64 74 C60 38 82 24 100 24 C122 24 142 38 136 74 L136 96 L64 96Z" fill="url(#${u}hr)"/><path d="M128 40 C162 50 158 110 150 160 C146 178 136 176 138 160 C142 120 146 80 124 56Z" fill="url(#${u}hr)"/>`,
    short: `<path d="M64 76 C58 38 82 22 100 22 C122 22 144 38 138 76 L136 90 L64 90Z" fill="url(#${u}hr)"/>`,
  }[style] ?? '';

  // ---- chân / quần ----
  let legs = '';
  const leg = (x1, x2, y0, y1, w0, w1) => `<path d="M${x1 - w0 / 2} ${y0} L${x2 - w1 / 2} ${y1} L${x2 + w1 / 2} ${y1} L${x1 + w0 / 2} ${y0}Z" fill="url(#${u}skl)"/>`;
  if (legsBare) legs += leg(88, 86, 230, 400, 22, 13) + leg(112, 114, 230, 400, 22, 13);
  else if (bottom?.id === 'leggings') legs += `<path d="M72 226 L76 402 L96 402 L100 262 L104 402 L124 402 L128 226Z" fill="url(#${u}bt)"/>`;
  else if (bottom) {
    const wide = bottom.id === 'jeans', bw = wide ? 1 : 0.7;
    const L = `M72 226 L${64 + (1 - bw) * 10} 404 L${98 - (1 - bw) * 4} 404 L100 262Z`, Rr = `M128 226 L${136 - (1 - bw) * 10} 404 L${102 + (1 - bw) * 4} 404 L100 262Z`;
    legs += `<path d="${L}" fill="url(#${u}bt)"/><path d="${Rr}" fill="url(#${u}bt)"/>`;
    legs += `<path d="M72 226 H128 L100 272Z" fill="url(#${u}bt)"/><path d="M72 226 H128 V236 H72Z" fill="${shade(bottom.color, 0.85)}"/>`;
    if (wide) {
      legs += `<path d="M100 236 V266" stroke="${shade(bottom.color, 0.6)}" stroke-width="1.2" fill="none"/><path d="M100 236 q-7 4 -7 18" stroke="${shade(bottom.color, 0.65)}" stroke-width="1.2" fill="none"/>
        <path d="M76 240 q8 8 16 2 M108 242 q8 6 16 -2" stroke="${shade(bottom.color, 0.7)}" stroke-width="1.2" fill="none"/>
        <path d="M82 300 L78 400 M118 300 L122 400" stroke="${shade(bottom.color, 1.25)}" stroke-width="4" opacity=".35"/>
        <path d="M64 400 H98 M102 400 H136" stroke="${shade(bottom.color, 0.7)}" stroke-width="2"/>
        <circle cx="100" cy="231" r="2" fill="#c9a24a"/>`;
    }
  }
  // váy / short phủ lên chân trần
  let lower = '';
  if (bottom?.id === 'skirt-pleat') lower = `<path d="M74 224 L126 224 L142 300 L58 300Z" fill="url(#${u}bt)"/>${[70, 82, 94, 106, 118, 130].map((x) => `<path d="M${100 + (x - 100) * 0.55} 230 L${x} 298" stroke="${shade(bottom.color, 0.75)}" stroke-width="1.4"/>`).join('')}`;
  if (bottom?.id === 'shorts') lower = `<path d="M72 224 H128 L132 272 L102 272 L100 252 L98 272 L68 272Z" fill="url(#${u}bt)"/>`;

  // ---- giày ----
  const shoeY = 402;
  const shoe = (cx, flip) => {
    if (shoes.id === 'heels') return `<path d="M${cx - 10} ${shoeY} q10 -4 20 2 l2 10 h-6 l-2 -6 h-12Z" fill="url(#${u}so)"/><rect x="${cx + (flip ? -12 : 8)}" y="${shoeY + 6}" width="3" height="10" fill="${shade(shoes.color, 0.6)}"/>`;
    if (shoes.id === 'boots') return `<path d="M${cx - 11} ${shoeY - 26} h22 v30 q0 8 -8 8 h-${flip ? 8 : 18} q-${flip ? 10 : 2} 0 -${flip ? 6 : 2} -8Z" fill="url(#${u}so)"/>`;
    if (shoes.id === 'sandals') return `<path d="M${cx - 14} ${shoeY + 12} h28" stroke="${shoes.color}" stroke-width="4" stroke-linecap="round"/><path d="M${cx - 6} ${shoeY + 12} l6 -10 l6 10" stroke="${shoes.color}" stroke-width="2.5" fill="none"/>`;
    // sneakers / flats
    const h = shoes.id === 'flats' ? 8 : 13;
    return `<path d="M${cx - 15} ${shoeY + 16} q-2 -${h} 10 -${h + 2} h12 q10 2 10 ${h + 2}Z" fill="url(#${u}so)"/>
      <path d="M${cx - 16} ${shoeY + 16} h34" stroke="${shade(shoes.color, 0.8)}" stroke-width="3" stroke-linecap="round"/>
      ${shoes.id === 'sneakers' ? `<path d="M${cx - 4} ${shoeY + 4} l4 4 l4 -4 M${cx - 2} ${shoeY + 1} l4 4" stroke="#c9c4ba" stroke-width="1.2" fill="none"/>` : ''}`;
  };

  // ---- thân & tay ----
  const armSkin = (side) => {
    const s = side === 'l' ? -1 : 1;
    return `<path d="M${100 + s * 33} 140 C${100 + s * 44} 168 ${100 + s * 46} 186 ${100 + s * 42} 204 C${100 + s * 40} 216 ${100 + s * 38} 226 ${100 + s * 36} 234" stroke="url(#${u}skl)" stroke-width="11" fill="none" stroke-linecap="round"/>
      <ellipse cx="${100 + s * 35}" cy="${238}" rx="6.5" ry="8" fill="${skin}"/>`;
  };
  let torso = `<path d="M70 136 C70 128 84 124 100 124 C116 124 130 128 130 136 L128 230 L72 230Z" fill="url(#${u}skl)"/>`;
  let sleeves = '';
  if (dress) {
    torso += `<path d="M74 134 C86 128 114 128 126 134 L124 210 L150 330 L50 330 L76 210Z" fill="url(#${u}dr)"/>
      <path d="M78 210 H122" stroke="${shade(dress.color, 0.75)}" stroke-width="3"/>
      ${dress.id === 'dress-floral' ? Array.from({ length: 14 }, (_, i) => `<circle cx="${62 + (i * 37) % 76}" cy="${150 + (i * 53) % 170}" r="2.5" fill="#fff" opacity=".8"/>`).join('') : ''}`;
  } else if (top) {
    const hem = topKind === 'crop' ? 200 : topKind === 'shirt' ? 248 : 232;
    torso += `<path d="M66 136 C70 126 86 122 100 122 C114 122 130 126 134 136 L${topKind === 'shirt' ? 136 : 130} ${hem} L${topKind === 'shirt' ? 64 : 70} ${hem}Z" fill="${topFill}"/>
      <path d="M66 136 C70 126 86 122 100 122 C114 122 130 126 134 136 L${topKind === 'shirt' ? 136 : 130} ${hem} L${topKind === 'shirt' ? 64 : 70} ${hem}Z" fill="url(#${u}sh)" opacity=".5"/>`;
    if (topKind === 'shirt') torso += `<path d="M100 124 L100 248" stroke="${shade('#ffffff', 0.85)}" stroke-width="1.4"/>${[150, 175, 200, 225].map((y) => `<circle cx="102" cy="${y}" r="1.8" fill="#fff"/>`).join('')}
      <path d="M86 122 L100 146 L90 150 Z M114 122 L100 146 L110 150Z" fill="${topFill}" stroke="${shade(top.color, 0.7)}" stroke-width="1"/>
      <path d="M92 126 L100 146 L108 126Z" fill="url(#${u}skl)"/>`;
    if (topKind === 'polo') torso += `<path d="M88 122 L100 136 L94 140Z M112 122 L100 136 L106 140Z" fill="${shade(top.color, 0.85)}"/><path d="M100 132 V160" stroke="#d4af37" stroke-width="2"/><rect x="98" y="158" width="4" height="7" rx="1.5" fill="#d4af37"/>
      ${Array.from({ length: 10 }, (_, i) => `<path d="M${72 + i * 6} 140 V230" stroke="${shade(top.color, 0.8)}" stroke-width="1" opacity=".6"/>`).join('')}`;
    if (topKind === 'knit') torso += `<path d="M84 122 q16 -10 32 0 v8 q-16 -8 -32 0Z" fill="${shade(top.color, 0.9)}"/>${Array.from({ length: 11 }, (_, i) => `<path d="M${70 + i * 6} 140 V230" stroke="${shade(top.color, 0.82)}" stroke-width="1.6" opacity=".6"/>`).join('')}`;
    if (topKind === 'tee' || topKind === 'crop') torso += `<path d="M88 124 q12 10 24 0" stroke="${shade(top.color, 0.8)}" stroke-width="2" fill="none"/>`;
    if (topKind === 'blouse') torso += `<path d="M86 124 q14 14 28 0" stroke="${shade(top.color, 0.75)}" stroke-width="2" fill="none"/><path d="M92 128 q8 8 16 0" fill="url(#${u}skl)"/>`;
    if (topKind === 'crop') torso += `<path d="M74 200 H126 L128 230 H72Z" fill="url(#${u}skl)"/>`;
    // ống tay
    sleeves = ['l', 'r'].map((side) => {
      const s = side === 'l' ? -1 : 1;
      if (longSleeve) return `<path d="M${100 + s * 32} 136 C${100 + s * 46} 166 ${100 + s * 47} 196 ${100 + s * 45} ${topKind === 'shirt' ? 214 : 228}" stroke="${topFill}" stroke-width="18" fill="none" stroke-linecap="round"/>
        ${topKind === 'shirt' ? `<path d="M${100 + s * 38} 210 q${s * 7} 4 ${s * 14} 0" stroke="${shade(top.color, 0.75)}" stroke-width="5" stroke-linecap="round"/>` : ''}`;
      return `<path d="M${100 + s * 32} 134 C${100 + s * 42} 140 ${100 + s * 46} 154 ${100 + s * 46} 166 L${100 + s * 34} 168Z" fill="${topFill}"/>`;
    }).join('');
  }
  const outerLayer = outer ? `<path d="M64 136 C70 126 82 122 92 124 L96 250 L60 252Z" fill="url(#${u}ou)"/><path d="M136 136 C130 126 118 122 108 124 L104 250 L140 252Z" fill="url(#${u}ou)"/>
    <path d="M92 124 L84 160 L96 170 M108 124 L116 160 L104 170" stroke="${shade(outer.color, 0.7)}" stroke-width="2" fill="none"/>
    ${['l', 'r'].map((side) => { const s = side === 'l' ? -1 : 1; return `<path d="M${100 + s * 33} 136 C${100 + s * 47} 166 ${100 + s * 48} 196 ${100 + s * 46} 226" stroke="url(#${u}ou)" stroke-width="20" fill="none" stroke-linecap="round"/>`; }).join('')}` : '';

  // ---- đầu ----
  const head = `<path d="M93 100 L93 122 Q100 128 107 122 L107 100Z" fill="${shade(skin, 0.88)}"/>
    <ellipse cx="100" cy="74" rx="33" ry="36" fill="url(#${u}sk)"/>
    <ellipse cx="67" cy="80" rx="5" ry="7" fill="${shade(skin, 0.92)}"/><ellipse cx="133" cy="80" rx="5" ry="7" fill="${shade(skin, 0.92)}"/>
    <circle cx="67" cy="91" r="3.6" fill="none" stroke="#e8b84a" stroke-width="1.8"/><circle cx="133" cy="91" r="3.6" fill="none" stroke="#e8b84a" stroke-width="1.8"/>
    <ellipse cx="78" cy="90" rx="10" ry="6" fill="url(#${u}bl)"/><ellipse cx="122" cy="90" rx="10" ry="6" fill="url(#${u}bl)"/>
    ${expression === 'tired' || expression === 'joy' ? `<path d="M78 76 q8 -7 16 0 M106 76 q8 -7 16 0" stroke="#1a0e07" stroke-width="3" fill="none" stroke-linecap="round"/>` : `
    <ellipse cx="86" cy="74" rx="10" ry="11" fill="#fff"/><ellipse cx="114" cy="74" rx="10" ry="11" fill="#fff"/>
    <circle cx="87" cy="75" r="7.6" fill="url(#${u}eye)"/><circle cx="113" cy="75" r="7.6" fill="url(#${u}eye)"/>
    <circle cx="87" cy="75" r="3.4" fill="#1a0e07"/><circle cx="113" cy="75" r="3.4" fill="#1a0e07"/>
    <circle cx="89.5" cy="71.5" r="2.5" fill="#fff"/><circle cx="115.5" cy="71.5" r="2.5" fill="#fff"/>
    <path d="M75 70 q11 -11 22 -3 M103 67 q11 -8 22 3" stroke="#1a0e07" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M75 70 l-3 -2 M125 70 l3 -2" stroke="#1a0e07" stroke-width="1.6" stroke-linecap="round"/>`}
    <path d="M77 60 q9 -5 18 -2 M105 58 q9 -3 18 2" stroke="${shade(hair, 0.8)}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M99 82 q-2 6 2 7" stroke="${shade(skin, 0.75)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="${MOUTH[expression] ?? MOUTH.calm}" stroke="#b5554a" stroke-width="2.4" fill="${expression === 'joy' ? '#e8857a' : 'none'}" stroke-linecap="round"/>`;
  const hairFront = style === 'short'
    ? `<path d="M66 72 C62 40 84 30 100 30 C122 30 140 42 134 72 C126 56 112 50 100 52 C88 50 74 58 66 72Z" fill="url(#${u}hr)"/>`
    : `<path d="M66 78 C60 46 80 30 100 30 C124 30 142 46 134 78 C130 62 124 52 114 46 C106 54 94 56 86 52 C78 58 70 66 66 78Z" fill="url(#${u}hr)"/>
       <path d="M98 32 C92 38 88 46 86 52" stroke="${shade(hair, 1.4)}" stroke-width="2.2" fill="none" opacity=".7" stroke-linecap="round"/>
       ${style === 'long' ? `<path d="M68 66 C56 92 72 110 60 132 C50 152 68 166 58 188 C54 200 62 210 70 204 C66 196 74 186 78 172 C84 152 70 140 78 120 C84 104 74 90 76 74Z" fill="url(#${u}hr)"/>
       <path d="M132 66 C144 92 128 110 140 132 C150 152 132 166 142 188 C146 200 138 210 130 204 C134 196 126 186 122 172 C116 152 130 140 122 120 C116 104 126 90 124 74Z" fill="url(#${u}hr)"/>
       <path d="M64 96 q6 14 -2 30 q-6 14 2 30 M136 96 q-6 14 2 30 q6 14 -2 30" stroke="${shade(hair, 1.5)}" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>` : ''}
       ${style === 'bob' ? `<path d="M66 78 C62 96 64 108 66 118 M134 78 C138 96 136 108 134 118" stroke="url(#${u}hr)" stroke-width="10" fill="none" stroke-linecap="round"/>` : ''}`;

  // ---- phụ kiện ----
  let accs = '';
  if (acc?.id === 'straw-hat') accs = `<ellipse cx="100" cy="42" rx="52" ry="12" fill="${acc.color}"/><path d="M74 42 C74 18 126 18 126 42Z" fill="${shade(acc.color, 0.92)}"/><path d="M75 38 H125" stroke="#b5524f" stroke-width="4"/>`;
  if (acc?.id === 'cap') accs = `<path d="M66 50 C66 22 134 22 134 50Z" fill="${acc.color}"/><path d="M100 48 q30 -2 46 8 q-24 4 -46 0Z" fill="${shade(acc.color, 0.8)}"/>`;
  if (acc?.id === 'sunglasses') accs = `<rect x="74" y="66" width="22" height="14" rx="6" fill="#222" opacity=".9"/><rect x="104" y="66" width="22" height="14" rx="6" fill="#222" opacity=".9"/><path d="M96 72 h8" stroke="#222" stroke-width="2"/>`;
  if (acc?.id === 'scarf') accs = `<path d="M80 118 q20 12 40 0 l2 12 q-22 14 -44 0Z" fill="${acc.color}"/><path d="M110 128 l6 40 l-10 2 l-4 -38Z" fill="${shade(acc.color, 0.85)}"/>`;
  if (acc?.id === 'pearl') accs = Array.from({ length: 11 }, (_, i) => `<circle cx="${86 + i * 2.8}" cy="${128 + Math.sin((i / 10) * Math.PI) * 8}" r="2.2" fill="#fbf7ee" stroke="#d9d2c0" stroke-width=".5"/>`).join('');
  if (acc?.id === 'ring') accs = `<circle cx="144" cy="242" r="2.4" fill="none" stroke="#d9d9d9" stroke-width="1.6"/>`;
  const bagEl = bag ? (bag.id === 'backpack'
    ? `<path d="M130 136 q10 30 8 70" stroke="${shade(bag.color, 0.7)}" stroke-width="4" fill="none"/>`
    : `<path d="M${bag.id === 'clutch' ? 136 : 128} ${bag.id === 'clutch' ? 232 : 150} ${bag.id === 'clutch' ? '' : 'q10 40 22 70'}" stroke="${shade(bag.color, 0.7)}" stroke-width="2.5" fill="none"/>
       <rect x="${bag.id === 'clutch' ? 136 : 140}" y="${bag.id === 'clutch' ? 230 : 214}" width="${bag.id === 'clutch' ? 26 : 30}" height="${bag.id === 'clutch' ? 14 : 34}" rx="4" fill="${bag.color}" stroke="${shade(bag.color, 0.75)}"/>`) : '';

  return `<svg class="figure-svg" data-hair="${style}" data-expr="${expression}" viewBox="0 0 200 430" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Nhân vật của bạn">
    <defs>${defs.join('')}</defs>
    <ellipse cx="100" cy="420" rx="58" ry="8" fill="url(#${u}sh)"/>
    ${hairBack}
    ${legs}${lower}
    ${shoe(81, false)}${shoe(119, true)}
    ${dress || top ? '' : ''}${armSkin('l')}${armSkin('r')}
    ${torso}${sleeves}${outerLayer}${bagEl}
    <g transform="translate(100 118) scale(1.16) translate(-100 -118)">${head}${hairFront}${accs}</g>
  </svg>`;
}

export const figureSvg = (a, items, expression) => svgFrom(figureMarkup(a, items, expression));
