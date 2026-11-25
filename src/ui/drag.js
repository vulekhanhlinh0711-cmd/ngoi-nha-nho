// Kéo thả dùng chung: phần tử có data-id (draggable) kéo được, vùng có data-drop nhận thả.
// Gắn 1 lần vào khung chính, các view vẽ lại không cần gắn lại.
// P51: thêm kéo bằng ngón tay (điện thoại/iPad): giữ thẻ ~0,3 giây rồi kéo; gần mép thì tự cuộn.
import { triage, remove, prioritize, assignProject, reschedule } from '../features/tasks/task-actions.js';

const zoneOf = (e) => (e.target instanceof Element ? e.target.closest('[data-drop]') : null);

// Thực hiện hành động khi thả việc `id` vào vùng `target`.
export function dropAction(id, target) {
  if (!id || !target) return;
  if (target === 'delete') remove(id);
  else if (target.startsWith('q:')) {
    // Ô ma trận: "q:<quan trọng 0/1>:<gấp 0/1>"
    const [, imp, urg] = target.split(':');
    prioritize(id, imp === '1', urg === '1');
  } else if (target.startsWith('p:')) assignProject(id, target === 'p:none' ? null : target.slice(2));
  else if (target.startsWith('d:')) reschedule(id, target === 'd:none' ? null : target.slice(2));
  else triage(id, target);
}

const setDragging = (on) => document.body.classList.toggle('is-dragging', on);

export function enableDrag(root) {
  root.addEventListener('dragstart', (e) => {
    const el = e.target instanceof Element ? e.target.closest('[data-id]') : null;
    if (!el) return;
    e.dataTransfer.setData('text/plain', el.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
    setDragging(true);
  });
  root.addEventListener('dragend', (e) => {
    if (e.target instanceof Element) e.target.classList.remove('dragging');
    setDragging(false);
    root.querySelectorAll('[data-drop].over').forEach((z) => z.classList.remove('over'));
  });
  root.addEventListener('dragover', (e) => {
    const z = zoneOf(e);
    if (!z) return;
    e.preventDefault();
    z.classList.add('over');
  });
  root.addEventListener('dragleave', (e) => {
    const z = zoneOf(e);
    if (z && !z.contains(e.relatedTarget)) z.classList.remove('over');
  });
  root.addEventListener('drop', (e) => {
    const z = zoneOf(e);
    if (!z) return;
    e.preventDefault();
    z.classList.remove('over');
    setDragging(false);
    dropAction(Number(e.dataTransfer.getData('text/plain')), z.dataset.drop);
  });
  enableTouchDrag(root);
}

// ---- Kéo bằng ngón tay ----
function enableTouchDrag(root) {
  let s = null; // { el, id, x0, y0, timer, ghost, dx, dy, zone, scroller, raf, x, y }
  const LONG = 300; const SLOP = 10;

  const cleanup = () => {
    if (!s) return;
    clearTimeout(s.timer); cancelAnimationFrame(s.raf);
    s.ghost?.remove(); s.el.classList.remove('dragging'); s.zone?.classList.remove('over');
    setDragging(false);
    s = null;
  };
  // Ngón tay ở khoảng trống dưới cột → vẫn tính là cột đó (theo chiều ngang).
  const zoneAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const z = el?.closest('[data-drop]');
    if (z || !el?.closest('.board')) return z ?? null;
    return [...el.closest('.board').querySelectorAll(':scope > [data-drop]')].find((c) => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right; }) ?? null;
  };
  // Tự cuộn khi ngón tay gần mép: cuộn ngang khung bảng, cuộn dọc cả trang.
  const autoScroll = () => {
    if (!s?.ghost) return;
    const edge = 48; const sp = 14;
    const sc = s.scroller;
    if (sc) {
      const r = sc.getBoundingClientRect();
      if (s.x < r.left + edge) sc.scrollLeft -= sp; else if (s.x > r.right - edge) sc.scrollLeft += sp;
    }
    if (s.y < edge + 40) window.scrollBy(0, -sp); else if (s.y > innerHeight - edge - 60) window.scrollBy(0, sp);
    const z = zoneAt(s.x, s.y);
    if (z !== s.zone) { s.zone?.classList.remove('over'); z?.classList.add('over'); s.zone = z; }
    s.raf = requestAnimationFrame(autoScroll);
  };
  const begin = () => {
    const r = s.el.getBoundingClientRect();
    const g = s.el.cloneNode(true);
    g.classList.add('drag-ghost'); g.removeAttribute('data-id'); g.removeAttribute('draggable');
    Object.assign(g.style, { width: `${r.width}px`, left: `${r.left}px`, top: `${r.top}px` });
    s.dx = s.x0 - r.left; s.dy = s.y0 - r.top;
    document.body.append(g);
    s.ghost = g;
    s.el.classList.add('dragging');
    s.scroller = s.el.closest('.board, .daybar, .week, .month') ?? null;
    if (s.scroller && s.scroller.scrollWidth <= s.scroller.clientWidth) s.scroller = null;
    setDragging(true);
    navigator.vibrate?.(15);
    s.raf = requestAnimationFrame(autoScroll);
  };

  root.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { cleanup(); return; }
    const t = e.target instanceof Element ? e.target : null;
    const el = t?.closest('[draggable="true"][data-id]');
    if (!el || t.closest('input, select, textarea')) return;
    const p = e.touches[0];
    cleanup();
    s = { el, id: Number(el.dataset.id), x0: p.clientX, y0: p.clientY, x: p.clientX, y: p.clientY };
    s.timer = setTimeout(begin, LONG);
  }, { passive: true });

  root.addEventListener('touchmove', (e) => {
    if (!s) return;
    const p = e.touches[0];
    s.x = p.clientX; s.y = p.clientY;
    if (!s.ghost) {
      // Di chuyển trước khi giữ đủ lâu = đang cuộn → không kéo.
      if (Math.hypot(s.x - s.x0, s.y - s.y0) > SLOP) cleanup();
      return;
    }
    e.preventDefault();
    s.ghost.style.left = `${s.x - s.dx}px`;
    s.ghost.style.top = `${s.y - s.dy}px`;
  }, { passive: false });

  const end = (e) => {
    if (!s) return;
    if (s.ghost) {
      e.preventDefault();
      const z = zoneAt(s.x, s.y);
      const { id } = s;
      // Chặn cú bấm "ma" ngay sau khi thả (khỏi mở hộp sửa việc).
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener('click', stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 400);
      cleanup();
      if (z && e.type === 'touchend') dropAction(id, z.dataset.drop);
      return;
    }
    cleanup();
  };
  root.addEventListener('touchend', end, { passive: false });
  root.addEventListener('touchcancel', end, { passive: false });
  // Trình duyệt tự bắt đầu kéo kiểu gốc → để nó lo (tránh làm 2 lần).
  root.addEventListener('dragstart', (e) => { if (s?.ghost) e.preventDefault(); else if (s) cleanup(); });
  // Giữ lâu trên thẻ: không bật menu "Sao chép/Chia sẻ".
  root.addEventListener('contextmenu', (e) => { if (s || (e.target instanceof Element && e.target.closest('.kcard, .mchip'))) e.preventDefault(); });
}
