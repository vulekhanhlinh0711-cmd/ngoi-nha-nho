// P5: các màn Tài chính — Thu chi · Ngân sách · Tiết kiệm & nợ · Wishlist · Báo cáo.
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange, logEvent, queryEvents } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { toDate, WEEKDAY_NAMES } from '../../core/dates.js';
import { isLocked, lockScreen } from '../../core/lock.js';
import { savePhoto, photoUrl } from '../../core/photos.js';
import {
  parseTx, parseAmount, CATEGORIES, catOf, fmtVND, fmtShort, listKind, saveItem, removeItem, addTx,
  monthOf, txInMonth, getFinanceSettings, saveFinanceSettings,
} from './money.js';
import {
  METHODS, getBudget, saveBudget, bucketsOf, spendByBucket, level, goalPlan, simulateDebts, monthLabel,
  saleCalendar, waitLeftHours, daysUntil,
} from './plan.js';
import { fakeDiscount } from '../econ/market.js';

const head = (active, title) => h('div', { class: 'view-head' }, subnav('finance', active), h('h2', {}, title));
const money = (n, cls = '') => h('span', { class: `money ${cls}` }, fmtVND(n));
const dayName = (d) => { const t = toDate(d); return `${WEEKDAY_NAMES[t.getDay()]} ${t.getDate()}/${t.getMonth() + 1}`; };
const thisMonth = () => monthOf(todayKey());
function prevMonth(m) { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
const num = (v) => parseAmount(String(v))?.amount ?? (Number(v) || 0);

async function guard(root, active, title) {
  if (!(await isLocked('finance'))) return false;
  mount(root, head(active, title), lockScreen('finance', 'Tài chính đang khóa', notifyChange));
  return true;
}

// ---------- Thu chi (P5.02, P5.03, P5.12) ----------
let pendingPhoto = null;
let catOverride = null;

export async function renderMoney(root) {
  if (await guard(root, 'money', 'Thu chi')) return;
  const month = thisMonth();
  const txs = (await txInMonth(month)).sort((a, b) => (a.day === b.day ? b.id - a.id : a.day < b.day ? 1 : -1));
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const today = todayKey();
  const spentToday = txs.some((t) => t.day === today && t.type === 'expense');
  const noSpendClaimed = (await queryEvents('no_spend_day')).some((e) => e.day === today);

  const preview = h('div', { class: 'tx-preview muted small' });
  const catSelect = h('select', { class: 'input', 'aria-label': 'Danh mục', onchange: (e) => { catOverride = e.target.value || null; } });
  const input = h('input', {
    class: 'input', placeholder: 'Gõ nhanh: “cà phê 45k”, “lương 15tr”, “grab 32k”', 'aria-label': 'Ghi thu chi',
    oninput: () => {
      const p = parseTx(input.value);
      catOverride = null;
      if (!p) { preview.textContent = input.value.trim() ? 'Chưa thấy số tiền (ví dụ 45k, 1tr2, 200 nghìn)' : ''; catSelect.replaceChildren(); return; }
      preview.textContent = `${p.type === 'income' ? '➕ Thu' : '➖ Chi'} ${fmtVND(p.amount)} · ${p.note || 'không ghi chú'}`;
      catSelect.replaceChildren(...CATEGORIES[p.type].map(([id, label]) => h('option', { value: id, selected: id === p.category }, label)));
    },
  });
  const photoInput = h('input', {
    type: 'file', accept: 'image/*', capture: 'environment', hidden: true,
    onchange: (e) => { pendingPhoto = e.target.files[0] ?? null; toast(pendingPhoto ? 'Đã đính kèm ảnh hóa đơn' : 'Đã bỏ ảnh'); },
  });

  const groups = new Map();
  for (const t of txs) groups.set(t.day, [...(groups.get(t.day) ?? []), t]);
  const rows = await Promise.all([...groups].map(async ([day, list]) => h('section', { class: 'tx-day' },
    h('h4', {}, dayName(day)),
    h('ul', { class: 'log-list' }, await Promise.all(list.map(async (t) => {
      const url = t.photoId ? await photoUrl(t.photoId) : null;
      return h('li', {},
        h('span', {}, catOf(t.type, t.category)[1].split(' ')[0]),
        h('span', { class: 'grow' }, t.note || catOf(t.type, t.category)[1].slice(2),
          url ? h('a', { href: url, target: '_blank', class: 'small', rel: 'noopener' }, ' 🧾') : null),
        money(t.type === 'income' ? t.amount : -t.amount, t.type),
        h('button', { class: 'icon-btn', 'aria-label': 'Xóa khoản này', onclick: () => removeItem(t.id) }, '✕'));
    }))))));

  const incomeByCat = CATEGORIES.income.map(([id, label]) => [label, txs.filter((t) => t.type === 'income' && t.category === id).reduce((s, t) => s + t.amount, 0)]).filter(([, v]) => v);

  mount(root,
    head('money', 'Thu chi'),
    h('section', { class: 'card' },
      h('form', {
        class: 'inline-form', onsubmit: async (e) => {
          e.preventDefault();
          const p = parseTx(input.value);
          if (!p) { toast('Thêm số tiền nhé, ví dụ “cà phê 45k”'); return; }
          input.value = '';
          const photoId = pendingPhoto ? await savePhoto(pendingPhoto) : null;
          pendingPhoto = null;
          await addTx({ ...p, category: catOverride ?? p.category, photoId });
          catOverride = null;
          toast(`${p.type === 'income' ? 'Đã ghi khoản thu' : 'Đã ghi khoản chi'} ${fmtVND(p.amount)}`);
        },
      }, input, h('label', { class: 'chip file-btn', title: 'Đính kèm ảnh hóa đơn' }, '🧾', photoInput), h('button', { class: 'btn', type: 'submit' }, 'Ghi')),
      h('div', { class: 'form-row' }, preview, catSelect),
      h('div', { class: 'presets' }, h('span', { class: 'meta-text' }, 'Nguồn thu:'),
        ['lương ', 'thưởng ', 'làm thêm '].map((w) => h('button', { class: 'chip', type: 'button', onclick: () => { input.value = w; input.focus(); input.dispatchEvent(new Event('input')); } }, `+ ${w.trim()}`)))),
    h('section', { class: 'card' },
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', { class: 'money income' }, fmtVND(income)), h('span', {}, 'thu tháng này')),
        h('div', { class: 'stat' }, h('b', { class: 'money' }, fmtVND(expense)), h('span', {}, 'chi tháng này')),
        h('div', { class: 'stat' }, h('b', { class: 'money' }, fmtVND(income - expense)), h('span', {}, 'còn lại'))),
      incomeByCat.length ? h('p', { class: 'muted small' }, incomeByCat.map(([l, v]) => `${l}: ${fmtShort(v)}`).join(' · ')) : null),
    !spentToday ? h('section', { class: 'card gentle-ok' },
      noSpendClaimed
        ? h('p', {}, '🌿 Hôm nay là một ngày không chi tiêu. Giỏi lắm!')
        : [h('p', {}, 'Hôm nay chưa có khoản chi nào.'), h('button', {
            class: 'chip', onclick: async () => { await logEvent('no_spend_day', { day: today }); toast('🌿 Một ngày không chi tiêu: +10 xu'); notifyChange(); },
          }, '🌿 Hôm nay mình không chi tiêu')]) : null,
    h('section', { class: 'entries' }, rows.length ? rows : h('p', { class: 'muted small' }, 'Tháng này chưa ghi khoản nào.')),
    h('p', { class: 'muted small' }, 'Tiền thật hiển thị bằng “đ” màu xanh; xu trong game là 🪙 màu vàng — hai thứ hoàn toàn tách biệt.'));
}

