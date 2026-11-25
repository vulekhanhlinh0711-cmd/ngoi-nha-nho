import { h } from './ui/dom.js';
import { toast } from './ui/toast.js';
import { enableDrag } from './ui/drag.js';
import { bus } from './core/events.js';
import { todayKey } from './core/time.js';
import { every20s, startScheduler } from './core/scheduler.js';
import { addTask, countInbox } from './features/tasks/tasks.js';
import { parseQuick } from './features/tasks/quick-parse.js';
import { taskMeta } from './features/tasks/task-meta.js';
import { groupOf } from './ui/subnav.js';
import { renderFood } from './features/food/food-view.js';
import { renderJournal } from './features/journal/journal-view.js';
import { renderJournalCal } from './features/journal/journal-cal-view.js';
import { renderJournalAlbum } from './features/journal/journal-album.js';
import { renderMoney, renderBudget, renderSaving, renderWishlist, renderReport } from './features/finance/finance-views.js';
import { checkBills } from './features/finance/bill-reminder.js';
import { renderHabits } from './features/habits/habits-view.js';
import { checkStreakBonus, checkTiredWin } from './features/habits/habits.js';
import { renderGarden } from './features/garden/garden-view.js';
import { renderHouse } from './features/home/house-view.js';
import { renderAvatar } from './features/home/avatar-view.js';
import { renderMoodboard, renderCloset } from './features/home/style-views.js';
import { renderMindful, renderManifest } from './features/mind/mind-view.js';
import { renderBooks } from './features/books/books-view.js';
import { renderVocab } from './features/vocab/vocab-view.js';
import { startVocabReminder } from './features/vocab/vocab.js';
import { renderVision } from './features/mind/vision-view.js';
import { renderReview } from './features/assistant/review-view.js';
import { checkWeeklyReview } from './features/assistant/assistant.js';
import { renderIelts } from './features/ielts/ielts-view.js';
import { renderStylist } from './features/home/stylist-view.js';
import { renderLessons, renderMarket } from './features/econ/econ-views.js';
import { renderAi } from './features/ai/ai-view.js';
import { ensureTodayTask } from './features/ielts/ielts.js';
import { renderToday } from './features/today/today-view.js';
import { renderInbox } from './features/inbox/inbox-view.js';
import { renderMatrix } from './features/matrix/matrix-view.js';
import { renderLists } from './features/lists/lists-view.js';
import { renderBoard } from './features/tasks/board-view.js';
import { renderTasks } from './features/tasks/tasks-view.js';
import { getProjects } from './features/tasks/projects.js';
import { renderCalendar } from './features/calendar/calendar-view.js';
import { renderFocus, updateFocusClock } from './features/focus/focus-view.js';
import { renderWater } from './features/water/water-view.js';
import { renderStats } from './features/stats/stats-view.js';
import { renderSettings } from './features/reminders/settings-view.js';
import { checkTriage } from './features/reminders/triage-reminder.js';
import { checkAppointments } from './features/calendar/appt-reminder.js';
import { checkWater } from './features/water/water-reminder.js';
import { loadPomo, tick as pomoTick } from './features/focus/pomodoro.js';
import { coinSummary } from './features/rewards/coins.js';
import { updateRoomClock } from './features/room/room.js';
import { applySeason } from './core/season.js';
import { getSetting } from './core/db.js';
import { requestPersist, dailySnapshot } from './core/safety.js';
import { applyLinkFromHash } from './core/device-link.js';
import { applyScene } from './core/scenes.js';
import { mountControl as mountBgm } from './features/bgm/bgm.js';
import { startGreeting } from './features/greet/greet.js';
import { start as startSync, syncState } from './core/sync.js';
import { avatarEl, getProfile } from './core/profile.js';

