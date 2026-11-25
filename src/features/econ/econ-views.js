// P11: màn Kiến thức tài chính (bài học + câu đố) và màn Thị trường (số liệu nhập tay + công cụ).
import { h, svg, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange, logEvent, queryEvents } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { toDate } from '../../core/dates.js';
import { systemNotify } from '../../core/notify.js';
import { isLocked, lockScreen } from '../../core/lock.js';
import { fmtVND, parseAmount } from '../finance/money.js';
import { newsCard } from '../ai/ai-view.js';
import { LESSONS, LESSON_COINS } from './lessons.js';
import {
  SERIES, MEANING, getMarket, latest, addPoint, setAlert, saveBanks, goldAnalysis, savingsCompare, loanCompare, fetchUsdVnd, FX_SOURCE,
} from './market.js';

// ---------- Bài học (P11.01) ----------
let openLesson = null;
export async function renderLessons(root) {
  const done = new Set((await queryEvents('econ_lesson_done')).map((e) => e.lesson));
  const groups = [...new Set(LESSONS.map((l) => l.group))];
  const l = LESSONS.find((x) => x.id === openLesson);
  const result = h('div');
  mount(root,
    h('div', { class: 'view-head' }, subnav('learn', 'lessons'), h('h2', {}, 'Kiến thức tài chính'),
      h('p', { class: 'muted' }, `Bài ngắn 3 phút + câu đố. Làm đúng hết câu đố: +${LESSON_COINS} 🪙 (1 lần mỗi bài). ${done.size}/${LESSONS.length} bài đã xong.`)),
    l ? h('section', { class: 'card lesson' },
      h('button', { class: 'chip', onclick: () => { openLesson = null; notifyChange(); } }, '← Danh sách'),
      h('h3', {}, l.title), h('p', { class: 'reading-text' }, l.body),
      h('form', {
        class: 'quiz', onsubmit: async (e) => {
          e.preventDefault();
          const ok = l.quiz.filter(([, , ans], k) => Number(e.target.elements[`q${k}`].value) === ans).length;
          if (ok === l.quiz.length) {
            // Kiểm tra lại lúc nộp (không dùng danh sách cũ) để mỗi bài chỉ thưởng 1 lần.
            const already = (await queryEvents('econ_lesson_done')).some((x) => x.lesson === l.id);
            if (!already) { await logEvent('econ_lesson_done', { lesson: l.id, day: todayKey() }); toast(`🎓 Hoàn thành bài: +${LESSON_COINS} 🪙`); }
            mount(result, h('p', {}, `✓ Đúng ${ok}/${l.quiz.length}. Giỏi lắm!`));
          } else {
            mount(result, h('p', {}, `Đúng ${ok}/${l.quiz.length}. Đọc lại một chút rồi thử lần nữa nhé.`));
          }
        },
      }, l.quiz.map(([q, opts], k) => h('fieldset', {}, h('legend', {}, `${k + 1}. ${q}`),
        opts.map((o, i) => h('label', { class: 'field-inline' }, h('input', { type: 'radio', name: `q${k}`, value: i, required: true }), o)))),
        h('button', { class: 'btn', type: 'submit' }, 'Kiểm tra')),
      result) : null,
    !l ? groups.map((g) => h('section', { class: 'card' }, h('h3', {}, g),
      h('ul', { class: 'log-list' }, LESSONS.filter((x) => x.group === g).map((x) => h('li', {},
        h('span', { class: 'grow' }, `${done.has(x.id) ? '✅' : '📘'} ${x.title}`),
        h('button', { class: 'chip', onclick: () => { openLesson = x.id; notifyChange(); } }, done.has(x.id) ? 'Đọc lại' : 'Học')))))) : null,
    h('p', { class: 'muted small' }, 'Nội dung mang tính phổ thông để tham khảo, không phải lời khuyên đầu tư.'));
}

// ---------- Thị trường (P11.03–P11.06) ----------
let chartKey = 'sjc_sell';
let calc = { amount: 100e6, months: 12 };
let loan = { amount: 500e6, months: 240, fixedRate: 9, promoRate: 6.5, promoMonths: 12, floatRate: 11, feePct: 1, insurance: 0, method: 'declining' };
const n1 = (v, d = 2) => (v == null ? '—' : Number(v).toLocaleString('vi-VN', { maximumFractionDigits: d }));