// ---------- Ngân sách + hóa đơn (P5.04, P5.05) ----------
export async function renderBudget(root) {
  if (await guard(root, 'budget', 'Ngân sách')) return;
  const budget = await getBudget();
  const month = thisMonth();
  const txs = await txInMonth(month);
  const rows = spendByBucket(budget, txs);
  const bills = (await listKind('bill')).sort((a, b) => a.dueDay - b.dueDay);
  const day = new Date().getDate();

  mount(root,
    head('budget', 'Ngân sách'),
    h('section', { class: 'card' },
      h('div', { class: 'form-row' },
        h('label', { class: 'field-inline' }, 'Cách chia',
          h('select', { class: 'input', onchange: (e) => saveBudget({ ...budget, method: e.target.value }) },
            [['jars', METHODS.jars.name], ['503020', METHODS['503020'].name], ['custom', 'Tự đặt tỷ lệ']].map(([v, l]) => h('option', { value: v, selected: budget.method === v }, l)))),
        h('label', { class: 'field-inline' }, 'Thu nhập dự kiến/tháng',
          h('input', {
            class: 'input', value: budget.income ? fmtShort(budget.income) : '', placeholder: 'tự lấy từ khoản thu', 'aria-label': 'Thu nhập dự kiến',
            onchange: (e) => saveBudget({ ...budget, income: e.target.value.trim() ? num(e.target.value) : null }),
          }))),
      budget.method === 'custom' ? h('div', { class: 'form-row' }, bucketsOf(budget).map(([id, name, pct]) => h('label', { class: 'field-inline' }, name,
        h('input', { class: 'input num', type: 'number', min: '0', max: '100', value: pct, onchange: (e) => saveBudget({ ...budget, custom: { ...Object.fromEntries(bucketsOf(budget).map(([i, , p]) => [i, p])), [id]: Number(e.target.value) } }) }), '%'))) : null,
      budget.method === 'custom' ? h('p', { class: 'muted small' }, `Tổng: ${bucketsOf(budget).reduce((s, b) => s + b[2], 0)}%`) : null,
      h('ul', { class: 'budget-list' }, rows.map((b) => h('li', { class: `lv-${b.savingJar ? 'save' : level(b.ratio)}` },
        h('div', { class: 'budget-top' }, h('b', {}, b.name), h('span', { class: 'muted small' }, `${b.pct}%`),
          h('span', { class: 'grow' }),
          b.savingJar ? h('span', { class: 'small' }, `Nên để dành ${fmtVND(b.limit)}`) : h('span', { class: 'small' }, `${fmtShort(b.used)} / ${fmtShort(b.limit)}`)),
        b.savingJar ? null : h('div', { class: 'progress budget-bar', role: 'progressbar', 'aria-valuenow': Math.round(b.ratio * 100), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': b.name },
          h('span', { style: `width:${Math.min(100, b.ratio * 100)}%` })),
        !b.savingJar && b.ratio >= 1 ? h('p', { class: 'small' }, '⚠️ Đã dùng hết phần này. Không sao, tháng sau điều chỉnh nhé.') : null,
        !b.savingJar && b.ratio >= 0.8 && b.ratio < 1 ? h('p', { class: 'small' }, 'Sắp chạm giới hạn.') : null))),
      !budget.income && !txs.some((t) => t.type === 'income') ? h('p', { class: 'muted small' }, 'Ghi khoản lương tháng này hoặc nhập thu nhập dự kiến để chia ngân sách.') : null),
    h('section', { class: 'card' },
      h('h3', {}, '🧾 Hóa đơn cố định'),
      bills.length ? h('ul', { class: 'log-list' }, bills.map((b) => {
        const paid = b.lastPaid === month;
        const late = !paid && day > b.dueDay;
        const soon = !paid && !late && b.dueDay - day <= 3;
        return h('li', { class: paid ? 'past' : '' },
          h('span', { class: 'grow' }, b.name, h('span', { class: 'muted small' }, ` · ngày ${b.dueDay} hằng tháng`)),
          money(b.amount),
          paid ? h('span', { class: 'meta-chip' }, '✓ Đã trả') : h('button', {
            class: `chip${soon || late ? ' on' : ''}`, onclick: async () => {
              await saveItem({ ...b, lastPaid: month });
              await addTx({ type: 'expense', amount: b.amount, category: b.category ?? 'bills', note: b.name });
              await logEvent('bill_paid', { onTime: !late, day: todayKey() });
              toast(late ? 'Đã trả. Lần sau mình nhắc sớm hơn nhé.' : '✓ Trả đúng hạn: +10 xu');
            },
          }, late ? 'Quá hạn · Trả' : soon ? 'Sắp đến hạn · Trả' : 'Đánh dấu đã trả'),
          h('button', { class: 'icon-btn', 'aria-label': `Xóa ${b.name}`, onclick: () => removeItem(b.id) }, '✕'));
      })) : h('p', { class: 'muted small' }, 'Thêm tiền nhà, điện nước, internet, trả góp… để được nhắc trước hạn 3 ngày.'),
      h('form', {
        class: 'form-row', onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const amount = num(f.amount.value);
          const dueDay = Number(f.due.value);
          if (!f.name.value.trim() || !amount || !(dueDay >= 1 && dueDay <= 31)) { toast('Điền tên, số tiền và ngày đến hạn (1–31)'); return; }
          await saveItem({ kind: 'bill', name: f.name.value.trim(), amount, dueDay, category: f.cat.value });
          e.target.reset();
        },
      },
        h('input', { class: 'input', name: 'name', placeholder: 'Tên (tiền nhà…)', 'aria-label': 'Tên hóa đơn' }),
        h('input', { class: 'input num', name: 'amount', placeholder: '4tr', 'aria-label': 'Số tiền' }),
        h('label', { class: 'field-inline' }, 'ngày', h('input', { class: 'input num', name: 'due', type: 'number', min: '1', max: '31', placeholder: '5', 'aria-label': 'Ngày đến hạn' })),
        h('select', { class: 'input', name: 'cat', 'aria-label': 'Danh mục' }, CATEGORIES.expense.map(([id, l]) => h('option', { value: id, selected: id === 'bills' }, l))),
        h('button', { class: 'chip', type: 'submit' }, '+ Thêm'))));
}