// P16: ảnh đại diện + lời chào ở đầu thanh bên.
const navEl = document.querySelector('.tabs');
const profileChip = h('a', { class: 'profile-chip', href: '#settings', title: 'Hồ sơ & giao diện' });
navEl.prepend(profileChip);
let profileSig = '';
async function updateProfileChip(season) {
  const p = await getProfile();
  const sig = `${p.photoId}|${p.bow}|${p.style}|${p.name}|${season}|${(await getSetting('charImages'))?.main}`;
  if (sig === profileSig) return;
  profileSig = sig;
  profileChip.replaceChildren(await avatarEl('nav-pfp'), h('span', { class: 'profile-hi' }, p.name ? `Hi, ${p.name} 👋` : 'Hi 👋'));
}

const views = {
  today: renderToday, inbox: renderInbox,
  tasks: renderTasks, board: renderBoard, lists: renderLists, matrix: renderMatrix, calendar: renderCalendar,
  focus: renderFocus, water: renderWater, food: renderFood, journal: renderJournal, 'journal-cal': renderJournalCal, 'journal-album': renderJournalAlbum,
  money: renderMoney, budget: renderBudget, saving: renderSaving, wishlist: renderWishlist, 'money-report': renderReport,
  habits: renderHabits, garden: renderGarden, house: renderHouse, avatar: renderAvatar, moodboard: renderMoodboard, closet: renderCloset, mindful: renderMindful, manifest: renderManifest, vision: renderVision, vocab: renderVocab, books: renderBooks,
  review: renderReview, ielts: renderIelts, stylist: renderStylist, lessons: renderLessons, market: renderMarket, ai: renderAi,
  stats: renderStats, settings: renderSettings,
};
const main = document.getElementById('main');
const banner = document.getElementById('banner');
const badge = document.getElementById('inbox-badge');
const input = document.getElementById('capture-input');
const preview = document.getElementById('capture-preview');
const coinPill = document.getElementById('coin-pill');

const currentView = () => {
  const v = location.hash.slice(1);
  return views[v] ? v : 'today';
};
const navGroup = groupOf;

// Xem trước app hiểu câu ghi nhanh thế nào (ngày, giờ, quan trọng).
function updatePreview() {
  const p = input.value.trim() ? parseQuick(input.value, todayKey()) : null;
  const meta = p && taskMeta(p);
  preview.replaceChildren(...(meta ? [h('span', { class: 'meta-text' }, 'App hiểu là:'), meta] : []));
  preview.hidden = !meta;
}
input.addEventListener('input', updatePreview);

async function updateBadge() {
  const n = await countInbox();
  badge.textContent = n;
  badge.hidden = n === 0;
  if (n === 0) banner.hidden = true;
  const count = banner.querySelector('.banner-count');
  if (count) count.textContent = n;
}

// Ví xu trên thanh đầu trang; nảy nhẹ khi có thêm xu.
let lastCoins = null;
async function updateCoins() {
  const c = await coinSummary();
  coinPill.replaceChildren(h('img', { class: 'pill-3d', src: 'icons/3d/coin.png', alt: '' }), ` ${c.balance}`);
  coinPill.title = `Xu trong game (không phải tiền thật). Hôm nay +${c.today}`;
  if (lastCoins !== null && c.balance > lastCoins) {
    coinPill.dataset.gain = `+${c.balance - lastCoins}`;
    coinPill.classList.remove('bump');
    void coinPill.offsetWidth; // chạy lại hiệu ứng
    coinPill.classList.add('bump');
  }
  lastCoins = c.balance;
}

// Vẽ lần lượt: có yêu cầu mới khi đang vẽ thì vẽ thêm 1 lần sau đó,
// tránh lần vẽ cũ (chậm hơn) ghi đè lên màn hình mới.
let rendering = false;
let renderAgain = false;
let shownView = null;
async function render() {
  if (rendering) { renderAgain = true; return; }
  rendering = true;
  try {
    do { renderAgain = false; await renderOnce(); } while (renderAgain);
  } finally {
    rendering = false;
  }
}