function lineChart(points, unit) {
  if (points.length < 2) return h('p', { class: 'muted small' }, 'Cần ít nhất 2 lần ghi để vẽ biểu đồ.');
  const pts = points.slice(-60);
  const W = 320, H = 110;
  const vs = pts.map((p) => p.v);
  const lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const t0 = toDate(pts[0].day).getTime(), t1 = toDate(pts.at(-1).day).getTime() || t0 + 1;
  const x = (d) => ((toDate(d).getTime() - t0) / (t1 - t0 || 1)) * W;
  const y = (v) => H - ((v - lo) / span) * (H - 10) - 5;
  return h('div', { class: 'market-chart' },
    svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Biểu đồ ${pts.length} lần ghi, từ ${n1(pts[0].v)} đến ${n1(pts.at(-1).v)} ${unit}` },
      svg('polyline', { points: pts.map((p) => `${x(p.day).toFixed(1)},${y(p.v).toFixed(1)}`).join(' '), class: 'wline' }),
      pts.map((p) => svg('circle', { cx: x(p.day), cy: y(p.v), r: 3, class: 'wdot' }, svg('title', {}, `${toDate(p.day).toLocaleDateString('vi-VN')}: ${n1(p.v)} ${unit}`)))),
    h('p', { class: 'muted small' }, `Thấp nhất ${n1(lo)} · cao nhất ${n1(hi)} ${unit}`));
}

export async function renderMarket(root) {
  const head = h('div', { class: 'view-head' }, subnav('finance', 'market'), h('h2', {}, 'Thị trường'));
  if (await isLocked('finance')) { mount(root, head, lockScreen('finance', 'Tài chính đang khóa', notifyChange)); return; }
  const m = await getMarket();
  const g = goldAnalysis(m);
  const cpi = latest(m, 'cpi');
  const s = SERIES.find((x) => x.key === chartKey);
  const term = calc.months <= 6 ? '6' : '12';
  const banks = [...m.banks].sort((a, b) => (b.rates[term] ?? 0) - (a.rates[term] ?? 0));
  const L = loanCompare(loan);
  const num = (v) => parseAmount(String(v))?.amount ?? Number(v);

  mount(root, head,
    h('p', { class: 'insight' }, '⚠️ Không ai dự đoán chắc chắn được giá vàng hay thị trường. Trang này giúp bạn ghi lại số liệu, hiểu ý nghĩa và so sánh — không khuyên “mua ngay”. Với khoản tiền lớn, hãy hỏi thêm người tư vấn tài chính có chuyên môn.'),
    h('section', { class: 'card' },
      h('h3', {}, '📝 Ghi số liệu hôm nay'),
      h('p', { class: 'muted small' }, 'Giá vàng, lãi suất, CPI: xem trên nguồn chính thức (công ty vàng, website ngân hàng, cơ quan thống kê) rồi nhập tay — các nguồn này chưa cho phép lấy dữ liệu tự động.'),
      h('div', { class: 'presets' },
        h('button', {
          class: 'chip', type: 'button', onclick: async () => {
            try { const r = await fetchUsdVnd(); toast(r.cached ? `Tỷ giá hôm nay đã lấy rồi: ${n1(r.rate, 0)} đ` : `Đã lấy tỷ giá USD/VND: ${n1(r.rate, 0)} đ`); }
            catch (err) { toast(err.message || 'Không lấy được tỷ giá'); }
          },
        }, '💱 Lấy tỷ giá USD/VND tự động'),
        h('a', { class: 'small', href: FX_SOURCE.url, target: '_blank', rel: 'noopener' }, FX_SOURCE.label),
        h('span', { class: 'muted small' }, '(tỷ giá tham khảo quốc tế, cập nhật 1 lần/ngày; khác giá mua bán tại ngân hàng)')),
      h('form', {
        class: 'market-form', onsubmit: async (e) => {
          e.preventDefault();
          const alerts = [];
          for (const x of SERIES) {
            const v = e.target.elements[x.key].value.trim();
            if (v) alerts.push(...await addPoint(x.key, Number(v.replace(',', '.'))));
          }
          toast(alerts.length ? `🔔 ${alerts.join(' · ')}` : 'Đã lưu số liệu', { duration: alerts.length ? 10000 : 4000 });
          for (const a of alerts) systemNotify('🔔 Cảnh báo giá', a, '#market', 'market');
        },
      },
        SERIES.map((x) => h('label', { class: 'field' }, h('span', {}, `${x.name} (${x.unit})`),
          h('input', { class: 'input', name: x.key, inputmode: 'decimal', placeholder: latest(m, x.key) != null ? `lần trước: ${n1(latest(m, x.key))}` : '' }))),
        h('button', { class: 'btn', type: 'submit' }, 'Lưu'))),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', {}, '📈 Lịch sử'),
        h('select', { class: 'input', 'aria-label': 'Chọn chuỗi số liệu', onchange: (e) => { chartKey = e.target.value; notifyChange(); } },
          SERIES.map((x) => h('option', { value: x.key, selected: x.key === chartKey }, x.name)))),
      lineChart(m.series[chartKey] ?? [], s.unit),
      h('p', { class: 'small' }, '💡 Nghĩa là gì với túi tiền của mình: ', MEANING[chartKey])),
    h('section', { class: 'card' },
      h('h3', {}, '🥇 Vàng'),
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, g.spread != null ? `${n1(g.spread)} tr` : '—'), h('span', {}, `chênh lệch mua–bán SJC${g.spreadPct != null ? ` (${n1(g.spreadPct, 1)}%)` : ''}`)),
        h('div', { class: 'stat' }, h('b', {}, g.ringSpread != null ? `${n1(g.ringSpread)} tr` : '—'), h('span', {}, 'chênh lệch vàng nhẫn')),
        h('div', { class: 'stat' }, h('b', {}, g.worldVnd != null ? `${n1(g.worldVnd)} tr` : '—'), h('span', {}, 'giá thế giới quy đổi/lượng')),
        h('div', { class: 'stat' }, h('b', {}, g.premium != null ? `${n1(g.premium)} tr` : '—'), h('span', {}, 'trong nước cao hơn thế giới'))),
      g.spread != null ? h('p', { class: 'small' }, `Mua 1 lượng rồi bán lại ngay, bạn lỗ khoảng ${n1(g.spread)} triệu. Giá cần tăng hơn mức này mới có lãi.`) : null,
      h('form', {
        class: 'form-row', onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const v = (k) => (f[k].value ? Number(f[k].value.replace(',', '.')) : null);
          await setAlert('sjc_sell', v('above'), v('below'));
          toast('Đã đặt cảnh báo. App báo khi bạn ghi giá chạm mức này.');
        },
      }, h('span', { class: 'meta-text' }, 'Cảnh báo SJC bán ra:'),
        h('input', { class: 'input num', name: 'above', placeholder: 'lên ≥', value: m.alerts.sjc_sell?.above ?? '', 'aria-label': 'Báo khi giá lên tới' }),
        h('input', { class: 'input num', name: 'below', placeholder: 'xuống ≤', value: m.alerts.sjc_sell?.below ?? '', 'aria-label': 'Báo khi giá xuống tới' }),
        h('button', { class: 'chip', type: 'submit' }, 'Đặt'))),
    h('section', { class: 'card' },
      h('h3', {}, '🏦 So sánh gửi tiết kiệm'),
      h('div', { class: 'form-row' },
        h('label', { class: 'field-inline' }, 'Số tiền', h('input', { class: 'input num', value: n1(calc.amount / 1e6, 1) + 'tr', 'aria-label': 'Số tiền gửi', onchange: (e) => { calc.amount = num(e.target.value) || calc.amount; notifyChange(); } })),
        h('label', { class: 'field-inline' }, 'Kỳ hạn', h('select', { class: 'input', onchange: (e) => { calc.months = Number(e.target.value); notifyChange(); } }, [6, 12].map((v) => h('option', { value: v, selected: calc.months === v }, `${v} tháng`))))),
      banks.length ? h('table', { class: 'rate-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Ngân hàng'), h('th', {}, `Lãi ${term}T`), h('th', {}, 'Tiền lãi'), h('th', {}, 'Lãi thực'), h('th', {}))),
        h('tbody', {}, banks.map((b, i) => {
          const r = b.rates[term];
          const c = r != null ? savingsCompare(calc.amount, calc.months, r, cpi) : null;
          return h('tr', {}, h('td', {}, `${i === 0 && r != null ? '🏆 ' : ''}${b.name}`), h('td', {}, r != null ? `${n1(r)}%` : '—'),
            h('td', {}, c ? fmtVND(c.interest) : '—'),
            h('td', {}, c?.realRate != null ? `${n1(c.realRate, 1)}%${c.realRate < 0 ? ' ⚠️ mất sức mua' : ''}` : 'nhập CPI'),
            h('td', {}, h('button', { class: 'icon-btn', 'aria-label': `Xóa ${b.name}`, onclick: () => saveBanks(m.banks.filter((x) => x !== b)) }, '✕')));
        }))) : h('p', { class: 'muted small' }, 'Thêm lãi suất các ngân hàng bạn quan tâm (xem trên website ngân hàng).'),
      h('form', {
        class: 'form-row', onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          if (!f.name.value.trim()) return;
          const r = (k) => (f[k].value ? Number(f[k].value.replace(',', '.')) : null);
          await saveBanks([...m.banks.filter((x) => x.name !== f.name.value.trim()), { name: f.name.value.trim(), rates: { 6: r('r6'), 12: r('r12') }, day: todayKey() }]);
        },
      }, h('input', { class: 'input', name: 'name', placeholder: 'Tên ngân hàng', 'aria-label': 'Tên ngân hàng' }),
        h('input', { class: 'input num', name: 'r6', placeholder: '6T %', 'aria-label': 'Lãi 6 tháng (%/năm)' }),
        h('input', { class: 'input num', name: 'r12', placeholder: '12T %', 'aria-label': 'Lãi 12 tháng (%/năm)' }),
        h('button', { class: 'chip', type: 'submit' }, '+ Thêm')),
      cpi != null ? h('p', { class: 'muted small' }, `Lãi thực ≈ lãi niêm yết − lạm phát (${n1(cpi, 1)}%).`) : null),
    h('section', { class: 'card' },
      h('h3', {}, '💳 So sánh khoản vay'),
      h('form', {
        class: 'form-row', onchange: (e) => {
          const f = e.currentTarget.elements;
          loan = {
            amount: num(f.amount.value) || loan.amount, months: Number(f.months.value) || loan.months,
            fixedRate: Number(f.fixedRate.value), promoRate: Number(f.promoRate.value), promoMonths: Number(f.promoMonths.value),
            floatRate: Number(f.floatRate.value), feePct: Number(f.feePct.value) || 0, insurance: num(f.insurance.value) || 0, method: f.method.value,
          };
          notifyChange();
        },
      },
        h('label', { class: 'field-inline' }, 'Vay', h('input', { class: 'input num', name: 'amount', value: `${n1(loan.amount / 1e6, 0)}tr` })),
        h('label', { class: 'field-inline' }, 'Số tháng', h('input', { class: 'input num', name: 'months', type: 'number', min: '1', value: loan.months })),
        h('label', { class: 'field-inline' }, 'Cố định', h('input', { class: 'input num', name: 'fixedRate', type: 'number', step: '0.1', value: loan.fixedRate }), '%/năm'),
        h('label', { class: 'field-inline' }, 'Ưu đãi', h('input', { class: 'input num', name: 'promoRate', type: 'number', step: '0.1', value: loan.promoRate }), '% trong', h('input', { class: 'input num', name: 'promoMonths', type: 'number', min: '0', value: loan.promoMonths }), 'tháng, sau đó thả nổi', h('input', { class: 'input num', name: 'floatRate', type: 'number', step: '0.1', value: loan.floatRate }), '%'),
        h('label', { class: 'field-inline' }, 'Phí', h('input', { class: 'input num', name: 'feePct', type: 'number', step: '0.1', value: loan.feePct }), '%'),
        h('label', { class: 'field-inline' }, 'Bảo hiểm', h('input', { class: 'input num', name: 'insurance', value: loan.insurance ? `${n1(loan.insurance / 1e6)}tr` : '0' })),
        h('select', { class: 'input', name: 'method', 'aria-label': 'Cách tính lãi' },
          h('option', { value: 'declining', selected: loan.method === 'declining' }, 'Lãi trên dư nợ giảm dần'),
          h('option', { value: 'flat', selected: loan.method === 'flat' }, 'Lãi phẳng (trên gốc ban đầu)'))),
      h('div', { class: 'plan-compare' }, [['Lãi cố định', L.fixed], ['Ưu đãi rồi thả nổi', L.floating]].map(([name, r]) => h('div', { class: 'plan-col' },
        h('h4', {}, name),
        r ? [
          h('p', {}, 'Tổng chi phí thật: ', h('b', { class: 'money' }, fmtVND(r.totalCost))),
          h('p', { class: 'small' }, `Lãi ${fmtVND(r.totalInterest)} + phí/bảo hiểm ${fmtVND(L.fees)}`),
          h('p', { class: 'small' }, `Trả tháng đầu ${fmtVND(r.first)} · cao nhất ${fmtVND(r.max)}`),
          h('p', { class: 'small' }, `Lãi suất thực tế ≈ ${n1(r.apr, 1)}%/năm`),
        ] : h('p', { class: 'muted small' }, 'Nhập đủ lãi suất.')))),
      h('p', { class: 'muted small' }, 'Lãi thả nổi sau ưu đãi chỉ là giả định của bạn; thực tế có thể cao hoặc thấp hơn. Lãi phẳng nghe thấp nhưng thường đắt gần gấp đôi.')),
    newsCard());
}