// ---------- Tiết kiệm & nợ (P5.06, P5.07) ----------
let extraPay = 0;
export async function renderSaving(root) {
  if (await guard(root, 'saving', 'Tiết kiệm & nợ')) return;
  const goals = await listKind('goal');
  const debts = await listKind('debt');
  const sb = debts.length ? simulateDebts(debts, extraPay, 'snowball') : null;
  const av = debts.length ? simulateDebts(debts, extraPay, 'avalanche') : null;
  const plan = (r, label, note) => h('div', { class: 'plan-col' },
    h('h4', {}, label), h('p', { class: 'muted small' }, note),
    r.months == null ? h('p', {}, 'Với mức trả hiện tại, nợ không giảm được. Tăng khoản trả thêm nhé.') : [
      h('p', {}, h('b', {}, `${r.months} tháng`), ` · hết nợ khoảng ${monthLabel(r.months)}`),
      h('p', { class: 'small' }, 'Tổng lãi: ', money(r.interest)),
      h('ol', { class: 'payoff' }, [...r.order].sort((a, b) => a.paidOff - b.paidOff).map((o) => h('li', {},
        h('span', { class: 'grow' }, o.name),
        h('span', { class: 'payoff-bar', style: `width:${(o.paidOff / r.months) * 100}%`, title: `Trả xong tháng thứ ${o.paidOff}` }),
        h('span', { class: 'small' }, monthLabel(o.paidOff))))),
    ]);

  mount(root,
    head('saving', 'Tiết kiệm & nợ'),
    h('section', { class: 'card' },
      h('h3', {}, '🐷 Mục tiêu tiết kiệm'),
      goals.length ? h('ul', { class: 'goal-list' }, goals.map((g) => {
        const p = goalPlan(g);
        return h('li', {},
          h('div', { class: 'piggy', style: `--fill:${Math.round(p.pct * 100)}%`, role: 'img', 'aria-label': `Heo đất ${Math.round(p.pct * 100)}%` }, '🐷'),
          h('div', { class: 'grow' },
            h('b', {}, g.name), h('p', { class: 'small' }, money(p.saved), ' / ', money(g.target), ` (${Math.round(p.pct * 100)}%)`),
            h('div', { class: 'progress' }, h('span', { style: `width:${p.pct * 100}%` })),
            p.left === 0 ? h('p', { class: 'small' }, '🎉 Đã đủ rồi!')
              : p.perMonth ? h('p', { class: 'muted small' }, `Cần để dành khoảng ${fmtVND(p.perMonth)}/tháng trong ${p.months} tháng (hạn ${toDate(g.deadline).toLocaleDateString('vi-VN')})`) : null,
            h('form', {
              class: 'inline-form', onsubmit: async (e) => {
                e.preventDefault();
                const a = num(e.target.elements.a.value);
                if (!a) return;
                await saveItem({ ...g, history: [...(g.history ?? []), { day: todayKey(), amount: a }] });
                await logEvent('saving_deposit', { day: todayKey() });
                toast(`🐷 Heo đất đã được cho ăn ${fmtVND(a)}`);
              },
            }, h('input', { class: 'input num', name: 'a', placeholder: '500k', 'aria-label': `Bỏ heo cho ${g.name}` }), h('button', { class: 'chip', type: 'submit' }, '+ Bỏ heo'))),
          h('button', { class: 'icon-btn', 'aria-label': `Xóa mục tiêu ${g.name}`, onclick: () => confirm('Xóa mục tiêu này?') && removeItem(g.id) }, '✕'));
      })) : h('p', { class: 'muted small' }, 'Ví dụ: “Quỹ khẩn cấp 30tr trước 12/2027”.'),
      h('form', {
        class: 'form-row', onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const target = num(f.target.value);
          if (!f.name.value.trim() || !target) return;
          await saveItem({ kind: 'goal', name: f.name.value.trim(), target, deadline: f.deadline.value || null, history: [] });
          e.target.reset();
        },
      },
        h('input', { class: 'input', name: 'name', placeholder: 'Tên mục tiêu', 'aria-label': 'Tên mục tiêu' }),
        h('input', { class: 'input num', name: 'target', placeholder: '30tr', 'aria-label': 'Số tiền mục tiêu' }),
        h('label', { class: 'field-inline' }, 'hạn', h('input', { class: 'input', name: 'deadline', type: 'date', 'aria-label': 'Hạn' })),
        h('button', { class: 'chip', type: 'submit' }, '+ Thêm'))),
    h('section', { class: 'card' },
      h('h3', {}, '💳 Danh sách nợ'),
      debts.length ? h('ul', { class: 'log-list' }, debts.map((d) => h('li', {},
        h('span', { class: 'grow' }, d.name, h('span', { class: 'muted small' }, ` · lãi ${d.rate}%/năm · trả tối thiểu ${fmtShort(d.minPay)}/tháng${d.dueDay ? ` · ngày ${d.dueDay}` : ''}`)),
        money(d.balance),
        h('form', {
          class: 'inline-form', onsubmit: async (e) => {
            e.preventDefault();
            const a = num(e.target.elements.a.value);
            if (!a) return;
            await saveItem({ ...d, balance: Math.max(0, d.balance - a) });
            await addTx({ type: 'expense', amount: a, category: 'bills', note: `Trả nợ ${d.name}` });
          },
        }, h('input', { class: 'input num', name: 'a', placeholder: 'đã trả', 'aria-label': `Đã trả ${d.name}` }), h('button', { class: 'chip', type: 'submit' }, 'Trả')),
        h('button', { class: 'icon-btn', 'aria-label': `Xóa ${d.name}`, onclick: () => confirm('Xóa khoản nợ này?') && removeItem(d.id) }, '✕')))) : h('p', { class: 'muted small' }, 'Chưa có khoản nợ nào. Tuyệt!'),
      h('form', {
        class: 'form-row', onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const balance = num(f.bal.value), minPay = num(f.min.value);
          if (!f.name.value.trim() || !balance || !minPay) { toast('Điền tên, số còn nợ và số trả mỗi tháng'); return; }
          await saveItem({ kind: 'debt', name: f.name.value.trim(), balance, rate: Number(f.rate.value) || 0, minPay, dueDay: Number(f.due.value) || null });
          e.target.reset();
        },
      },
        h('input', { class: 'input', name: 'name', placeholder: 'Tên khoản nợ', 'aria-label': 'Tên khoản nợ' }),
        h('input', { class: 'input num', name: 'bal', placeholder: 'còn nợ', 'aria-label': 'Số còn nợ' }),
        h('label', { class: 'field-inline' }, h('input', { class: 'input num', name: 'rate', type: 'number', step: '0.1', min: '0', placeholder: 'lãi', 'aria-label': 'Lãi suất %/năm' }), '%/năm'),
        h('input', { class: 'input num', name: 'min', placeholder: 'trả/tháng', 'aria-label': 'Trả tối thiểu mỗi tháng' }),
        h('input', { class: 'input num', name: 'due', type: 'number', min: '1', max: '31', placeholder: 'ngày', 'aria-label': 'Ngày đến hạn' }),
        h('button', { class: 'chip', type: 'submit' }, '+ Thêm')),
      debts.length ? [
        h('label', { class: 'field-inline' }, 'Mỗi tháng trả thêm',
          h('input', { class: 'input num', value: extraPay ? fmtShort(extraPay) : '', placeholder: '0', 'aria-label': 'Trả thêm mỗi tháng', onchange: (e) => { extraPay = num(e.target.value); notifyChange(); } })),
        h('div', { class: 'plan-compare' },
          plan(sb, '❄️ Quả cầu tuyết', 'Trả khoản nhỏ nhất trước — nhanh thấy kết quả, có động lực.'),
          plan(av, '🔥 Lãi cao trước', 'Trả khoản lãi cao nhất trước — tốn ít tiền lãi nhất.')),
        sb.months && av.months ? h('p', { class: 'insight' }, av.interest < sb.interest
          ? `“Lãi cao trước” tiết kiệm được ${fmtVND(sb.interest - av.interest)} tiền lãi. “Quả cầu tuyết” giúp xóa khoản đầu tiên sớm hơn. Chọn cách nào bạn giữ được lâu dài nhé.`
          : 'Hai cách cho kết quả gần như nhau với các khoản nợ hiện tại.') : null,
      ] : null));
}

