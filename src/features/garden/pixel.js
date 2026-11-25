// P52: bộ hình pixel tự vẽ cho khu vườn (ô 16×16). Mỗi hình là chuỗi ký tự → màu trong bảng PAL.
// Vẽ một lần ra canvas nhỏ rồi dùng lại (cache). Cây ăn trái vẽ theo công thức (vòm lá, buồng chuối…).
export const T = 16;
export const PAL = {
  k: '#2b1d14', K: '#4a3020', b: '#7a4a2a', B: '#a8703f', y: '#d9a441', Y: '#f2cf6b', g: '#3f8a3a', G: '#5fb047', l: '#9bd668', d: '#2b6330',
  r: '#d9443a', R: '#ff7a6b', o: '#e9822c', O: '#ffb04a', w: '#ffffff', W: '#f3ecd8', s: '#7d828c', S: '#b4bac4', n: '#5a3a22', N: '#7b5434',
  p: '#e47aa8', P: '#ffc2da', v: '#8a6be0', V: '#b9a3f5', u: '#4aa3df', U: '#8fd3f5', z: '#2a6fb0', c: '#c9a26b', C: '#e3c590', m: '#f7e36b',
  x: '#3a3a3a', h: '#f3cfa8', H: '#d9a07a', e: '#fff3a0', a: '#6e4a8a', f: '#c8dc4c', F: '#e6ef7a',
};

const cache = new Map();
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// Hình từ chuỗi: các dòng căn ĐÁY (đứng trên mặt đất), thiếu bên phải thì để trống.
const SIZE = { hen0: [8, 8], hen1: [8, 8], duck0: [10, 7], duck1: [10, 7] };
function fromRows(rows, w = 16, h = 16) {
  const c = canvas(w, h); const x = c.getContext('2d');
  const top = h - rows.length;
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.' || ch === ' ' || !PAL[ch] || i >= w) return;
    x.fillStyle = PAL[ch]; x.fillRect(i, top + j, 1, 1);
  }));
  return c;
}

