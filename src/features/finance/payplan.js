// P42: Kế hoạch kỳ lương — tính theo kỳ từ ngày nhận lương đến trước kỳ lương sau (không theo tháng dương lịch).
// · Ngày lương dùng chung cài đặt 'finance'.payday (Wishlist/lịch sale cũng dùng).
// · Khoản cần chi: kind 'payplan' { name, amount, category, recurring, period (kỳ, nếu chỉ chi 1 lần), dueDay, paid: { [kỳ]: true } }.
// · Hóa đơn cố định (kind 'bill') tự hiện trong kỳ, không phải nhập lại.
// · Lương từng kỳ: budget.salary (mặc định) và budget.periodIncome[kỳ] (kỳ nào khác thì sửa riêng).
import { h } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { notifyChange, logEvent } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { makeKey, toDate, addDays, diffDays } from '../../core/dates.js';
import { parseAmount, CATEGORIES, catOf, fmtVND, fmtShort, listKind, saveItem, removeItem, addTx, monthOf, getFinanceSettings, saveFinanceSettings } from './money.js';
import { getBudget, saveBudget } from './plan.js';

const num = (v) => parseAmount(String(v))?.amount ?? (Number(v) || 0);
const dayIn = (y, m, d) => makeKey(y, m, Math.min(d, new Date(y, m, 0).getDate())); // ngày 31 → cuối tháng nếu tháng ngắn
const viDate = (k) => { const d = toDate(k); return `${d.getDate()}/${d.getMonth() + 1}`; };

// Kỳ lương thứ `offset` tính từ kỳ hiện tại: { key (ngày bắt đầu), start, end }.
export function payPeriod(payday, offset = 0, today = todayKey()) {
  const t = toDate(today);
  let y = t.getFullYear(); let m = t.getMonth() + 1;
  if (today < dayIn(y, m, payday)) { m -= 1; if (m < 1) { m = 12; y -= 1; } }
  m += offset;
  while (m > 12) { m -= 12; y += 1; }
  while (m < 1) { m += 12; y -= 1; }
  const start = dayIn(y, m, payday);
  const ny = m === 12 ? y + 1 : y; const nm = m === 12 ? 1 : m + 1;
  const end = addDays(dayIn(ny, nm, payday), -1);
  return { key: start, start, end };
}
// Ngày `d` (hằng tháng) rơi vào ngày nào trong kỳ.
export function dueInPeriod(p, d) {
  const s = toDate(p.start);
  const a = dayIn(s.getFullYear(), s.getMonth() + 1, d);
  if (a >= p.start && a <= p.end) return a;
  const e = toDate(p.end);
  return dayIn(e.getFullYear(), e.getMonth() + 1, d);
}

let offset = 0;
let addOpen = false;
const SUGGEST = [['Tiền nhà', 'home'], ['Điện nước', 'home'], ['Ăn uống', 'food'], ['Đi lại', 'transport'], ['Gửi bố mẹ', 'family'], ['Tiết kiệm', 'other'], ['Học IELTS', 'learning'], ['Trả nợ', 'bills']];

