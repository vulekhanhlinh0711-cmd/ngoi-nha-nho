// P10.01–P10.03, P10.05: tư vấn phong cách — hồ sơ phong cách, gợi ý phối đồ, người mẫu theo số đo, nối ngân sách.
// Số đo cơ thể rất riêng tư: chỉ lưu trên máy, không gửi đi đâu, có nút ẩn.
import { h, svg, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { getSetting, setSetting } from '../../core/db.js';
import { todayKey } from '../../core/time.js';
import { isLocked } from '../../core/lock.js';
import { STYLES, OCCASIONS, SEASONS, currentSeason } from './catalog.js';
import { closet, boards } from './home.js';
import { getBudget, spendByBucket } from '../finance/plan.js';
import { txInMonth, monthOf, saveItem, fmtVND, parseAmount, listKind } from '../finance/money.js';

export const PALETTES = {
  'Xuân (ấm, tươi)': ['#f6b48f', '#f2d16b', '#9bd18b', '#6cc3c1', '#f08a8a'],
  'Hạ (mát, dịu)': ['#b8c7e6', '#d9b8d6', '#a7d3c9', '#e7c6cf', '#9fb3c8'],
  'Thu (ấm, trầm)': ['#b5652f', '#c9a15a', '#6b7b3a', '#8a4b3b', '#d08c4a'],
  'Đông (lạnh, đậm)': ['#1f2a44', '#b0183d', '#2e7d6b', '#f4f4f4', '#5a2a82'],
};
const COLOR_WORDS = { trắng: '#f4f4f0', đen: '#222', be: '#d9c3a0', kem: '#efe0c8', xám: '#8c8c94', 'xanh than': '#24324d', 'xanh dương': '#4a78b8', xanh: '#4a78b8', 'xanh lá': '#5d8a5a', đỏ: '#b0283d', hồng: '#ef9fb5', vàng: '#e9c45a', nâu: '#7a5236', tím: '#7d5aa6', cam: '#e98a3a' };
export const colorOf = (name = '') => COLOR_WORDS[name.trim().toLowerCase()] ?? (/^#[0-9a-f]{6}$/i.test(name) ? name : null);

let occasion = 'đi làm';
let tryTop = null; let tryBottom = null; let bottomKind = 'pants';
let showMeasures = false;

async function profile() {
  return { styles: [], palette: null, heightCm: null, bust: null, waist: null, hips: null, ...((await getSetting('styleProfile')) ?? {}) };
}
const saveProfile = async (p) => { await setSetting('styleProfile', p); notifyChange(); };

// Dáng người ước tính từ số đo vòng ngực / eo / hông (cm).
export function bodyShape({ bust, waist, hips }) {
  if (!bust || !waist || !hips) return null;
  if (Math.abs(bust - hips) <= 5 && waist <= Math.min(bust, hips) - 18) return ['Đồng hồ cát', 'Nhấn eo (thắt lưng, đầm ôm eo), tránh đồ quá rộng thùng thình.'];
  if (hips - bust > 5) return ['Quả lê', 'Áo sáng màu/có điểm nhấn ở vai, quần váy tối màu, chân váy chữ A.'];
  if (bust - hips > 5) return ['Tam giác ngược', 'Áo đơn giản cổ chữ V, quần ống rộng hoặc chân váy xòe để cân đối.'];
  if (waist >= Math.min(bust, hips) - 5) return ['Quả táo', 'Áo cổ chữ V, đầm suông/chữ A, chất liệu rủ; tránh thắt lưng to ở eo.'];
  return ['Chữ nhật', 'Tạo đường cong bằng thắt lưng, áo peplum, layer áo khoác dáng lửng.'];
}

const OCCASION_TIPS = {
  'đi làm': 'Ưu tiên tông trung tính, chất liệu đứng dáng; blazer hoặc sơ mi + quần âu/chân váy midi.',
  'cà phê cuối tuần': 'Thoải mái mà vẫn gọn: áo len mỏng/áo thun + jeans, giày thể thao hoặc búp bê.',
  'dự tiệc': 'Một điểm nhấn là đủ: đầm trơn + phụ kiện ánh kim, hoặc màu nổi trong bảng màu của bạn.',
  'du lịch biển': 'Vải thoáng, màu sáng; mũ rộng vành, sandal; mang thêm áo khoác mỏng cho buổi tối.',
};

// P10.03: người mẫu vẽ theo tỷ lệ số đo.
function mannequin(p, top, bottom) {
  const base = 88;
  const w = (v, def) => Math.max(26, Math.min(64, ((v || def) / base) * 42));
  const sh = w(p.bust, 86) * 1.05, ws = w(p.waist, 68), hp = w(p.hips, 92);
  const cx = 100, yS = 70, yW = 140, yH = 175, yK = 300;
  const torso = `${cx - sh},${yS} ${cx + sh},${yS} ${cx + ws},${yW} ${cx + hp},${yH} ${cx - hp},${yH} ${cx - ws},${yW}`;
  const pants = `${cx - hp},${yH} ${cx + hp},${yH} ${cx + hp - 4},${yK} ${cx + 4},${yK} ${cx},${yH + 30} ${cx - 4},${yK} ${cx - hp + 4},${yK}`;
  const skirt = `${cx - hp},${yH - 5} ${cx + hp},${yH - 5} ${cx + hp + 22},${yK - 60} ${cx - hp - 22},${yK - 60}`;
  return svg('svg', { viewBox: '0 0 200 320', class: 'mannequin', role: 'img', 'aria-label': 'Người mẫu theo số đo' },
    svg('circle', { cx, cy: 36, r: 24, class: 'mq-skin' }),
    svg('rect', { x: cx - 7, y: 56, width: 14, height: 16, class: 'mq-skin' }),
    svg('polygon', { points: torso, fill: top ?? '#d7d2c8', class: 'mq-cloth' }),
    bottomKind === 'skirt'
      ? [svg('polygon', { points: skirt, fill: bottom ?? '#9aa3b5', class: 'mq-cloth' }), svg('rect', { x: cx - 18, y: yK - 60, width: 10, height: 58, class: 'mq-skin' }), svg('rect', { x: cx + 8, y: yK - 60, width: 10, height: 58, class: 'mq-skin' })]
      : svg('polygon', { points: pants, fill: bottom ?? '#9aa3b5', class: 'mq-cloth' }),
    svg('line', { x1: cx - sh, y1: yS + 4, x2: cx - sh - 14, y2: yW + 10, class: 'mq-arm' }),
    svg('line', { x1: cx + sh, y1: yS + 4, x2: cx + sh + 14, y2: yW + 10, class: 'mq-arm' }));
}

export async function renderStylist(root) {
  const p = await profile();
  const items = await closet();
  const shape = bodyShape(p);
  const season = currentSeason();
  const tops = items.filter((x) => ['Áo', 'Áo khoác', 'Váy/đầm'].includes(x.category));
  const bottoms = items.filter((x) => ['Quần', 'Váy/đầm'].includes(x.category));
  const fit = (x) => (!x.season || x.season === season) && (!x.tags?.length || x.tags.includes(occasion));
  const picks = [...tops.filter(fit).slice(0, 2), ...bottoms.filter(fit).slice(0, 2)];
  const cats = new Set(items.map((x) => x.category));
  const missing = ['Áo', 'Quần', 'Giày', 'Áo khoác', 'Túi'].filter((c) => !cats.has(c));
  const pins = (await boards()).flatMap((b) => b.pins).filter((x) => x.tags?.some((t) => p.styles.includes(t) || t === occasion)).length;

  // P10.05: ngân sách mua sắm còn lại (ẩn số tiền khi phần Tài chính đang khóa).
  let budgetLine = null;
  if (!(await isLocked('finance'))) {
    const shop = spendByBucket(await getBudget(), await txInMonth(monthOf(todayKey()))).find((b) => b.cats.includes('shopping'));
    if (shop?.limit) budgetLine = `Ngân sách mua sắm còn ${fmtVND(Math.max(0, shop.limit - shop.used))} tháng này.`;
  }
  const wishes = await listKind('wish');

  mount(root,
    h('div', { class: 'view-head' }, subnav('home', 'stylist'), h('h2', {}, 'Tư vấn phong cách')),
    h('section', { class: 'card' },
      h('h3', {}, '🎨 Hồ sơ phong cách'),
      h('div', { class: 'presets' }, h('span', { class: 'meta-text' }, 'Phong cách hay chọn:'), STYLES.map((s) => h('button', {
        class: `chip${p.styles.includes(s) ? ' on' : ''}`, 'aria-pressed': String(p.styles.includes(s)),
        onclick: () => saveProfile({ ...p, styles: p.styles.includes(s) ? p.styles.filter((x) => x !== s) : [...p.styles, s] }),
      }, s))),
      h('div', { class: 'presets' }, h('span', { class: 'meta-text' }, 'Bảng màu hợp với mình:'), Object.entries(PALETTES).map(([name, cols]) => h('button', {
        class: `chip palette${p.palette === name ? ' on' : ''}`, 'aria-pressed': String(p.palette === name), onclick: () => saveProfile({ ...p, palette: name }),
      }, name, h('span', { class: 'sw-row' }, cols.map((c) => h('span', { class: 'color-dot', style: `background:${c}` })))))),
      h('details', { class: 'sub', open: showMeasures, ontoggle: (e) => { showMeasures = e.target.open; } },
        h('summary', {}, '📏 Số đo (riêng tư, chỉ lưu trên máy)'),
        h('form', {
          class: 'form-row', onsubmit: (e) => {
            e.preventDefault();
            const f = e.target.elements;
            const n = (k) => (f[k].value ? Number(f[k].value) : null);
            saveProfile({ ...p, heightCm: n('heightCm'), bust: n('bust'), waist: n('waist'), hips: n('hips') });
            toast('Đã lưu số đo');
          },
        }, [['heightCm', 'Cao'], ['bust', 'Ngực'], ['waist', 'Eo'], ['hips', 'Hông']].map(([k, l]) => h('label', { class: 'field-inline' }, l,
          h('input', { class: 'input num', name: k, type: 'number', min: '40', max: '220', value: p[k] ?? '', 'aria-label': `${l} (cm)` }), 'cm')),
          h('button', { class: 'chip', type: 'submit' }, 'Lưu')),
        shape ? h('p', { class: 'insight' }, `Dáng người ước tính: ${shape[0]}. ${shape[1]}`) : h('p', { class: 'muted small' }, 'Nhập ngực, eo, hông để được gợi ý theo dáng người.'))),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', {}, '👗 Hôm nay mặc gì?'),
        h('select', { class: 'input', 'aria-label': 'Dịp', onchange: (e) => { occasion = e.target.value; notifyChange(); } }, OCCASIONS.map((o) => h('option', { value: o, selected: o === occasion }, o)))),
      h('p', {}, OCCASION_TIPS[occasion]),
      p.palette ? h('p', { class: 'small' }, `Màu gợi ý từ bảng ${p.palette}: `, h('span', { class: 'sw-row' }, PALETTES[p.palette].map((c) => h('span', { class: 'color-dot', style: `background:${c}` })))) : null,
      h('p', { class: 'muted small' }, `Mùa hiện tại: ${season}${pins ? ` · ${pins} ảnh trong mood board khớp phong cách/dịp này` : ''}.`),
      picks.length ? h('div', { class: 'presets' }, h('span', { class: 'meta-text' }, 'Từ tủ đồ thật:'), picks.map((x) => h('span', { class: 'meta-chip' }, `${x.name}${x.color ? ` (${x.color})` : ''}`)))
        : h('p', { class: 'muted small' }, 'Thêm đồ vào ', h('a', { href: '#closet' }, 'Tủ đồ thật'), ' để được gợi ý từ chính đồ của bạn.')),
    h('section', { class: 'card tryon' },
      h('h3', {}, '🧍 Ướm thử trên người mẫu'),
      h('div', { class: 'tryon-row' },
        mannequin(p, tryTop, tryBottom),
        h('div', { class: 'tryon-side' },
          h('label', { class: 'field' }, h('span', {}, 'Áo'), h('select', { class: 'input', onchange: (e) => { tryTop = e.target.value || null; notifyChange(); } },
            h('option', { value: '' }, '— chọn màu/món —'), [...tops.map((x) => [colorOf(x.color), `${x.name} (${x.color || '?'})`]).filter(([c]) => c), ...Object.entries(COLOR_WORDS).map(([n, c]) => [c, `Màu ${n}`])]
              .map(([c, l]) => h('option', { value: c, selected: tryTop === c }, l)))),
          h('label', { class: 'field' }, h('span', {}, 'Quần/váy'), h('select', { class: 'input', onchange: (e) => { tryBottom = e.target.value || null; notifyChange(); } },
            h('option', { value: '' }, '— chọn màu/món —'), [...bottoms.map((x) => [colorOf(x.color), `${x.name} (${x.color || '?'})`]).filter(([c]) => c), ...Object.entries(COLOR_WORDS).map(([n, c]) => [c, `Màu ${n}`])]
              .map(([c, l]) => h('option', { value: c, selected: tryBottom === c }, l)))),
          h('div', { class: 'presets' },
            h('button', { class: `chip${bottomKind === 'pants' ? ' on' : ''}`, onclick: () => { bottomKind = 'pants'; notifyChange(); } }, 'Quần'),
            h('button', { class: `chip${bottomKind === 'skirt' ? ' on' : ''}`, onclick: () => { bottomKind = 'skirt'; notifyChange(); } }, 'Chân váy')),
          h('p', { class: 'muted small' }, 'Dáng người mẫu thay đổi theo số đo đã nhập. Ướm lên ảnh thật bằng AI sẽ làm sau (cần dịch vụ bên ngoài).')))),
    h('section', { class: 'card' },
      h('h3', {}, '🛍️ Mua sắm có kế hoạch'),
      budgetLine ? h('p', {}, budgetLine) : h('p', { class: 'muted small' }, 'Mở khóa phần Tài chính để xem ngân sách mua sắm.'),
      missing.length ? h('p', {}, 'Tủ đồ còn thiếu: ', missing.map((c) => h('button', {
        class: 'chip', onclick: async () => {
          const price = parseAmount(prompt(`Giá dự kiến cho ${c.toLowerCase()} (VD 300k)?`) ?? '')?.amount;
          if (!price) return;
          await saveItem({ kind: 'wish', name: `${c} (${occasion})`, link: '', target: null, urgent: false, addedAt: new Date().toISOString(), prices: [{ day: todayKey(), price }] });
          toast('Đã thêm vào Wishlist (áp dụng quy tắc chờ 48 giờ)');
        },
      }, `+ ${c} vào wishlist`))) : h('p', { class: 'muted small' }, 'Tủ đồ đã có đủ các món cơ bản 👏'),
      wishes.length ? h('p', { class: 'muted small' }, `${wishes.length} món đang chờ trong `, h('a', { href: '#wishlist' }, 'Wishlist'), '.') : null));
}

export { SEASONS };
