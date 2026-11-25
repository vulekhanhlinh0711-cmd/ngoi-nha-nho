// P4.01–P4.04: viết nhật ký (3 kiểu), cảm xúc hằng ngày, "thả trôi" bài xả stress.
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { toDate, WEEKDAY_NAMES } from '../../core/dates.js';
import { savePhoto, photoUrl } from '../../core/photos.js';
import { carousel, previewStrip } from './photo-ui.js';
import { isLocked, lockScreen } from '../../core/lock.js';
import {
  KINDS, MOODS, moodOf, saveEntry, deleteEntry, releaseEntry, allEntries, logMood, moodByDay, allTags,
} from './journal.js';

// Bản nháp giữ trong bộ nhớ để vẽ lại màn không làm mất chữ đang viết.
let kind = 'memory';
let draft = { text: '', mood: null, tags: new Set(), files: [], grat: ['', '', ''] };
let ventPrompt = null; // id bài xả stress vừa viết, đang chờ chọn giữ / thả trôi
let filter = 'all';
const resetDraft = () => { draft = { text: '', mood: null, tags: new Set(), files: [], grat: ['', '', ''] }; };

export const dayLabel = (day) => { const d = toDate(day); return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };

function moodCard(today) {
  return h('section', { class: 'card' },
    h('h3', {}, 'Hôm nay bạn thấy thế nào?'),
    h('div', { class: 'mood-row', role: 'radiogroup', 'aria-label': 'Cảm xúc hôm nay' }, MOODS.map(([v, icon, label]) => h('button', {
      class: `mood-btn mood-${v}${today?.mood === v ? ' on' : ''}`, role: 'radio', 'aria-checked': String(today?.mood === v), title: label,
      onclick: () => logMood(v, today?.note ?? ''),
    }, h('span', { class: 'mood-emoji' }, icon), h('span', { class: 'small' }, label)))),
    h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        const note = e.target.elements.note.value.trim();
        if (!today?.mood) { toast('Chọn biểu tượng cảm xúc trước nhé'); return; }
        await logMood(today.mood, note);
        toast('Đã lưu cảm xúc hôm nay');
      },
    }, h('input', { class: 'input', name: 'note', value: today?.note ?? '', maxlength: '140', placeholder: 'Một dòng ngắn về hôm nay (tùy chọn)', 'aria-label': 'Ghi chú cảm xúc' }),
      h('button', { class: 'chip', type: 'submit' }, 'Lưu')));
}