// Đang gõ trong ô nhập của màn hiện tại thì chưa vẽ lại (tránh mất chữ), đợi rời ô.
// P41: giữ chữ đang gõ dở. Trước đây: gõ ô 1 rồi chạm sang ô 2 → màn hình vẽ lại ngay → ô 1 mất chữ.
const FIELD_SEL = 'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):not([type=range]), textarea';
const isField = (el) => !!el && el.matches?.(FIELD_SEL);
const dirty = (el) => el.value !== el.defaultValue;
function isTypingInMain() {
  const el = document.activeElement;
  if (!el || !main.contains(el) || !isField(el)) return false;
  // Hoãn khi ô đang có chữ, hoặc các ô khác cùng form đang điền dở (gõ xong + Enter + form được xóa thì vẽ lại ngay).
  if (el.value !== '') return true;
  return !!el.form && [...el.form.elements].some((x) => isField(x) && dirty(x));
}
let deferred = false;
main.addEventListener('focusout', (e) => {
  if (!deferred) return;
  // Chỉ chuyển sang ô khác trong màn hình → vẫn đang điền, chưa vẽ lại.
  if (isField(e.relatedTarget) && main.contains(e.relatedTarget)) return;
  deferred = false;
  // Đợi một nhịp: nếu đang bấm nút "Thêm/Lưu" thì để lần bấm chạy xong trước, kẻo nút bị thay mới giữa chừng.
  setTimeout(render, 450);
});

// Khi buộc phải vẽ lại (đổi dữ liệu từ máy khác…), chép lại chữ đang điền dở vào ô tương ứng.
const submitted = new WeakSet();
main.addEventListener('submit', (e) => submitted.add(e.target), true);
function fieldKeys(root) {
  const seen = {};
  return [...root.querySelectorAll(FIELD_SEL)].map((el) => {
    const base = `${el.form?.className ?? ''}|${el.name}|${el.getAttribute('aria-label') ?? ''}|${el.placeholder ?? ''}`;
    seen[base] = (seen[base] ?? 0) + 1;
    return [`${base}#${seen[base]}`, el];
  });
}
function snapshotFields() {
  const act = document.activeElement;
  const snap = { vals: new Map(), focus: null };
  for (const [k, el] of fieldKeys(main)) {
    if (dirty(el) && !(el.form && submitted.has(el.form))) snap.vals.set(k, { v: el.value, d: el.defaultValue });
    if (el === act) snap.focus = { k, s: el.selectionStart, e: el.selectionEnd };
  }
  return snap;
}
function restoreFields(snap) {
  if (!snap.vals.size && !snap.focus) return;
  for (const [k, el] of fieldKeys(main)) {
    // Chỉ chép lại khi ô mới vẫn là ô cũ (cùng giá trị mặc định) — vd. bấm ✎ Sửa thì dùng dữ liệu điền sẵn mới.
    const o = snap.vals.get(k);
    if (o && el.defaultValue === o.d && el.value === el.defaultValue) el.value = o.v;
    if (snap.focus?.k === k && document.activeElement !== el) {
      el.focus({ preventScroll: true });
      try { el.setSelectionRange(snap.focus.s, snap.focus.e); } catch { /* ô số không hỗ trợ */ }
    }
  }
}

async function renderOnce() {
  const v = currentView();
  document.body.dataset.group = navGroup(v); // P14.02: mỗi nhóm màn một tông màu
  await updateProfileChip(await applySeason());
  await applyScene(navGroup(v));
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === navGroup(v);
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (v === shownView && isTypingInMain()) {
    deferred = true;
  } else {
    const snap = v === shownView ? snapshotFields() : null;
    await views[v](main);
    if (snap) restoreFields(snap);
    shownView = v;
  }
  await updateBadge();
  await updateCoins();
  updateFocusClock();
}

