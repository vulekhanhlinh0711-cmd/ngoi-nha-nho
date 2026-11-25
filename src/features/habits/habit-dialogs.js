// P49: hộp thoại thói quen — thêm nhanh / tạo / sửa, ghi vận động, ghi giấc ngủ.
import { h, mount } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { sheet } from '../books/dialogs.js';
import { logExercise, EXERCISES } from '../food/body.js';
import { SUGGESTIONS, BUILT_IN, COLORS, PARTS, allHabits, addHabit, saveHabit, archiveHabit, toggleDay, logSleep, scheduleText } from './habits.js';

const field = (label, input) => h('label', { class: 'bk-field' }, h('span', {}, label), input);
const ICONS = ['⭐', '🧴', '💧', '🍳', '🧘', '📖', '📚', '🏃', '😴', '🥗', '🍎', '💊', '🦷', '☀️', '🛏️', '🧹', '✍️', '🙏', '🎨', '🎹', '🌱', '💰', '📞', '🐱', '🚶', '🤸', '🏋️', '🚴', '🥤', '📵', '🚭', '🍰'];

export async function addDialog() {
  const { dlg, body } = sheet('Thêm thói quen', { cls: 'wide' });
  const draw = async () => {
    const have = new Set((await allHabits()).map((x) => x.id)); const hidden = await allHabits({ archived: true });
    const list = SUGGESTIONS.filter((s) => !have.has(s.id) && !hidden.some((x) => x.id === s.id));
    mount(body,
      h('button', { class: 'btn', onclick: () => { dlg.close(); editDialog(null); } }, '✏️ Tự tạo thói quen của bạn'),
      hidden.length ? [h('h4', {}, 'Đã ẩn (lịch sử vẫn còn)'), h('div', { class: 'hb-sug' }, hidden.map((s) => h('button', { class: 'hb-sugitem', style: `--hc:${s.color}`, onclick: async () => { await archiveHabit(s.id, false); await draw(); } }, h('span', { class: 'hb-ic' }, s.icon), h('span', { class: 'grow' }, h('b', {}, s.name)), h('span', {}, '↩︎ Hiện lại'))))] : null,
      h('h4', {}, 'Gợi ý — chạm để thêm'),
      list.length ? h('div', { class: 'hb-sug' }, list.map((s) => h('button', { class: 'hb-sugitem', style: `--hc:${s.color}`, onclick: async () => { await addHabit(s); await draw(); } }, h('span', { class: 'hb-ic' }, s.icon), h('span', { class: 'grow' }, h('b', {}, s.name), h('small', {}, s.auto ?? scheduleText(s))), h('span', {}, '＋')))) : h('p', { class: 'small' }, 'Bạn đã thêm hết gợi ý 🎉'));
  };
  draw();
}