function tagPicker(tags) {
  return h('div', { class: 'presets' },
    tags.map((t) => h('button', {
      type: 'button', class: `chip${draft.tags.has(t) ? ' on' : ''}`, 'aria-pressed': String(draft.tags.has(t)),
      onclick: () => { draft.tags.has(t) ? draft.tags.delete(t) : draft.tags.add(t); notifyChange(); },
    }, `#${t}`)),
    h('input', {
      class: 'input num', placeholder: '+ nhãn', 'aria-label': 'Thêm nhãn mới', maxlength: '24',
      onkeydown: (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const v = e.target.value.trim().replace(/^#/, '');
        if (v) { draft.tags.add(v); e.target.value = ''; notifyChange(); }
      },
    }));
}

function writeCard(tags) {
  const info = KINDS.find((k) => k[0] === kind);
  const kindTabs = h('div', { class: 'presets', role: 'tablist' }, KINDS.map(([k, label]) => h('button', {
    class: `chip${k === kind ? ' on' : ''}`, role: 'tab', 'aria-selected': String(k === kind),
    onclick: () => { kind = k; notifyChange(); },
  }, label)));

  if (kind === 'gratitude') {
    return h('section', { class: 'card' },
      h('h3', {}, '✍️ Viết'), kindTabs, h('p', { class: 'muted small' }, info[2]),
      h('form', {
        class: 'grat-form', onsubmit: async (e) => {
          e.preventDefault();
          const items = draft.grat.map((s) => s.trim()).filter(Boolean);
          if (!items.length) return;
          await saveEntry({ kind: 'gratitude', items, text: items.join('\n'), tags: ['biết ơn'] });
          resetDraft();
          toast('🙏 Đã lưu những điều biết ơn hôm nay');
        },
      },
        draft.grat.map((v, i) => h('input', {
          class: 'input', value: v, maxlength: '200', placeholder: `${i + 1}. Hôm nay mình biết ơn…`, 'aria-label': `Điều biết ơn ${i + 1}`,
          oninput: (e) => { draft.grat[i] = e.target.value; },
        })),
        h('button', { class: 'btn', type: 'submit' }, 'Lưu')));
  }

  const photoInput = h('input', {
    type: 'file', accept: 'image/*', multiple: true, hidden: true,
    onchange: (e) => { draft.files.push(...e.target.files); e.target.value = ''; document.activeElement?.blur?.(); notifyChange(); },
  });
  return h('section', { class: 'card' },
    h('h3', {}, '✍️ Viết'), kindTabs, h('p', { class: 'muted small' }, info[2]),
    h('textarea', {
      class: 'input journal-text', rows: '6', 'aria-label': 'Nội dung nhật ký',
      placeholder: kind === 'vent' ? 'Chuyện gì làm bạn mệt? Cứ viết hết ra, không ai đọc đâu…' : 'Hôm nay có khoảnh khắc nào muốn giữ lại?',
      oninput: (e) => { draft.text = e.target.value; },
    }, draft.text),
    h('div', { class: 'presets' }, h('span', { class: 'meta-text' }, 'Tâm trạng:'), MOODS.map(([v, icon, label]) => h('button', {
      type: 'button', class: `chip${draft.mood === v ? ' on' : ''}`, title: label, 'aria-label': label, 'aria-pressed': String(draft.mood === v),
      onclick: () => { draft.mood = draft.mood === v ? null : v; notifyChange(); },
    }, icon))),
    tagPicker(tags),
    h('div', { class: 'presets' },
      h('label', { class: 'chip file-btn' }, '📷 Thêm ảnh', photoInput),
      draft.files.length ? h('span', { class: 'meta-text' }, `${draft.files.length} ảnh đã chọn`) : null),
    draft.files.length ? previewStrip(draft.files, (i) => { draft.files.splice(i, 1); notifyChange(); }) : null,
    h('button', {
      class: 'btn', onclick: async () => {
        if (!draft.text.trim() && !draft.files.length) { toast('Viết vài dòng hoặc thêm ảnh trước đã nhé'); return; }
        const b = document.activeElement; b?.blur?.(); // để danh sách cập nhật ngay
        const photoIds = [];
        for (const f of draft.files) { try { photoIds.push(await savePhoto(f, 1600)); } catch { toast('Một ảnh không đọc được nên bị bỏ qua'); } }
        const e = await saveEntry({ kind, text: draft.text.trim(), mood: draft.mood, tags: [...draft.tags], photoIds });
        if (photoIds.length) toast(`Đã lưu kèm ${photoIds.length} ảnh 📸`);
        resetDraft();
        if (kind === 'vent') ventPrompt = e.id;
        else toast('Đã lưu vào nhật ký 📖');
        notifyChange();
      },
    }, 'Lưu'));
}

// P4.03: hiệu ứng rồi xóa thật.
function release(id, how) {
  const fx = h('div', { class: `release-fx ${how}`, 'aria-hidden': 'true' }, h('div', { class: 'paper' }, how === 'burn' ? '📄' : '⛵'));
  document.body.append(fx);
  setTimeout(async () => {
    fx.remove();
    ventPrompt = null;
    await releaseEntry(id, how);
    toast(how === 'burn' ? '🔥 Đã cháy thành tro. Nhẹ lòng hơn chưa?' : '⛵ Con thuyền đã trôi xa. Mọi chuyện rồi sẽ ổn.');
  }, 2200);
}

function ventCard() {
  return h('section', { class: 'card vent-prompt' },
    h('h3', {}, 'Viết xong rồi. Bạn muốn làm gì với trang này?'),
    h('div', { class: 'presets' },
      h('button', { class: 'chip', onclick: () => { ventPrompt = null; toast('Đã giữ lại trong nhật ký'); notifyChange(); } }, '💾 Giữ lại'),
      h('button', { class: 'btn', onclick: () => release(ventPrompt, 'burn') }, '🔥 Đốt thành tro'),
      h('button', { class: 'btn btn-soft', onclick: () => release(ventPrompt, 'boat') }, '⛵ Thả thuyền giấy')),
    h('p', { class: 'muted small' }, 'Thả trôi là xóa hẳn khỏi máy, không khôi phục được.'));
}

export async function entryCard(e) {
  const kindInfo = KINDS.find((k) => k[0] === e.kind);
  const photos = await carousel(e.photoIds ?? [], e.text ?? '');
  return h('article', { class: `entry kind-${e.kind}${photos ? ' has-photos' : ''}` },
    h('header', { class: 'entry-head' },
      h('span', {}, kindInfo?.[1] ?? ''), e.mood ? h('span', { title: moodOf(e.mood)[2] }, moodOf(e.mood)[1]) : null,
      h('span', { class: 'meta-text' }, dayLabel(e.day)),
      h('span', { class: 'grow' }),
      e.kind === 'memory' ? h('button', {
        class: `icon-btn${e.onWall ? ' on' : ''}`, title: e.onWall ? 'Gỡ khỏi tường' : 'Treo lên tường nhà', 'aria-pressed': String(!!e.onWall),
        onclick: async () => { await saveEntry({ ...e, onWall: !e.onWall }); toast(e.onWall ? 'Đã gỡ khỏi tường' : '🖼️ Đã treo lên tường nhà'); },
      }, '🖼️') : null,
      e.kind === 'vent' ? h('button', { class: 'icon-btn', title: 'Thả trôi', onclick: () => release(e.id, 'boat') }, '⛵') : null,
      h('button', {
        class: 'icon-btn', 'aria-label': 'Xóa trang này',
        onclick: async () => { if (confirm('Xóa trang nhật ký này? Không khôi phục được.')) await deleteEntry(e.id); },
      }, '✕')),
    photos,
    e.kind === 'gratitude' && e.items
      ? h('ol', { class: 'grat-list' }, e.items.map((it) => h('li', {}, it)))
      : e.text ? h('p', { class: 'entry-text' }, e.text) : null,
    e.tags?.length ? h('div', { class: 'presets' }, e.tags.map((t) => h('span', { class: 'meta-chip' }, `#${t}`))) : null);
}

export const journalHead = (active) => h('div', { class: 'view-head' }, subnav('journal', active), h('h2', {}, 'Nhật ký'));

export async function renderJournal(root) {
  if (await isLocked('journal')) {
    mount(root, journalHead('journal'), lockScreen('journal', 'Nhật ký đang khóa', notifyChange));
    return;
  }
  const moods = await moodByDay();
  const tags = await allTags();
  const list = (await allEntries()).filter((e) => filter === 'all' || e.kind === filter || e.tags?.includes(filter));
  mount(root,
    journalHead('journal'),
    moodCard(moods.get(todayKey())),
    ventPrompt ? ventCard() : writeCard(tags),
    h('section', { class: 'entries' },
      h('div', { class: 'card-head' }, h('h3', {}, 'Các trang đã viết'),
        h('select', {
          class: 'input', 'aria-label': 'Lọc trang nhật ký',
          onchange: (e) => { filter = e.target.value; notifyChange(); },
        }, h('option', { value: 'all' }, 'Tất cả'), KINDS.map(([k, l]) => h('option', { value: k, selected: filter === k }, l)),
          tags.map((t) => h('option', { value: t, selected: filter === t }, `#${t}`)))),
      list.length ? await Promise.all(list.slice(0, 30).map(entryCard)) : h('p', { class: 'muted small' }, 'Chưa có trang nào.')));
}