const S = {
  // ---- cây trồng: hạt → mầm → cây non → chín ----
  seedling: ['......n...n.....', '.......n.n......', '................'],
  sprout: ['.......l........', '......lGl.l.....', '.......GlGl.....', '.......Gd.......', '.......g........', '................'],
  young: ['.......l........', '.....lGl.l......', '....lGGlGGl.....', '.....GgGgG......', '....lGgdgGl.....', '.....GgdgG......', '......gdg.......', '.......g........', '................'],
  youngFlower: ['......lGl.......', '.......g........', '....l..g..l.....', '....Gl.g.lG.....', '.....G.g.G......', '......Gg.G......', '.......gg.......', '.......g........', '................'],
  carrot: ['......g..g......', '.....gGg.Gg.....', '....gGlGgGlg....', '.....gGGGGg.....', '......gGGg......', '.......gg.......', '......oOOo......', '......oOOo......', '.......oo.......', '................'],
  cabbage: ['.....lGGGl......', '....lGllGGl.....', '...lGlGGlGGl....', '...GlGllGlGG....', '...dGGlllGGd....', '...dGlGGGlGd....', '....dGGGGGd.....', '.....ddddd......', '................'],
  sunflower: ['.....omOOmo.....', '....omkkkkmo....', '....mkKkKkkm....', '....OkkKkKkO....', '....omkkkkmo....', '.....omOOmo.....', '.......g........', '......lg........', '.....lGg.gl.....', '......Gg.Gl.....', '.......gG.......', '.......g........', '................'],
  tulip: ['....p.....r.....', '...pPp...rRr....', '...pPp...rRr....', '...ppp...rrr....', '....g..v..g.....', '....g.vVv.g.....', '...lg.vVv.gl....', '...Gg.vvv.gG....', '....g..g..g.....', '.....gGg.g......', '......gg........', '................'],
  strawberry: ['....lG...Gl.....', '...lGGl.lGGl....', '...GgGGlGgGG....', '....GgrrgGG.....', '...grRrrrg......', '...rRwrRr..gl...', '...rrRrrr.rRr...', '....rrrr..rwRr..', '.....rr...rrRr..', '...........rr...', '................'],
  rose: ['....rRRr........', '...rRrrRr.......', '...rrRRrr.......', '....rrrr...rRr..', '.....gg...rRrRr.', '.....g....rrRrr.', '....lgl....rrr..', '.....g......g...', '.....gl....lg...', '....lg.....gG...', '.....g...lgg....', '......gGgg......', '................'],
  pumpkin: ['.......dg.......', '......gdl.......', '.....g.k........', '...oOoOoOoo.....', '..oOOoOOoOOo....', '..oOOoOOoOOo....', '..ooOoOooOoo....', '..ooooooooooo...', '...ooooooooo....', '.....kkkkk......', '................'],
  tomato: ['.......g........', '......lGl.......', '.....lGgGl......', '....G.lGl.G.....', '...rRr.g.rRr....', '...rrr.g.rrr....', '....r.lgl.r.....', '.....lGgGl......', '....rRr.rRr.....', '....rrr.rrr.....', '.....r.g.r......', '.......g........', '................'],
  sapling: ['......l.l.......', '.....lGlGl......', '......GgG.......', '.......b........', '.......b........', '......nbn.......', '................'],

  // ---- đồ trang trí ----
  fence: ['................', '................', '................', '................', '..kk............', '.kBbk...........', 'kkBbkkkkkkkkkkkk', 'BBBbBBBBBBBBBBBB', 'kkBbkkkkkkkkkkkk', '.kBbk...........', 'kkBbkkkkkkkkkkkk', 'BBBbBBBBBBBBBBBB', 'kkBbkkkkkkkkkkkk', '.kBbk...........', '.kkkk...........', '................'],
  lantern: ['.......k........', '......kxk.......', '.....kxxxk......', '.....kmemk......', '.....kemek......', '.....kmemk......', '.....kkxkk......', '.......x........', '.......x........', '.......x........', '.......x........', '.......x........', '......xxx.......', '.....xxxxx......', '................'],
  scarecrow: ['......yYy.......', '.....yYYYy......', '....kyYYYyk.....', '.....khhhk......', '.....hkhkh......', '......hhh.......', '..BbbrRrRrbbB...', '.....rRrRr......', '.....rRrRr......', '......NbN.......', '......b.b.......', '.......b........', '.......b........', '......nbn.......', '................'],
  hay: ['....kkkkkkk.....', '...kyYyYyYyk....', '..kyYyyYyyYyk...', '..kYyyYyYyyYk...', '..kyYyYyYyYyk...', '..kyyYyyYyyyk...', '..kYyyYyyYyYk...', '...kyYyYyYyk....', '....kkkkkkk.....', '................'],
  barrow: ['..kkkkkkkkk.....', '..kBbBbBbBk.....', '..kbNlGrNbk..kk.', '...kbBbBbk..k...', '....kkkkk.kk....', '....k...k.......', '...kxk..........', '...xSx..........', '....x...........', '................'],
  beehive: ['....kkkkkkkk....', '...kbBBBBBBbk...', '...kkkkkkkkkk...', '....kYyYyYyk....', '....kyyyyyyk....', '....kkkkkkkk....', '....kYyYyYyk....', '....ky.kk.yk....', '....kkkkkkkk....', '.....b....b.....', '.....b....b.....', '................'],
  bench: ['...kkkkkkkkkk...', '...kBBBBBBBBk...', '...kbbbbbbbbk...', '...kkkkkkkkkk...', '..kBBBBBBBBBBk..', '..kbbbbbbbbbbk..', '..kkkkkkkkkkkk..', '...k........k...', '...k........k...', '................'],
  pot: ['.....p.P.p......', '....pPpPpPp.....', '.....pgPgp......', '......lGl.......', '.......g........', '.....kkkkk......', '....kNNNNNk.....', '....kBbBbBk.....', '.....kbBbk......', '.....kkkkk......', '................'],
  bush: ['.....dGGGd......', '....dGlGlGGd....', '...dGlGGGlGGd...', '...GlGGpGGlGG...', '..dGGGlGGGGGd...', '..dGGpGGGlGGd...', '..ddGGGGGGGdd...', '...ddddddddd....', '................'],
  rock: ['.....kkkk.......', '....kSSSsk......', '...kSSssssk.....', '...ksSsssxk.....', '....kkkkkk......', '................'],
  lily: ['................', '....gGGg........', '...gGlGGg..P....', '...gGGG.g.PwP...', '....gGgg...P....', '................'],
  sign: ['...kkkkkkkkk....', '...kWWWWWWWk....', '...kWnnnnnWk....', '...kWWWWWWWk....', '...kkkkbkkkk....', '.......b........', '.......b........', '......nbn.......', '................'],
  well: ['....kkkkkkkk....', '...kbBBBBBBbk...', '....k......k....', '....k..x...k....', '....k..x...k....', '...kssssssssk...', '..ksSsSSsSsSsk..', '..kszzzuzzzzsk..', '..ksSsSsSsSssk..', '..kssssssssssk..', '...kkkkkkkkkk...', '................'],
  flowers: ['..p....m....v...', '.pPp..mem..vVv..', '..p.g..m.g..v.g.', '.lg.Gl.g.Gl.g.G.', '..G..g..G..g.G..', '.dGgdGgdGgdGgdG.', '................'],
  tuft: ['...g...g..g.....', '..gl..gl.gl..g..', '..Gl.gGl.Gg.gl..', '..gG.gG..gG.Gg..', '.dgGdgGddgGdgGd.', '................'],
  mushroom: ['................', '.....rRRr.......', '....rRwRRr......', '....rrrrrr......', '......WW...rRr..', '......WW..rwRrr.', '.....dWWd..WW...', '..........dWWd..', '................'],
  // ---- con vật (đi lang thang) ----
  hen0: ['...rr...', '..wwwk..', '..wwwwO.', '.wwwww..', 'wwwWwww.', '.wwwwww.', '..wwww..', '...O.O..'],
  hen1: ['........', '...rr...', '..wwwk..', '..wwwwO.', 'wwwwww..', '.wwWwww.', '..wwww..', '..O..O..'],
  duck0: ['......ww..', '.....wwkO.', '.....www..', '.wwwwwww..', 'wwWwwwww..', '.wwwwwww..', '..UUUUU...'],
  duck1: ['......ww..', '.....wwkO.', '.....www..', '.wwwwwww..', 'wwWwwwww..', '.wwwwwww..', '.UUU.UUU..'],
  // ---- người làm vườn (2 bước chân) ----
  gal0: ['......kkkk......', '.....kYyyYk.....', '...kkYyYYyYkk...', '..kyYYYYYYYYyk..', '...kkhhhhhhkk...', '....khkhhkhk....', '....khhhhhhk....', '.....kkhhkk.....', '....kgGGGGgk....', '...kh.gGGg.hk...', '....kbNNNNbk....', '.....kNNNNk.....', '.....kN..Nk.....', '.....kk..kk.....'],
  gal1: ['......kkkk......', '.....kYyyYk.....', '...kkYyYYyYkk...', '..kyYYYYYYYYyk..', '...kkhhhhhhkk...', '....khkhhkhk....', '....khhhhhhk....', '.....kkhhkk.....', '....kgGGGGgk....', '...kh.gGGg.hk...', '....kbNNNNbk....', '.....kNNNNk.....', '.....kN.kN......', '.....kk..kk.....'],
};