// ---------- Wishlist + lịch sale (P5.08–P5.10) ----------
export async function renderWishlist(root) {
  if (await guard(root, 'wishlist', 'Wishlist')) return;
  const wishes = (await listKind('wish')).sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
  const fs = await getFinanceSettings();
  const budget = await getBudget();
  const shopping = spendByBucket(budget, await txInMonth(thisMonth())).find((b) => b.cats.includes('shopping'));
  const shopLeft = shopping ? Math.max(0, shopping.limit - shopping.used) : null;
  const sales = saleCalendar(fs.payday);

  mount(root,
    head('wishlist', 'Wishlist'),
    h('section', { class: 'card' },
      h('h3', {}, '➕ Thêm món muốn mua'),
      h('form', {
        class: 'form-row', onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const price = num(f.price.value);
          if (!f.name.value.trim() || !price) { toast('Điền tên và giá hiện tại'); return; }
          let link = f.link.value.trim();
          if (link && !/^https?:\/\//.test(link)) link = '';
          await saveItem({ kind: 'wish', name: f.name.value.trim(), link, target: num(f.target.value) || null, urgent: f.urgent.checked, addedAt: new Date().toISOString(), prices: [{ day: todayKey(), price }] });
          e.target.reset();
        },
      },
        h('input', { class: 'input', name: 'name', placeholder: 'Tên món', 'aria-label': 'Tên món' }),
        h('input', { class: 'input', name: 'link', type: 'url', placeholder: 'Link sản phẩm (tùy chọn)', 'aria-label': 'Link sản phẩm' }),
        h('input', { class: 'input num', name: 'price', placeholder: 'giá nay', 'aria-label': 'Giá hiện tại' }),
        h('input', { class: 'input num', name: 'target', placeholder: 'giá muốn', 'aria-label': 'Giá mục tiêu' }),
        h('label', { class: 'field-inline' }, h('input', { type: 'checkbox', name: 'urgent' }), 'Cần gấp'),
        h('button', { class: 'chip', type: 'submit' }, '+ Thêm')),
      h('p', { class: 'muted small' }, 'Shopee/Lazada không cho lấy giá tự động, nên mỗi lần xem giá bạn nhập lại một lần để app ghi lịch sử giá.')),
    wishes.length ? h('section', { class: 'entries' }, wishes.map((w) => {
      const last = w.prices.at(-1).price;
      const low = Math.min(...w.prices.map((p) => p.price));
      const hit = w.target && last <= w.target;
      const wait = waitLeftHours(w);
      const ratio = shopLeft ? last / shopLeft : null;
      const fake = fakeDiscount(w.prices);
      return h('article', { class: `entry wish${hit ? ' hit' : ''}` },
        h('header', { class: 'entry-head' },
          h('b', {}, w.link ? h('a', { href: w.link, target: '_blank', rel: 'noopener noreferrer' }, w.name) : w.name),
          hit ? h('span', { class: 'meta-chip important' }, '🎯 Đã đạt giá mong muốn') : null,
          h('span', { class: 'grow' }),
          h('button', { class: 'icon-btn', 'aria-label': `Xóa ${w.name}`, onclick: () => removeItem(w.id) }, '✕')),
        h('p', {}, 'Giá hiện tại ', money(last), w.target ? [' · muốn ', money(w.target)] : '', ' · thấp nhất ', money(low)),
        w.prices.length > 1 ? h('p', { class: 'muted small' }, 'Lịch sử: ', w.prices.map((p) => `${toDate(p.day).getDate()}/${toDate(p.day).getMonth() + 1} ${fmtShort(p.price)}`).join(' → '),
          last > low ? ' · đang cao hơn mức thấp nhất từng thấy' : '') : null,
        fake ? h('p', { class: 'small wait' }, `⚠️ Có dấu hiệu “nâng giá rồi giảm”: giá đã lên ${fmtShort(fake.peak)} rồi “giảm ${fake.claimed}%” về ${fmtShort(fake.last)}, gần bằng giá ${fmtShort(fake.baseline)} trước khi tăng.`) : null,
        ratio != null ? h('p', { class: 'small' }, `Bằng ${Math.round(ratio * 100)}% phần ngân sách mua sắm còn lại tháng này (${fmtVND(shopLeft)}).`) : null,
        wait ? h('p', { class: 'small wait' }, `⏳ Món không gấp: chờ thêm ${wait} giờ rồi quyết định nhé. Nếu vẫn muốn thì mua!`) : null,
        h('div', { class: 'presets' },
          h('form', {
            class: 'inline-form', onsubmit: async (e) => {
              e.preventDefault();
              const p = num(e.target.elements.p.value);
              if (!p) return;
              await saveItem({ ...w, prices: [...w.prices, { day: todayKey(), price: p }] });
              if (w.target && p <= w.target) toast(`🎯 ${w.name} đã về giá mong muốn!`);
            },
          }, h('input', { class: 'input num', name: 'p', placeholder: 'giá mới', 'aria-label': `Giá mới của ${w.name}` }), h('button', { class: 'chip', type: 'submit' }, 'Cập nhật giá')),
          h('button', {
            class: 'chip', onclick: async () => {
              if (wait && !confirm(`Còn ${wait} giờ nữa mới hết thời gian chờ. Vẫn mua bây giờ?`)) return;
              await addTx({ type: 'expense', amount: last, category: 'shopping', note: w.name });
              await removeItem(w.id);
              toast('Đã ghi khoản mua sắm');
            },
          }, '🛍️ Đã mua')));
    })) : null,
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', {}, '📅 Lịch sale sắp tới'),
        h('label', { class: 'field-inline' }, 'Ngày lương', h('input', { class: 'input num', type: 'number', min: '1', max: '31', value: fs.payday, 'aria-label': 'Ngày nhận lương', onchange: (e) => saveFinanceSettings({ ...fs, payday: Number(e.target.value) || 5 }) }))),
      h('ul', { class: 'log-list' }, sales.map((s) => h('li', {},
        h('span', { class: 'appt-time' }, `${toDate(s.day).getDate()}/${toDate(s.day).getMonth() + 1}`),
        h('span', { class: 'grow' }, s.name),
        h('span', { class: 'muted small' }, daysUntil(s.day) === 0 ? 'hôm nay' : `còn ${daysUntil(s.day)} ngày`)))),
      h('p', { class: 'muted small' }, 'Mẹo: ghi giá vài lần trước ngày sale để nhận ra kiểu “nâng giá rồi giảm”.')));
}

