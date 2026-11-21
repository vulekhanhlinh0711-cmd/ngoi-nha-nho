// P14.01: học trên PREP (prepedu.com) rồi ghi lại vào app.
// PREP không có API công khai và chặn nhúng vào trang khác (CSP frame-ancestors), nên app KHÔNG đăng nhập hộ,
// KHÔNG lưu mật khẩu, KHÔNG đọc dữ liệu tài khoản PREP. Cách làm: mở PREP ở tab mới (bạn tự đăng nhập, trình duyệt nhớ phiên),
// app bấm giờ, quay lại thì hỏi để ghi buổi học (kỹ năng, phút, điểm) → tính vào thống kê IELTS và thói quen "Học tiếng Anh".
import { h } from '../../ui/dom.js';
import { getSetting, setSetting } from '../../core/db.js';
import { notifyChange } from '../../core/events.js';
import { toast } from '../../ui/toast.js';
import { SKILLS } from './content.js';
import { lessonDone } from './ielts.js';

export const PREP_LINKS = [
  ['ielts', '🎓 Khóa IELTS', 'https://prepedu.com/vi/ielts'],
  ['room', '🏫 Phòng luyện ảo IELTS', 'https://prepedu.com/vi/news/phong-luyen-ao-ielts'],
  ['dict', '📚 Từ điển PREP', 'https://lib.prepedu.com/vi/dictionary'],
];

// P17: Daily Dictation (nghe – chép chính tả). Cũng không có API công khai → mở tab mới, bấm giờ, ghi buổi luyện nghe.
export const DD_LINKS = [
  ['🎧 IELTS Listening', 'https://dailydictation.com/exercises/ielts-listening'],
  ['📖 Truyện ngắn', 'https://dailydictation.com/exercises/short-stories'],
  ['💬 Hội thoại', 'https://dailydictation.com/exercises/english-conversations'],
  ['🎓 TED-Ed', 'https://dailydictation.com/exercises/ted-ed'],
  ['🗞 Tin tức', 'https://dailydictation.com/exercises/news'],
  ['🔤 Phát âm', 'https://dailydictation.com/exercises/english-pronunciation'],
  ['🔢 Số & tên riêng', 'https://dailydictation.com/exercises/numbers'],
];
const SITE_NAME = { prep: 'PREP', dd: 'Daily Dictation' };

async function prefs() { return { myUrl: '', session: null, ...((await getSetting('prep')) ?? {}) }; }
const save = async (p) => { await setSetting('prep', p); notifyChange(); };

// URL chỉ nhận trang thuộc PREP để tránh mở nhầm trang lạ.
const isPrepUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && /(^|\.)prepedu\.com$|(^|\.)prep\.vn$/.test(x.hostname); } catch { return false; } };

async function go(url, skill, site = 'prep') {
  window.open(url, '_blank', 'noopener');
  const p = await prefs();
  p.session = { startedAt: Date.now(), skill, site };
  await save(p);
}

// Quay lại app sau khi học trên PREP → nhắc ghi buổi học.
let asked = false;
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || asked) return;
  const p = await prefs();
  if (!p.session) return;
  const mins = Math.round((Date.now() - p.session.startedAt) / 60000);
  if (mins < 3) return;
  asked = true;
  toast(`Chào mừng quay lại! Bạn vừa học ${SITE_NAME[p.session.site ?? 'prep']} khoảng ${mins} phút. Vào Học → IELTS để ghi lại nhé.`, {
    duration: 12000, actionLabel: 'Ghi ngay', onAction: () => { location.hash = '#ielts'; },
  });
});