export function sprite(name) {
  if (!cache.has(name)) cache.set(name, S[name] ? fromRows(S[name], ...(SIZE[name] ?? [16, 16])) : canvas(16, 16));
  return cache.get(name);
}

// Cây trồng theo giai đoạn.
const FLOWERS = new Set(['sunflower', 'tulip', 'rose']);
export function cropSprite(seed, stage) {
  if (stage <= 0) return sprite('seedling');
  if (stage === 1) return sprite('sprout');
  if (stage === 2) return sprite(FLOWERS.has(seed) ? 'youngFlower' : 'young');
  return sprite(S[seed] ? seed : 'young');
}

// ---- nền: cỏ / lối đi / nước (nhiễu cố định theo ô để không nhấp nháy) ----
const rnd = (x, y, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const GRASS = ['#72c055', '#5aa845', '#8fd46a', '#4f9a3e'];
const PATH = ['#d6b27a', '#c09a62', '#e6c995', '#b48c56'];

// Vẽ toàn bộ nền tĩnh ra canvas (gọi lại khi bố cục đổi).
export function drawGround(ground) {
  const rows = ground.length; const cols = ground[0].length;
  const c = canvas(cols * T, rows * T); const x = c.getContext('2d');
  const at = (i, j) => (j < 0 || j >= rows || i < 0 || i >= cols ? 'g' : ground[j][i]);
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const t = at(i, j); const ox = i * T; const oy = j * T;
      const pal = t === 'p' ? PATH : GRASS;
      for (let py = 0; py < T; py += 1) {
        for (let px = 0; px < T; px += 1) {
          const r = rnd(ox + px, oy + py);
          x.fillStyle = r < 0.08 ? pal[1] : r < 0.12 ? pal[2] : r < 0.13 ? pal[3] : pal[0];
          x.fillRect(ox + px, oy + py, 1, 1);
        }
      }
      if (t === 'g') {
        // khóm cỏ + hoa dại nhỏ
        for (let k = 0; k < 3; k += 1) {
          const gx = ox + 2 + Math.floor(rnd(i, j, k) * 12); const gy = oy + 3 + Math.floor(rnd(j, i, k + 5) * 11);
          x.fillStyle = GRASS[1]; x.fillRect(gx, gy, 1, 1); x.fillRect(gx + 2, gy, 1, 1); x.fillRect(gx + 1, gy - 1, 1, 2);
        }
        if (rnd(i, j, 9) < 0.18) {
          const fx = ox + 3 + Math.floor(rnd(i, j, 10) * 10); const fy = oy + 3 + Math.floor(rnd(i, j, 11) * 10);
          const col = ['#ffffff', '#f7e36b', '#ffc2da', '#b9a3f5'][Math.floor(rnd(i, j, 12) * 4)];
          x.fillStyle = col; x.fillRect(fx - 1, fy, 1, 1); x.fillRect(fx + 1, fy, 1, 1); x.fillRect(fx, fy - 1, 1, 1); x.fillRect(fx, fy + 1, 1, 1);
          x.fillStyle = '#f2b23a'; x.fillRect(fx, fy, 1, 1);
        }
      }
      if (t === 'p') {
        // mép lối đi lởm chởm cỏ
        x.fillStyle = GRASS[1];
        for (let k = 0; k < T; k += 1) {
          const d = rnd(ox + k, oy, 3) < 0.5 ? 1 : 2;
          if (at(i, j - 1) !== 'p') x.fillRect(ox + k, oy, 1, d);
          if (at(i, j + 1) !== 'p') x.fillRect(ox + k, oy + T - d, 1, d);
          if (at(i - 1, j) !== 'p') x.fillRect(ox, oy + k, d, 1);
          if (at(i + 1, j) !== 'p') x.fillRect(ox + T - d, oy + k, d, 1);
        }
        // sỏi nhỏ
        if (rnd(i, j, 4) < 0.5) { x.fillStyle = '#a7a39a'; x.fillRect(ox + 4 + Math.floor(rnd(i, j, 5) * 8), oy + 4 + Math.floor(rnd(i, j, 6) * 8), 2, 1); }
      }
      if (t === 'w') {
        x.fillStyle = '#3d93d6'; x.fillRect(ox, oy, T, T);
        x.fillStyle = '#4aa3df';
        for (let py = 0; py < T; py += 1) for (let px = 0; px < T; px += 1) if (rnd(ox + px, oy + py, 7) < 0.25) x.fillRect(ox + px, oy + py, 1, 1);
        // bờ: viền đất + đá
        const edge = (cond, fx, fy, w, h) => { if (!cond) return; x.fillStyle = '#9b7a4c'; x.fillRect(fx, fy, w, h); };
        edge(at(i, j - 1) !== 'w', ox, oy, T, 2); edge(at(i, j + 1) !== 'w', ox, oy + T - 2, T, 2);
        edge(at(i - 1, j) !== 'w', ox, oy, 2, T); edge(at(i + 1, j) !== 'w', ox + T - 2, oy, 2, T);
        x.fillStyle = '#c9c4b8';
        for (let k = 0; k < T; k += 4) {
          if (at(i, j - 1) !== 'w' && rnd(ox + k, oy, 8) < 0.5) x.fillRect(ox + k, oy, 2, 2);
          if (at(i, j + 1) !== 'w' && rnd(ox + k, oy, 9) < 0.5) x.fillRect(ox + k, oy + T - 2, 2, 2);
        }
      }
    }
  }
  return c;
}