// ---------- Báo cáo tháng (P5.11) ----------
let reportMonth = null;
export async function renderReport(root) {
  if (await guard(root, 'money-report', 'Báo cáo')) return;
  reportMonth ??= thisMonth();
  const cur = await txInMonth(reportMonth);
  const prev = await txInMonth(prevMonth(reportMonth));
  const tot = (list, type) => list.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  const inc = tot(cur, 'income'), exp = tot(cur, 'expense');
  const pinc = tot(prev, 'income'), pexp = tot(prev, 'expense');
  const byCat = CATEGORIES.expense.map(([id, label]) => ({ id, label, v: cur.filter((t) => t.type === 'expense' && t.category === id).reduce((s, t) => s + t.amount, 0), pv: prev.filter((t) => t.type === 'expense' && t.category === id).reduce((s, t) => s + t.amount, 0) }))
    .filter((c) => c.v || c.pv).sort((a, b) => b.v - a.v);
  const max = Math.max(...byCat.map((c) => c.v), 1);
  const diff = (a, b) => (b ? `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round(((a - b) / b) * 100))}% so với tháng trước` : 'tháng trước chưa có dữ liệu');
  const [y, m] = reportMonth.split('-').map(Number);

  mount(root,
    head('money-report', 'Báo cáo'),
    h('div', { class: 'toolbar' },
      h('div', { class: 'btn-group' },
        h('button', { class: 'chip', 'aria-label': 'Tháng trước', onclick: () => { reportMonth = prevMonth(reportMonth); notifyChange(); } }, '‹'),
        h('button', { class: 'chip', onclick: () => { reportMonth = thisMonth(); notifyChange(); } }, 'Tháng này')),
      h('strong', {}, `Tháng ${m}/${y}`)),
    h('section', { class: 'card' },
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', { class: 'money income' }, fmtVND(inc)), h('span', {}, `thu · ${diff(inc, pinc)}`)),
        h('div', { class: 'stat' }, h('b', { class: 'money' }, fmtVND(exp)), h('span', {}, `chi · ${diff(exp, pexp)}`)),
        h('div', { class: 'stat' }, h('b', { class: 'money' }, fmtVND(inc - exp)), h('span', {}, inc ? `để dành được ${Math.round(((inc - exp) / inc) * 100)}% thu nhập` : 'để dành'))),
      byCat.length ? [
        h('h4', {}, 'Chi nhiều nhất vào'),
        h('ul', { class: 'hbars' }, byCat.map((c) => h('li', { title: `${c.label}: ${fmtVND(c.v)} (tháng trước ${fmtVND(c.pv)})` },
          h('span', { class: 'hbar-label' }, c.label),
          h('span', { class: 'hbar-track' }, h('span', { class: 'hbar money-bar', style: `width:${Math.max(1, (c.v / max) * 100)}%` })),
          h('span', { class: 'hbar-value' }, fmtShort(c.v))))),
        h('details', { class: 'table-view' }, h('summary', {}, 'Xem dạng bảng'),
          h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Danh mục'), h('th', {}, 'Tháng này'), h('th', {}, 'Tháng trước'))),
            h('tbody', {}, byCat.map((c) => h('tr', {}, h('td', {}, c.label), h('td', {}, fmtVND(c.v)), h('td', {}, fmtVND(c.pv))))))),
      ] : h('p', { class: 'muted small' }, 'Tháng này chưa có khoản chi.')));
}