// Ghi nhanh: gõ rồi Enter, không cần chọn gì thêm.
document.getElementById('capture').addEventListener('submit', async (e) => {
  e.preventDefault();
  const t = await addTask(input.value);
  input.value = '';
  updatePreview();
  if (t) toast(`Đã thêm vào Inbox: “${t.title}”`);
});

// Phím N hoặc / để nhảy tới ô ghi nhanh; Esc để thoát.
document.addEventListener('keydown', (e) => {
  const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
  if (!typing && (e.key === 'n' || e.key === 'N' || e.key === '/') && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    input.focus();
  } else if (e.key === 'Escape' && e.target === input) {
    input.blur();
  }
});

bus.addEventListener('change', render);
bus.addEventListener('water-goal', () => toast('🎉 Đủ nước hôm nay rồi! +10 xu, cây được tưới đẫm 🌱'));
bus.addEventListener('triage-due', (e) => {
  banner.replaceChildren(
    h('span', {}, '⏰ Đến giờ phân loại Inbox: còn ',
      h('b', { class: 'banner-count' }, e.detail.count), ' việc.'),
    h('button', { class: 'btn', onclick: () => { location.hash = '#inbox'; banner.hidden = true; } }, 'Phân loại ngay'),
    h('button', { class: 'icon-btn', 'aria-label': 'Đóng', onclick: () => { banner.hidden = true; } }, '✕'),
  );
  banner.hidden = false;
});
window.addEventListener('hashchange', () => { shownView = null; render(); });

// PWA: cài lên màn hình chính, chạy khi mất mạng.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch((e) => console.warn('Không đăng ký được service worker', e));
  // Có bản app mới → tự tải lại 1 lần để dùng ngay (dữ liệu không ảnh hưởng).
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && navigator.serviceWorker.controller) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.hash) location.hash = e.data.hash;
  });
}

enableDrag(main);
// Biểu tượng "Hôm nay" hiện ngày hiện tại.
const dayIcon = document.querySelector('[data-nav=today] text');
if (dayIcon) dayIcon.textContent = new Date().getDate();
await loadPomo();
// P23: bật đồng bộ (nếu đã đăng nhập) trước khi chạy các việc tự động, để không tạo trùng giữa các máy.
await Promise.race([startSync().catch(() => {}), new Promise((r) => setTimeout(r, 6000))]);
await getProjects();
mountBgm(document.querySelector('.pills'));
startGreeting();
startVocabReminder();
const syncDot = h('a', { class: 'pill icon sync-dot', href: '#settings', title: 'Đồng bộ' });
document.querySelector('.pills')?.prepend(syncDot);
const paintSync = () => {
  const s = syncState.status;
  syncDot.hidden = s === 'off';
  syncDot.textContent = { syncing: '🔄', ok: '☁️', error: '⚠️', offline: '📴' }[s] ?? '';
  syncDot.title = { syncing: 'Đang đồng bộ', ok: `Đã đồng bộ${syncState.lastSync ? ` lúc ${syncState.lastSync.toLocaleTimeString('vi-VN')}` : ''}`, error: `Lỗi đồng bộ: ${syncState.error}`, offline: 'Mất mạng' }[s] ?? '';
};
window.addEventListener('sync-status', paintSync);
paintSync();
render();
setInterval(() => { pomoTick(); updateFocusClock(); updateRoomClock(); }, 1000);
requestPersist();
dailySnapshot().catch(() => {});
setInterval(() => dailySnapshot().catch(() => {}), 30 * 60_000);
every20s(checkTriage);
every20s(checkAppointments);
every20s(checkWater);
every20s(checkBills);
every20s(checkWeeklyReview);
every20s(ensureTodayTask);
every20s(async () => {
  await checkTiredWin();
  for (const hb of await checkStreakBonus()) toast(`🔥 ${hb.name}: chuỗi ${hb.milestone} ngày! +50 🪙`);
});
startScheduler();