export function editDialog(hb) {
  const { dlg, body } = sheet(hb ? `Sửa: ${hb.name}` : 'Thói quen mới', { cls: 'wide' });
  const st = { icon: hb?.icon ?? '⭐', color: hb?.color ?? COLORS[4], kind: hb?.kind ?? 'check', part: hb?.part ?? 'any', mode: hb?.perWeek ? 'week' : hb?.days?.length && hb.days.length < 7 ? 'days' : 'daily', days: new Set(hb?.days?.length ? hb.days : [1, 2, 3, 4, 5, 6, 0]), perWeek: hb?.perWeek ?? 3 };
  const builtin = hb && BUILT_IN.some((x) => x.id === hb.id); const auto = !!hb?.auto;
  const err = h('p', { class: 'bk-err', role: 'alert' });
  const name = h('input', { class: 'input', name: 'name', maxlength: '40', value: hb?.name ?? '', autocomplete: 'off', placeholder: 'VD: Uống trà thay cà phê' });
  const icon = h('input', { class: 'input hb-iconin', name: 'icon', maxlength: '4', value: st.icon, 'aria-label': 'Biểu tượng', oninput: (e) => { st.icon = e.target.value; } });
  const target = h('input', { class: 'input', name: 'target', type: 'number', min: '1', max: '999', value: hb?.target ?? 2 });
  const unit = h('input', { class: 'input', name: 'unit', maxlength: '12', value: hb?.unit ?? 'lần', autocomplete: 'off' });
  const zone = { icons: h('div', { class: 'hb-icons' }), colors: h('div', { class: 'hb-colors', role: 'radiogroup', 'aria-label': 'Màu' }), kind: h('div'), part: h('div'), sched: h('div', { class: 'bk-form' }) };
  const pick = (cur, opts, set) => h('div', { class: 'presets', role: 'radiogroup' }, opts.map(([k, l]) => h('button', { type: 'button', class: `chip${cur === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(cur === k), onclick: () => { set(k); draw(); } }, l)));
  const draw = () => {
    mount(zone.icons, ICONS.map((i) => h('button', { type: 'button', class: st.icon === i ? 'on' : '', 'aria-label': `Chọn ${i}`, onclick: () => { st.icon = i; icon.value = i; draw(); } }, i)));
    mount(zone.colors, COLORS.map((c, i) => h('button', { type: 'button', class: st.color === c ? 'on' : '', style: `background:${c}`, role: 'radio', 'aria-checked': String(st.color === c), 'aria-label': `Màu ${i + 1}`, onclick: () => { st.color = c; draw(); } })));
    mount(zone.kind, auto ? null : [h('b', { class: 'small' }, 'Cách tính'), pick(st.kind, [['check', '✓ Làm là xong'], ['count', '🔢 Đếm số lần'], ['avoid', '🚫 Tránh làm']], (k) => { st.kind = k; }), st.kind === 'count' ? h('div', { class: 'bk-two' }, field('Mỗi ngày cần', target), field('Đơn vị', unit)) : null]);
    mount(zone.part, h('b', { class: 'small' }, 'Thời điểm'), pick(st.part, Object.entries(PARTS), (k) => { st.part = k; }));
    mount(zone.sched, h('b', { class: 'small' }, 'Lịch'), pick(st.mode, [['daily', 'Hằng ngày'], ['days', 'Một số thứ'], ['week', 'Số lần/tuần']], (k) => { st.mode = k; }),
      st.mode === 'days' ? h('div', { class: 'presets' }, [1, 2, 3, 4, 5, 6, 0].map((d) => h('button', { type: 'button', class: `chip${st.days.has(d) ? ' on' : ''}`, 'aria-pressed': String(st.days.has(d)), onclick: () => { if (st.days.has(d)) st.days.delete(d); else st.days.add(d); draw(); } }, d ? `T${d + 1}` : 'CN'))) : null,
      st.mode === 'week' ? pick(st.perWeek, [1, 2, 3, 4, 5, 6].map((n) => [n, `${n} lần`]), (n) => { st.perWeek = n; }) : null);
  };
  mount(body, h('form', { class: 'bk-form', novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const nm = name.value.trim(); if (!nm) { err.textContent = 'Đặt tên cho thói quen nhé.'; name.focus(); return; }
    if (st.mode === 'days' && !st.days.size) { err.textContent = 'Chọn ít nhất một thứ trong tuần.'; return; }
    const patch = { name: nm, icon: icon.value.trim() || '⭐', color: st.color, part: st.part, kind: auto ? (hb.kind ?? 'check') : st.kind, target: st.kind === 'count' ? Math.max(1, Number(target.value) || 1) : null, unit: st.kind === 'count' ? unit.value.trim() || 'lần' : null, days: st.mode === 'days' ? [...st.days] : null, perWeek: st.mode === 'week' ? st.perWeek : null };
    if (hb) await saveHabit(hb.id, patch); else await addHabit(patch);
    dlg.close(); toast(hb ? 'Đã lưu thói quen' : `🌱 Đã thêm “${nm}”`);
  } },
    h('div', { class: 'hb-nameline' }, icon, name), zone.icons, zone.colors, zone.kind, zone.part, zone.sched,
    auto ? h('p', { class: 'small' }, `ℹ️ ${hb.auto}. Bạn vẫn có thể tự tích tay.`) : null, err,
    h('div', { class: 'presets' }, h('button', { class: 'btn', type: 'submit' }, '💾 Lưu'),
      hb ? h('button', { class: 'chip', type: 'button', onclick: async () => { dlg.close(); await archiveHabit(hb.id); toast(`Đã ẩn “${hb.name}” (lịch sử vẫn giữ)`, { onAction: () => archiveHabit(hb.id, false) }); } }, '🙈 Ẩn thói quen này') : null)));
  draw(); if (!hb) name.focus();
  return builtin;
}

export function exerciseDialog(hb) {
  const { dlg, body } = sheet('🏃 Ghi vận động');
  mount(body, h('form', { class: 'bk-form', onsubmit: async (e) => { e.preventDefault(); const f = e.target.elements; const m = Number(f.m.value); if (!(m > 0)) return; await logExercise(f.k.value, m); dlg.close(); toast('💪 Đã ghi vận động'); notifyChange(); } },
    field('Bạn đã tập', h('select', { class: 'input', name: 'k' }, EXERCISES.map(([k, l]) => h('option', { value: k }, l)))), field('Số phút', h('input', { class: 'input', name: 'm', type: 'number', min: '1', max: '600', value: '20' })),
    h('div', { class: 'presets' }, h('button', { class: 'btn', type: 'submit' }, 'Ghi'), h('button', { class: 'chip', type: 'button', onclick: async () => { dlg.close(); await toggleDay(hb); } }, 'Chỉ tích, không ghi phút'))));
}
export function sleepDialog() {
  const { dlg, body } = sheet('😴 Ghi giấc ngủ');
  mount(body, h('form', { class: 'bk-form', onsubmit: async (e) => { e.preventDefault(); const f = e.target.elements; await logSleep(f.b.value, f.w.value); dlg.close(); toast('😴 Đã ghi giấc ngủ'); } },
    h('div', { class: 'bk-two' }, field('Đi ngủ', h('input', { class: 'input', name: 'b', type: 'time', value: '23:00', required: true })), field('Thức dậy', h('input', { class: 'input', name: 'w', type: 'time', value: '07:00', required: true }))), h('button', { class: 'btn', type: 'submit' }, 'Ghi')));
}