export async function payPlanCard() {
  const fs = await getFinanceSettings();
  const budget = await getBudget();
  const payday = fs.payday ?? 5;
  const today = todayKey();
  const p = payPeriod(payday, offset, today);
  const isNow = offset === 0; const isPast = offset < 0;
  const salary = budget.periodIncome?.[p.key] ?? budget.salary ?? budget.income ?? 0;

  const plans = (await listKind('payplan')).filter((x) => x.recurring || x.period === p.key);
  const bills = await listKind('bill');
  const rows = [
    ...plans.map((x) => ({ type: 'plan', item: x, name: x.name, amount: x.amount, category: x.category, recurring: x.recurring, due: x.dueDay ? dueInPeriod(p, x.dueDay) : null, paid: !!x.paid?.[p.key] })),
    ...bills.map((b) => { const due = dueInPeriod(p, b.dueDay); return { type: 'bill', item: b, name: b.name, amount: b.amount, category: b.category ?? 'bills', recurring: true, due, paid: b.lastPaid === monthOf(due) }; }),
  ].sort((a, b) => (a.due ?? '9') < (b.due ?? '9') ? -1 : 1);
  const planned = rows.reduce((s, r) => s + r.amount, 0);
  const paidSum = rows.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0);
  const left = salary - planned;

  // Chi tiêu thực tế trong kỳ (kỳ này / kỳ đã qua).
  const txs = offset <= 0 ? (await listKind('tx')).filter((t) => t.type === 'expense' && t.day >= p.start && t.day <= p.end) : [];
  const spent = txs.reduce((s, t) => s + t.amount, 0);
  const daysLeft = isNow ? diffDays(today, p.end) + 1 : 0;
  // Còn tiêu được = lương − đã chi thực tế − các khoản đã lên kế hoạch nhưng chưa chi.
  const free = salary - spent - (planned - paidSum);
  const perDay = isNow && daysLeft > 0 ? Math.max(0, Math.floor(free / daysLeft / 1000) * 1000) : null;

  const markPaid = async (r) => {
    if (r.type === 'bill') await saveItem({ ...r.item, lastPaid: monthOf(r.due) });
    else await saveItem({ ...r.item, paid: { ...(r.item.paid ?? {}), [p.key]: true } });
    await addTx({ type: 'expense', amount: r.amount, category: r.category ?? 'other', note: r.name, day: r.due && r.due <= today && r.due >= p.start ? r.due : today });
    if (r.type === 'bill') await logEvent('bill_paid', { onTime: !r.due || today <= r.due, day: today });
    toast(`✓ Đã chi ${fmtVND(r.amount)} · ${r.name} (đã ghi vào Thu chi)`);
  };
  const unpay = async (r) => {
    if (r.type !== 'plan') return;
    const paid = { ...(r.item.paid ?? {}) }; delete paid[p.key];
    await saveItem({ ...r.item, paid });
    toast('Đã bỏ đánh dấu (khoản ghi trong Thu chi vẫn giữ, xóa ở đó nếu cần)');
  };
  const remove = async (r) => {
    if (r.type === 'bill') { toast('Khoản này là Hóa đơn cố định — xóa ở mục bên dưới nhé'); return; }
    if (!confirm(r.recurring ? `Xóa "${r.name}" khỏi MỌI kỳ lương?` : `Xóa "${r.name}"?`)) return;
    await removeItem(r.item.id);
  };

  const err = h('p', { class: 'form-err', role: 'alert' });
  const field = (label, input) => h('label', { class: 'debt-field' }, h('span', {}, label), input);
  const nameInput = h('input', { class: 'input', name: 'name', placeholder: 'VD: Tiền nhà', autocomplete: 'off' });
  const catSelect = h('select', { class: 'input', name: 'cat', 'aria-label': 'Danh mục' }, CATEGORIES.expense.map(([id, l]) => h('option', { value: id, selected: id === 'home' }, l)));

  return h('section', { class: 'card payplan' },
    h('div', { class: 'card-head' }, h('h3', {}, '💰 Kế hoạch kỳ lương')),
    h('div', { class: 'debt-grid' },
      field('Ngày nhận lương (hằng tháng)', h('input', {
        class: 'input', name: 'payday', inputmode: 'numeric', value: String(payday), autocomplete: 'off',
        onchange: async (e) => { const d = Number(String(e.target.value).match(/\d{1,2}/)?.[0]); if (!(d >= 1 && d <= 31)) { toast('Ngày lương từ 1 đến 31'); return; } offset = 0; await saveFinanceSettings({ ...fs, payday: d }); toast(`Đã đặt ngày lương: ngày ${d} hằng tháng`); },
      })),
      field('Lương mỗi kỳ', h('input', {
        class: 'input', name: 'salary', inputmode: 'text', value: budget.salary ? fmtShort(budget.salary) : (budget.income ? fmtShort(budget.income) : ''), placeholder: 'VD: 15tr', autocomplete: 'off',
        onchange: async (e) => { const v = num(e.target.value); await saveBudget({ ...budget, salary: v || null, income: v || budget.income }); toast(v ? `Lương mỗi kỳ: ${fmtVND(v)}` : 'Đã xóa số lương'); },
      }))),

    h('div', { class: 'period-nav', role: 'group', 'aria-label': 'Chọn kỳ lương' },
      h('button', { class: 'chip', 'aria-label': 'Kỳ trước', disabled: offset <= -6, onclick: () => { offset -= 1; notifyChange(); } }, '‹'),
      h('div', { class: 'period-label' },
        h('b', {}, isNow ? 'Kỳ này' : offset === 1 ? 'Kỳ tới' : isPast ? `${-offset} kỳ trước` : `${offset} kỳ nữa`),
        h('span', { class: 'small' }, `${viDate(p.start)} – ${viDate(p.end)}/${toDate(p.end).getFullYear()}`)),
      h('button', { class: 'chip', 'aria-label': 'Kỳ sau', disabled: offset >= 12, onclick: () => { offset += 1; notifyChange(); } }, '›'),
      !isNow ? h('button', { class: 'chip', onclick: () => { offset = 0; notifyChange(); } }, 'Về kỳ này') : null),

    h('div', { class: 'pp-tiles' },
      h('div', { class: 'pp-tile' }, h('span', {}, 'Lương kỳ này'), h('b', {}, salary ? fmtShort(salary) : '—'),
        h('button', { class: 'link-btn small', onclick: async () => {
          const v = prompt(`Lương kỳ ${viDate(p.start)} – ${viDate(p.end)} (để trống = dùng số mặc định)`, budget.periodIncome?.[p.key] ? fmtShort(budget.periodIncome[p.key]) : '');
          if (v == null) return;
          const pi = { ...(budget.periodIncome ?? {}) };
          if (v.trim()) pi[p.key] = num(v); else delete pi[p.key];
          await saveBudget({ ...budget, periodIncome: pi });
        } }, budget.periodIncome?.[p.key] ? '✎ (riêng kỳ này)' : '✎ kỳ này khác?')),
      h('div', { class: 'pp-tile' }, h('span', {}, 'Cần chi'), h('b', {}, fmtShort(planned)), h('small', {}, `${rows.filter((r) => r.paid).length}/${rows.length} khoản đã chi`)),
      h('div', { class: `pp-tile ${left < 0 ? 'neg' : 'pos'}` }, h('span', {}, left < 0 ? 'Thiếu' : 'Còn dư sau kế hoạch'), h('b', {}, fmtShort(Math.abs(left))),
        h('small', {}, salary ? `${Math.round((planned / salary) * 100)}% lương đã có chỗ` : 'Nhập lương để tính')),
      isNow ? h('div', { class: 'pp-tile' }, h('span', {}, 'Mỗi ngày tiêu được'), h('b', {}, perDay != null ? fmtShort(perDay) : '—'), h('small', {}, `còn ${daysLeft} ngày · đã chi ${fmtShort(spent)}`))
        : isPast ? h('div', { class: 'pp-tile' }, h('span', {}, 'Đã chi thực tế'), h('b', {}, fmtShort(spent)), h('small', {}, spent > salary && salary ? 'vượt lương' : 'trong kỳ')) : null),
    salary && planned ? h('div', { class: 'pp-bar', role: 'img', 'aria-label': `Kế hoạch dùng ${Math.round((planned / salary) * 100)}% lương` },
      h('span', { class: 'pp-paid', style: `width:${Math.min(100, (paidSum / salary) * 100)}%` }),
      h('span', { class: 'pp-plan', style: `width:${Math.max(0, Math.min(100, ((planned - paidSum) / salary) * 100))}%` })) : null,

    rows.length ? h('ul', { class: 'log-list pp-list' }, rows.map((r) => h('li', { class: r.paid ? 'past' : '' },
      h('div', { class: 'grow' },
        h('b', {}, `${catOf('expense', r.category)[1].split(' ')[0]} ${r.name}`),
        h('div', { class: 'muted small' }, [
          r.due ? `ngày ${viDate(r.due)}` : 'trong kỳ',
          r.type === 'bill' ? 'hóa đơn cố định' : r.recurring ? 'lặp lại mỗi kỳ' : 'chỉ kỳ này',
        ].join(' · '))),
      h('span', { class: 'money' }, fmtVND(r.amount)),
      r.paid ? h('button', { class: 'meta-chip', title: 'Bấm để bỏ đánh dấu', onclick: () => unpay(r) }, '✓ Đã chi')
        : offset <= 0 ? h('button', { class: `chip${isNow && r.due && r.due <= addDays(today, 3) ? ' on' : ''}`, onclick: () => markPaid(r) }, 'Đã chi') : null,
      h('button', { class: 'icon-btn', 'aria-label': `Xóa ${r.name}`, onclick: () => remove(r) }, '✕'))))
      : h('div', {},
        h('p', { class: 'muted small' }, 'Chưa có khoản nào. Chạm gợi ý để thêm nhanh:'),
        h('div', { class: 'presets' }, SUGGEST.map(([n, c]) => h('button', { class: 'chip', type: 'button', onclick: () => { addOpen = true; nameInput.value = n; catSelect.value = c; document.querySelector('.pp-form')?.setAttribute('open', ''); nameInput.closest('form')?.elements.amount.focus(); } }, n)))),

    h('details', { class: 'pp-form', open: addOpen || !rows.length, ontoggle: (e) => { addOpen = e.target.open; } },
      h('summary', {}, `+ Thêm khoản cần chi (${isNow ? 'kỳ này' : `kỳ ${viDate(p.start)}`})`),
      h('form', {
        class: 'debt-form', novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const name = f.name.value.trim(); const amount = num(f.amount.value);
          if (!name) { err.textContent = 'Nhập tên khoản chi (vd: Tiền nhà, Ăn uống).'; f.name.focus(); return; }
          if (!amount) { err.textContent = 'Nhập số tiền, vd: 4tr, 500k, 2.000.000.'; f.amount.focus(); return; }
          const d = Number(String(f.due.value).match(/\d{1,2}/)?.[0]);
          const recurring = f.rec.checked; const category = f.cat.value;
          e.target.reset(); document.activeElement?.blur?.();
          await saveItem({ kind: 'payplan', name, amount, category, recurring, period: recurring ? null : p.key, dueDay: d >= 1 && d <= 31 ? d : null, paid: {} });
          toast(recurring ? `Đã thêm "${name}" vào mọi kỳ lương` : `Đã thêm "${name}" cho kỳ ${viDate(p.start)} – ${viDate(p.end)}`);
        },
      },
        h('div', { class: 'debt-grid' },
          field('Tên khoản chi *', nameInput),
          field('Số tiền *', h('input', { class: 'input', name: 'amount', placeholder: 'VD: 4tr, 500k', inputmode: 'text', autocomplete: 'off' })),
          field('Danh mục', catSelect),
          field('Ngày chi (tùy chọn)', h('input', { class: 'input', name: 'due', placeholder: 'VD: 15', inputmode: 'numeric', autocomplete: 'off' }))),
        h('label', { class: 'field-inline' }, h('input', { type: 'checkbox', name: 'rec', checked: true }), 'Lặp lại mỗi kỳ lương (bỏ chọn = chỉ kỳ đang xem)'),
        err,
        h('button', { class: 'btn', type: 'submit' }, '+ Thêm vào kế hoạch'))),
    h('p', { class: 'muted small' }, 'Bấm “Đã chi” để ghi luôn vào Thu chi. Xem kỳ tới bằng nút ›, thêm khoản “chỉ kỳ này” cho các chi tiêu riêng (đám cưới, du lịch…).'));
}