export async function prepCard() {
  const p = await prefs();
  const running = p.session ? Math.max(1, Math.round((Date.now() - p.session.startedAt) / 60000)) : null;
  const url = p.myUrl && isPrepUrl(p.myUrl) ? p.myUrl : PREP_LINKS[0][2];
  return h('section', { class: 'card prep-card' },
    h('div', { class: 'card-head' },
      h('h3', {}, h('span', { class: 'prep-logo' }, 'P'), 'Học trên PREP & Daily Dictation'),
      h('a', { class: 'chip', href: 'https://prepedu.com/vi/', target: '_blank', rel: 'noopener' }, 'prepedu.com ↗')),
    h('p', { class: 'muted small' }, 'Đăng nhập ngay trên trang PREP (trình duyệt sẽ nhớ). App không lưu mật khẩu hay đọc tài khoản PREP; app chỉ bấm giờ và ghi lại buổi học của bạn vào thống kê.'),
    h('div', { class: 'presets' },
      h('button', { class: 'btn', onclick: () => go(url, null) }, p.myUrl ? '▶ Mở trang học của tôi' : '▶ Mở PREP & bắt đầu học'),
      PREP_LINKS.slice(1).map(([, label, u]) => h('button', { class: 'chip', onclick: () => go(u, null) }, label))),
    h('h4', { class: 'dd-title' }, h('span', { class: 'dd-logo' }, 'DD'), 'Daily Dictation · luyện nghe chép chính tả',
      h('a', { class: 'chip', href: 'https://dailydictation.com/exercises', target: '_blank', rel: 'noopener', onclick: (e) => { e.preventDefault(); go('https://dailydictation.com/exercises', 'listening', 'dd'); } }, 'Tất cả bài ↗')),
    h('div', { class: 'presets' }, DD_LINKS.map(([label, u], i) => h('button', {
      class: i === 0 ? 'btn btn-dd' : 'chip', onclick: () => go(u, 'listening', 'dd'),
    }, label))),
    running ? h('form', {
      class: 'prep-log',
      onsubmit: async (e) => {
        e.preventDefault();
        const f = e.target.elements;
        const minutes = Number(f.m.value) || running;
        const score = f.s.value ? Number(f.s.value) : null;
        await lessonDone(f.k.value, minutes, { source: p.session.site ?? 'prep', ...(score != null ? { score: Math.round((score / 9) * 100), band: score } : {}) });
        const q = await prefs(); q.session = null; await save(q);
        asked = false;
        toast(`📚 Đã ghi ${minutes} phút ${SKILLS.find((x) => x[0] === f.k.value)[1]} trên ${SITE_NAME[p.session.site ?? 'prep']}`);
      },
    },
      h('b', {}, `⏱ Đang học ${SITE_NAME[p.session.site ?? 'prep']} · ${running} phút`),
      h('select', { class: 'input', name: 'k', 'aria-label': 'Kỹ năng' }, SKILLS.map(([k, l]) => h('option', { value: k, selected: k === p.session.skill }, l))),
      h('label', { class: 'field-inline' }, h('input', { class: 'input num', name: 'm', type: 'number', min: '1', max: '600', value: running, 'aria-label': 'Số phút' }), 'phút'),
      h('label', { class: 'field-inline' }, 'Band', h('input', { class: 'input num', name: 's', type: 'number', min: '0', max: '9', step: '0.5', placeholder: 'nếu có', 'aria-label': 'Band điểm bài làm (không bắt buộc)' })),
      h('button', { class: 'btn', type: 'submit' }, 'Ghi buổi học'),
      h('button', { class: 'chip', type: 'button', onclick: async () => { const q = await prefs(); q.session = null; await save(q); asked = false; } }, 'Bỏ')) : null,
    h('details', {},
      h('summary', { class: 'muted small' }, 'Lưu trang học của bạn (link khóa học / bài đang học trên PREP)'),
      h('form', {
        class: 'inline-form',
        onsubmit: async (e) => {
          e.preventDefault();
          const v = e.target.elements.u.value.trim();
          if (v && !isPrepUrl(v)) { toast('Chỉ nhận link thuộc prepedu.com'); return; }
          const q = await prefs(); q.myUrl = v; await save(q);
          toast(v ? 'Đã lưu trang học của bạn' : 'Đã xóa link');
        },
      }, h('input', { class: 'input', name: 'u', value: p.myUrl, placeholder: 'https://prepedu.com/…', 'aria-label': 'Link trang học PREP' }),
        h('button', { class: 'chip', type: 'submit' }, 'Lưu'))));
}
