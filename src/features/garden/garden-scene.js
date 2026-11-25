// P52: cảnh vườn pixel sống động trên <canvas>: nền, ô đất, cây, đồ trang trí, người làm vườn đi dạo,
// bướm, ong quanh tổ, nước lấp lánh, cá quẫy, ánh đèn & đom đóm về đêm. Vẽ ở độ phân giải gốc rồi phóng to sắc nét.
import { T, sprite, cropSprite, treeSprite, drawGround, drawSoil } from './pixel.js';
import { COLS, ROWS, occupant } from './layout.js';

const W = COLS * T; const H = ROWS * T;
const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let scene = null; // một cảnh dùng lại giữa các lần vẽ lại màn hình

export function gardenCanvas(model, handlers) {
  if (!scene) scene = createScene();
  scene.set(model, handlers);
  return scene.el;
}

function createScene() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H; cv.className = 'px-garden';
  cv.setAttribute('role', 'img');
  const x = cv.getContext('2d');
  let model = null; let handlers = {}; let groundKey = ''; let groundImg = null;
  let raf = 0; let last = 0; let hover = null;
  const gal = { x: 7 * T + 8, y: 6 * T + 12, tx: null, ty: null, wait: 2, frame: 0, flip: false };
  const flies = Array.from({ length: 4 }, (_, i) => ({ x: 40 + i * 50, y: 90 + (i % 2) * 40, a: i * 1.7, c: [['#ffc2da', '#e47aa8'], ['#fff3a0', '#f2b23a'], ['#bfe8ff', '#7cc8f0'], ['#ffffff', '#d9d3c0']][i] }));
  const ripples = [];
  const pets = new Map(); // gà / vịt: id → vị trí đang đi
  const clouds = [{ x: 30, y: 40, r: 34 }, { x: 170, y: 120, r: 42 }];
  const bugs = Array.from({ length: 14 }, (_, i) => ({ x: (i * 53) % W, y: 40 + ((i * 37) % (H - 50)), p: i }));

  const tile = (e) => {
    const r = cv.getBoundingClientRect();
    return [Math.floor(((e.clientX - r.left) / r.width) * COLS), Math.floor(((e.clientY - r.top) / r.height) * ROWS)];
  };
  cv.addEventListener('click', (e) => { const [tx, ty] = tile(e); handlers.onTap?.(tx, ty); });
  cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { hover = tile(e); cv.style.cursor = model && (occupant(model.map, ...hover) || model.mode !== 'view') ? 'pointer' : 'default'; } });
  cv.addEventListener('pointerleave', () => { hover = null; });

  const walkable = () => {
    const out = [];
    model.map.ground.forEach((row, y) => [...row].forEach((t, xx) => { if (t === 'p' && !occupant(model.map, xx, y)) out.push([xx, y]); }));
    return out;
  };

  function step(dt, now) {
    // người làm vườn: đi tới một ô lối đi ngẫu nhiên, đứng nghỉ, đi tiếp
    if (gal.tx == null) {
      gal.wait -= dt;
      if (gal.wait <= 0) {
        const w = walkable();
        if (w.length) { const [tx, ty] = w[Math.floor(Math.random() * w.length)]; gal.tx = tx * T + 8; gal.ty = ty * T + 12; }
        gal.wait = 2 + Math.random() * 4;
      }
    } else {
      const dx = gal.tx - gal.x; const dy = gal.ty - gal.y; const d = Math.hypot(dx, dy);
      if (d < 1) { gal.tx = null; } else {
        const sp = 14 * dt;
        // đi theo trục (ngang trước rồi dọc) cho giống game cổ điển
        if (Math.abs(dx) > 0.5) { gal.x += Math.sign(dx) * Math.min(sp, Math.abs(dx)); gal.flip = dx < 0; } else gal.y += Math.sign(dy) * Math.min(sp, Math.abs(dy));
        gal.frame = Math.floor(now / 220) % 2;
      }
    }
    for (const f of flies) {
      f.a += dt * (0.6 + Math.sin(f.a * 0.3) * 0.3);
      f.x += Math.cos(f.a) * 10 * dt + Math.sin(now / 900 + f.a) * 4 * dt;
      f.y += Math.sin(f.a * 1.3) * 8 * dt;
      if (f.x < 4) f.x = W - 6; if (f.x > W - 4) f.x = 6; if (f.y < 18) f.y = 20; if (f.y > H - 8) f.y = H - 10;
    }
    if (Math.random() < dt * 0.35) {
      const water = [];
      model.map.ground.forEach((row, y) => [...row].forEach((t, xx) => { if (t === 'w') water.push([xx, y]); }));
      if (water.length) { const [wx, wy] = water[Math.floor(Math.random() * water.length)]; ripples.push({ x: wx * T + 4 + Math.random() * 8, y: wy * T + 5 + Math.random() * 6, r: 0 }); }
    }
    // gà đi quanh chỗ của nó trên cỏ/lối đi, vịt bơi quanh trong ao
    for (const it of model.map.items) {
      if (it.type !== 'hen' && it.type !== 'duck') continue;
      let a = pets.get(it.id);
      if (!a || a.hx !== it.x || a.hy !== it.y) { a = { hx: it.x, hy: it.y, x: it.x * T + 8, y: it.y * T + 10, tx: null, wait: Math.random() * 3, flip: false, peck: 0 }; pets.set(it.id, a); }
      if (model.mode !== 'view') { a.x = it.x * T + 8; a.y = it.y * T + 10; a.tx = null; continue; }
      if (a.tx == null) {
        a.wait -= dt;
        if (a.wait <= 0) {
          const want = it.type === 'duck' ? 'w' : null;
          for (let k = 0; k < 8; k += 1) {
            const gx = it.x + Math.round((Math.random() - 0.5) * 4); const gy = it.y + Math.round((Math.random() - 0.5) * 4);
            const t = model.map.ground[gy]?.[gx];
            if (!t || (want ? t !== 'w' : t === 'w')) continue;
            a.tx = gx * T + 3 + Math.random() * 10; a.ty = gy * T + 6 + Math.random() * 7; break;
          }
          a.wait = 1.5 + Math.random() * 3; a.peck = it.type === 'hen' && Math.random() < 0.5 ? 1.2 : 0;
        }
      } else {
        const dx = a.tx - a.x; const dy = a.ty - a.y; const d = Math.hypot(dx, dy);
        if (d < 0.6) a.tx = null; else { const sp = (it.type === 'duck' ? 6 : 9) * dt; a.x += (dx / d) * Math.min(sp, d); a.y += (dy / d) * Math.min(sp, d); if (Math.abs(dx) > 0.3) a.flip = dx < 0; }
      }
      if (a.peck > 0) a.peck -= dt;
    }
    for (const c of clouds) { c.x += dt * 3; if (c.x - c.r > W) c.x = -c.r; }
    for (const r of ripples) r.r += dt * 4;
    while (ripples.length && ripples[0].r > 5) ripples.shift();
  }

  function draw(now) {
    const { map, plots, trees, light, mode, sel, wet } = model;
    const key = map.ground.join('|');
    if (key !== groundKey) { groundImg = drawGround(map.ground); groundKey = key; }
    x.imageSmoothingEnabled = false;
    x.drawImage(groundImg, 0, 0);
    // nước lấp lánh
    const tt = now / 1000;
    x.fillStyle = 'rgba(200,240,255,.75)';
    map.ground.forEach((row, j) => [...row].forEach((t, i) => {
      if (t !== 'w') return;
      for (let k = 0; k < 2; k += 1) {
        const sx = i * T + ((Math.floor(tt * 3) + k * 7 + i * 5 + j * 3) % 12) + 2; const sy = j * T + 4 + k * 6 + ((i + j) % 3);
        x.fillRect(sx, sy, 3, 1);
      }
    }));
    x.strokeStyle = 'rgba(230,248,255,.8)'; x.lineWidth = 1;
    for (const r of ripples) { x.globalAlpha = 1 - r.r / 5; x.beginPath(); x.ellipse(r.x, r.y, r.r + 0.5, (r.r + 0.5) * 0.5, 0, 0, Math.PI * 2); x.stroke(); }
    x.globalAlpha = 1;

    // gom mọi vật để vẽ theo chiều sâu (y)
    const objs = [];
    map.plotPos.forEach(([px, py], i) => {
      if (i >= plots.length) return;
      const p = plots[i];
      objs.push({ y: py * T + 15, draw: () => {
        drawSoil(x, px * T, py * T, { wet, dry: p?.thirsty });
        if (p) {
          const sway = p.stage >= 2 && Math.floor(tt * 1.5 + px) % 2 ? 1 : 0;
          x.drawImage(cropSprite(p.seed.id, p.stage), px * T + sway * 0, py * T - (p.stage >= 3 ? 3 : 1) + (sway && p.stage >= 3 ? 0 : 0));
          if (p.ripe) sparkle(px * T + 12, py * T + 1, tt + i);
          else if (p.stage < 3) bar(px * T + 3, py * T + 14, 10, p.ratio);
        }
      } });
    });
    for (const it of map.items) {
      if (it.type === 'spot') {
        const t = trees[it.id];
        objs.push({ y: it.y * T + 31, draw: () => {
          const ox = it.x * T; const oy = it.y * T;
          x.fillStyle = 'rgba(90,58,34,.55)'; x.beginPath(); x.ellipse(ox + 16, oy + 27, 9, 3.5, 0, 0, Math.PI * 2); x.fill();
          if (!t) { x.fillStyle = '#7b5434'; x.fillRect(ox + 12, oy + 24, 9, 4); x.drawImage(sprite('sign'), ox + 16, oy + 12); return; }
          const img = treeSprite(t.seed.id, t.stage, t.stage === 2 ? (t.ripe ? 1 : t.fruit > 0.66 ? 0.7 : t.fruit > 0.33 ? 0.3 : 0) : 0);
          x.drawImage(img, ox, oy + 30 - img.height + 1);
          if (t.ripe) { sparkle(ox + 8, oy - 4, tt); sparkle(ox + 24, oy + 2, tt + 1.3); }
          else if (t.stage < 2) bar(ox + 8, oy + 29, 16, t.ratio);
        } });
      } else if (it.type === 'hen' || it.type === 'duck') {
        const a = pets.get(it.id) ?? { x: it.x * T + 8, y: it.y * T + 10, flip: false };
        objs.push({ y: a.y, draw: () => {
          const moving = a.tx != null;
          const img = sprite(it.type === 'duck' ? (Math.floor(tt * 2) % 2 ? 'duck1' : 'duck0') : (moving ? (Math.floor(tt * 5) % 2 ? 'hen1' : 'hen0') : a.peck > 0 && Math.floor(tt * 6) % 2 ? 'hen1' : 'hen0'));
          const px = Math.round(a.x - img.width / 2); const py = Math.round(a.y - img.height + (it.type === 'duck' ? 2 + Math.round(Math.sin(tt * 2 + it.x)) * 0 : 0));
          if (it.type === 'hen') { x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(px + 1, Math.round(a.y), 6, 1); }
          if (a.flip) { x.save(); x.scale(-1, 1); x.drawImage(img, -px - img.width, py); x.restore(); } else x.drawImage(img, px, py);
        } });
      } else if (it.type === 'lily') {
        objs.push({ y: it.y * T, draw: () => x.drawImage(sprite('lily'), it.x * T, it.y * T + Math.round(Math.sin(tt + it.x) * 0.6)) });
      } else {
        objs.push({ y: it.y * T + 14, draw: () => x.drawImage(sprite(it.type), it.x * T, it.y * T) });
      }
    }
    objs.push({ y: gal.y + 2, draw: () => {
      const img = sprite(gal.tx == null ? 'gal0' : gal.frame ? 'gal1' : 'gal0');
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(Math.round(gal.x) - 5, Math.round(gal.y) + 1, 10, 2);
      if (gal.flip) { x.save(); x.scale(-1, 1); x.drawImage(img, -Math.round(gal.x) - 8, Math.round(gal.y) - 14); x.restore(); } else x.drawImage(img, Math.round(gal.x) - 8, Math.round(gal.y) - 14);
    } });
    objs.sort((a, b) => a.y - b.y).forEach((o) => o.draw());

    // ong quanh tổ
    for (const it of map.items) {
      if (it.type !== 'beehive') continue;
      for (let k = 0; k < 3; k += 1) {
        const a = tt * (1.6 + k * 0.4) + k * 2;
        const bx = it.x * T + 8 + Math.cos(a) * (8 + k * 3); const by = it.y * T + 4 + Math.sin(a * 1.4) * (4 + k);
        x.fillStyle = '#f7c83a'; x.fillRect(Math.round(bx), Math.round(by), 2, 1); x.fillStyle = '#2b1d14'; x.fillRect(Math.round(bx) + 1, Math.round(by), 1, 1);
      }
    }
    // bướm
    if (light.id !== 'night') {
      for (const f of flies) {
        const up = Math.floor(tt * 8 + f.a) % 2;
        const fx = Math.round(f.x); const fy = Math.round(f.y);
        x.fillStyle = f.c[0]; x.fillRect(fx - 2, fy - (up ? 1 : 0), 2, up ? 2 : 1); x.fillRect(fx + 1, fy - (up ? 1 : 0), 2, up ? 2 : 1);
        x.fillStyle = f.c[1]; x.fillRect(fx - 2, fy + 1, 1, 1); x.fillRect(fx + 2, fy + 1, 1, 1);
        x.fillStyle = '#2b1d14'; x.fillRect(fx, fy - 1, 1, 3);
      }
    }

    // bóng mây trôi (ban ngày)
    if (light.id === 'day' || light.id === 'morning') {
      x.fillStyle = 'rgba(20,40,30,.07)';
      for (const c of clouds) { x.beginPath(); x.ellipse(c.x, c.y, c.r, c.r * 0.45, 0, 0, Math.PI * 2); x.ellipse(c.x + c.r * 0.5, c.y - 6, c.r * 0.6, c.r * 0.35, 0, 0, Math.PI * 2); x.fill(); }
    }
    // ánh sáng theo giờ
    const tint = { morning: 'rgba(255,190,140,.12)', evening: 'rgba(255,130,70,.2)', night: 'rgba(16,26,78,.5)' }[light.id];
    if (tint) { x.fillStyle = tint; x.fillRect(0, 0, W, H); }
    if (light.id === 'night' || light.id === 'evening') {
      x.save(); x.globalCompositeOperation = 'lighter';
      for (const it of map.items) {
        if (it.type !== 'lantern') continue;
        const cx = it.x * T + 8; const cy = it.y * T + 6; const fl = 1 + Math.sin(tt * 6 + it.x) * 0.04;
        const gr = x.createRadialGradient(cx, cy, 1, cx, cy, 26 * fl);
        gr.addColorStop(0, light.id === 'night' ? 'rgba(255,200,90,.55)' : 'rgba(255,200,90,.25)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
        x.fillStyle = gr; x.fillRect(cx - 30, cy - 30, 60, 60);
      }
      x.restore();
      if (light.id === 'night') {
        for (const b of bugs) {
          const on = (Math.sin(tt * 2 + b.p * 1.7) + 1) / 2;
          if (on < 0.35) continue;
          const bx = Math.round(b.x + Math.sin(tt * 0.5 + b.p) * 10); const by = Math.round(b.y + Math.cos(tt * 0.4 + b.p) * 6);
          x.fillStyle = `rgba(255,245,150,${on})`; x.fillRect(bx, by, 1, 1);
          x.fillStyle = `rgba(255,245,150,${on * 0.3})`; x.fillRect(bx - 1, by, 3, 1); x.fillRect(bx, by - 1, 1, 3);
        }
      }
    }

    // chế độ bày vườn: lưới + ô đang chọn
    if (mode !== 'view') {
      x.fillStyle = 'rgba(255,255,255,.14)';
      for (let i = 1; i < COLS; i += 1) x.fillRect(i * T, 0, 1, H);
      for (let j = 1; j < ROWS; j += 1) x.fillRect(0, j * T, W, 1);
      if (sel) {
        const [sx, sy, sw] = sel.kind === 'plot' ? [...map.plotPos[sel.index], 1] : sel.item ? [sel.item.x, sel.item.y, sel.item.type === 'spot' ? 2 : 1] : [0, 0, 0];
        if (sw) { x.strokeStyle = Math.floor(tt * 4) % 2 ? '#fff3a0' : '#ffffff'; x.lineWidth = 1; x.strokeRect(sx * T + 0.5, sy * T + 0.5, sw * T - 1, sw * T - 1); }
      }
    }
    if (hover) {
      const [hx, hy] = hover; const o = occupant(map, hx, hy);
      if (o?.kind === 'spot') { x.strokeStyle = 'rgba(255,255,255,.7)'; x.strokeRect(o.item.x * T + 0.5, o.item.y * T + 0.5, 2 * T - 1, 2 * T - 1); }
      else if (o || mode !== 'view') { x.strokeStyle = 'rgba(255,255,255,.7)'; x.strokeRect(hx * T + 0.5, hy * T + 0.5, T - 1, T - 1); }
    }
  }
  function sparkle(sx, sy, t) {
    const ph = Math.floor(t * 3) % 4;
    if (ph === 3) return;
    x.fillStyle = '#fffbe0';
    x.fillRect(sx, sy, 1, 1);
    if (ph >= 1) { x.fillRect(sx - 1, sy, 3, 1); x.fillRect(sx, sy - 1, 1, 3); }
    if (ph === 2) { x.fillStyle = 'rgba(255,251,224,.6)'; x.fillRect(sx - 2, sy, 5, 1); x.fillRect(sx, sy - 2, 1, 5); }
  }
  function bar(bx, by, w, r) {
    x.fillStyle = 'rgba(43,29,20,.7)'; x.fillRect(bx, by, w, 2);
    x.fillStyle = '#9be36a'; x.fillRect(bx, by, Math.max(1, Math.round(w * r)), 2);
  }

  function loop(now) {
    raf = 0;
    if (!cv.isConnected || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (!reduce()) step(dt, now);
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
  document.addEventListener('visibilitychange', start);

  return {
    el: cv,
    set(m, hs) {
      model = m; handlers = hs;
      cv.setAttribute('aria-label', `Khu vườn: ${m.plots.filter(Boolean).length} ô đang trồng, ${m.plots.filter((p) => p?.ripe).length} ô đã chín`);
      cv.classList.toggle('editing', m.mode !== 'view');
      requestAnimationFrame(start);
    },
  };
}