// Ô đất đã cày.
export function drawSoil(x, ox, oy, { wet = false, dry = false } = {}) {
  const base = wet ? '#5e3f26' : dry ? '#a07a52' : '#7b5434';
  const dark = wet ? '#4a311d' : dry ? '#8a6643' : '#644228';
  const light = wet ? '#6d4a2e' : dry ? '#b38c62' : '#8f6340';
  x.fillStyle = '#4a3020'; x.fillRect(ox + 1, oy + 2, 14, 13);
  x.fillStyle = base; x.fillRect(ox + 2, oy + 3, 12, 11);
  for (const r of [5, 8, 11]) { x.fillStyle = dark; x.fillRect(ox + 3, oy + r, 10, 1); x.fillStyle = light; x.fillRect(ox + 3, oy + r + 1, 10, 1); }
}

// ---- cây ăn trái (32×40, vẽ theo công thức) ----
function circleUnion(cs, px, py) { return cs.some(([cx, cy, r]) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r); }
export function treeSprite(kind, stage, fruit) {
  const key = `tree:${kind}:${stage}:${fruit}`;
  if (cache.has(key)) return cache.get(key);
  const W = 32; const H = 44; const c = canvas(W, H); const x = c.getContext('2d');
  const put = (px, py, col) => { x.fillStyle = PAL[col] ?? col; x.fillRect(px, py, 1, 1); };
  const sc = stage >= 2 ? 1 : 0.68;
  if (stage === 0) { x.drawImage(sprite('sapling'), 8, H - 16); cache.set(key, c); return c; }
  if (kind === 'banana') {
    const cx = 16; const top = Math.round(H - 24 * sc);
    for (let py = top; py < H - 1; py += 1) {
      put(cx - 2, py, 'k'); put(cx - 1, py, (py % 4) ? 'G' : 'g'); put(cx, py, (py % 3) ? 'l' : 'G'); put(cx + 1, py, (py % 5) ? 'G' : 'd'); put(cx + 2, py, 'k');
    }
    put(cx - 3, H - 2, 'n'); put(cx + 3, H - 2, 'n'); put(cx - 3, H - 1, 'k'); put(cx + 3, H - 1, 'k');
    // lá chuối: bản to, cong rủ xuống; vẽ lá sau trước, lá trước sau
    const leaves = [[-15, 4, 1], [15, 4, 1], [-12, -9, 1], [12, -9, 1], [-3, -15, 1], [4, -14, 1], [-9, 8, 0], [9, 8, 0]];
    for (const [ex, ey, back] of leaves) {
      const len = Math.hypot(ex, ey) * sc;
      const ang = Math.atan2(ey, ex);
      for (let s2 = 0; s2 <= 1; s2 += 0.02) {
        const droop = s2 * s2 * 6 * sc;
        const lx = cx + Math.cos(ang) * len * s2; const ly = top + 1 + Math.sin(ang) * len * s2 + droop;
        const wid = Math.max(1, Math.round(3.6 * sc * Math.sin(Math.min(1, s2 * 1.15) * Math.PI)));
        const nx = -Math.sin(ang); const ny = Math.cos(ang);
        for (let k = -wid; k <= wid; k += 1) {
          const px = Math.round(lx + nx * k * 0.9); const py = Math.round(ly + ny * k * 0.9);
          const col = Math.abs(k) === wid ? 'd' : k === 0 ? 'l' : (back ? 'g' : (k > 0 ? 'G' : 'l'));
          if (Math.abs(k) === wid && (Math.floor(s2 * 40) % 5 === 0)) continue; // mép lá rách nhẹ
          put(px, py, col);
        }
      }
    }
    if (stage >= 2 && fruit > 0) {
      const bx = cx + 3; const by = top + 5;
      if (fruit < 0.45) { put(bx + 1, by + 2, 'a'); put(bx + 1, by + 3, 'a'); put(bx + 2, by + 3, 'v'); put(bx + 1, by + 4, 'v'); }
      else {
        const col = fruit >= 1 ? ['Y', 'm', 'y'] : ['f', 'F', 'g'];
        for (let r = 0; r < 7; r += 1) for (let k = 0; k < 5 - (r > 4 ? 2 : 0); k += 1) put(bx + k - (r > 4 ? -1 : 0), by + r, k === 0 || r === 6 ? col[2] : (r + k) % 2 ? col[0] : col[1]);
        put(bx + 2, by + 7, 'a'); put(bx + 2, by + 8, 'v');
      }
    }
  } else {
    const cs = [[16, 15, 11], [8, 21, 7.5], [24, 21, 7.5], [16, 22, 9]].map(([a, b, r]) => [16 + (a - 16) * sc, H - (H - b) * sc - (1 - sc) * 4, r * sc]);
    const ty0 = Math.round(H - 14 * sc);
    for (let py = ty0; py < H - 1; py += 1) { put(14, py, 'k'); put(15, py, 'B'); put(16, py, 'b'); put(17, py, 'k'); }
    put(13, H - 2, 'b'); put(18, H - 2, 'b'); put(12, H - 1, 'k'); put(19, H - 1, 'k');
    const leafD = kind === 'orange' ? '#2f7a3a' : 'd';
    for (let py = 0; py < H; py += 1) {
      for (let px = 0; px < W; px += 1) {
        if (!circleUnion(cs, px, py)) continue;
        const edge = !circleUnion(cs, px - 1, py) || !circleUnion(cs, px + 1, py) || !circleUnion(cs, px, py - 1) || !circleUnion(cs, px, py + 1);
        const [cx, cy, r] = cs[0];
        const t = ((px - cx) + (py - cy)) / r;
        let col = 'G';
        if (edge) col = leafD;
        else if (t > 0.55 && (px + py) % 2) col = 'g';
        else if (t > 0.9) col = 'g';
        else if (t < -0.6 && (px + py) % 2) col = 'l';
        else if (rnd(px, py, 21) < 0.06) col = 'l';
        put(px, py, col);
      }
    }
    if (stage >= 2 && fruit > 0) {
      const spots = [[10, 14], [20, 12], [15, 19], [7, 22], [25, 21], [19, 24], [12, 26], [23, 16]];
      for (const [fx, fy] of spots) {
        const sx = Math.round(16 + (fx - 16) * sc); const sy = Math.round(H - (H - fy) * sc - (1 - sc) * 4);
        if (fruit < 0.45) { put(sx, sy, 'w'); put(sx + 1, sy + 1, 'W'); continue; } // ra hoa
        const ripe = fruit >= 1;
        const a = ripe ? 'O' : 'F'; const b = ripe ? (kind === 'mango' ? 'r' : 'o') : 'f';
        if (kind === 'mango') { put(sx, sy - 1, 'k'); put(sx - 1, sy, 'd'); put(sx, sy, a); put(sx + 1, sy, a); put(sx - 1, sy + 1, 'd'); put(sx, sy + 1, b); put(sx + 1, sy + 1, a); put(sx, sy + 2, b); put(sx + 1, sy + 2, 'd'); }
        else { put(sx - 1, sy, 'd'); put(sx, sy, a); put(sx + 1, sy, b); put(sx, sy + 1, b); put(sx + 1, sy + 1, b); put(sx, sy + 2, 'd'); }
      }
    }
  }
  cache.set(key, c);
  return c;
}
