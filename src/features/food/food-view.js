// Màn Ăn uống (P3): hồ sơ, vòng kcal, gõ nhanh, tìm món, 4 bữa, ảnh, vận động, xu hướng.
import { h, svg, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays, toDate } from '../../core/dates.js';
import { savePhoto, photoUrl } from '../../core/photos.js';
import { FOODS, searchFoods, portion } from './foods.js';
import {
  getBody, saveBody, profileReady, targets, ACTIVITY, EXERCISES, logExercise, logWeight, weightSeries,
} from './body.js';
import {
  MEALS, mealsOn, sum, exerciseOn, addMeal, removeMeal, recentFoods, favorites, toggleFavorite,
  repeatYesterday, specialDays, toggleSpecial, weeklyAverages, lowIntakeWarning, guessMeal,
  parseFoodLine, myFoods, saveMyFood, foodById,
} from './meals.js';
import { lookupBarcode, canScan, scanBarcode } from './off.js';

let mealSel = guessMeal();
let editingProfile = false;
let scanner = null;
const fmt = (n) => Math.round(n).toLocaleString('vi-VN');

function profileCard(b) {
  const field = (label, key, attrs) => h('label', { class: 'field-inline' }, label,
    h('input', { class: 'input num', type: 'number', value: b[key] ?? '', name: key, ...attrs }));
  return h('section', { class: 'card' },
    h('h3', {}, '🧍 Hồ sơ cơ thể'),
    h('p', { class: 'muted small' }, 'Dùng để ước tính lượng kcal cơ thể cần mỗi ngày. Chỉ lưu trên máy này.'),
    h('form', {
      class: 'form-grid',
      onsubmit: async (e) => {
        e.preventDefault();
        const f = e.target.elements;
        const num = (k) => (f[k].value === '' ? null : Number(f[k].value));
        await saveBody({
          ...b, heightCm: num('heightCm'), weightKg: num('weightKg'), age: num('age'),
          sex: f.sex.value, activity: Number(f.activity.value), deficit: Number(f.deficit.value),
        });
        editingProfile = false;
        toast('Đã lưu hồ sơ');
      },
    },
      h('div', { class: 'form-row' },
        field('Chiều cao (cm)', 'heightCm', { min: '120', max: '220', required: true }),
        field('Cân nặng (kg)', 'weightKg', { min: '30', max: '250', step: '0.1', required: true }),
        field('Tuổi', 'age', { min: '13', max: '100', required: true }),
        h('label', { class: 'field-inline' }, 'Giới tính',
          h('select', { class: 'input', name: 'sex' },
            h('option', { value: 'f', selected: b.sex === 'f' }, 'Nữ'), h('option', { value: 'm', selected: b.sex === 'm' }, 'Nam')))),
      h('div', { class: 'form-row' },
        h('label', { class: 'field-inline' }, 'Vận động',
          h('select', { class: 'input', name: 'activity' }, ACTIVITY.map(([v, l]) => h('option', { value: v, selected: v === b.activity }, l)))),
        h('label', { class: 'field-inline' }, 'Giảm mỗi ngày',
          h('select', { class: 'input', name: 'deficit' }, [0, 300, 400, 500].map((v) => h('option', { value: v, selected: v === b.deficit }, v ? `${v} kcal` : 'Giữ cân'))))),
      h('button', { class: 'btn', type: 'submit' }, 'Lưu hồ sơ')));
}

function ring(eaten, goal, hide, mealsCount) {
  const R = 52, C = 2 * Math.PI * R;
  const pct = Math.min(1, eaten / goal);
  return h('div', { class: 'kcal-ring' },
    svg('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' },
      svg('circle', { cx: 60, cy: 60, r: R, class: 'ring-bg' }),
      svg('circle', { cx: 60, cy: 60, r: R, class: 'ring-fg kcal', style: `stroke-dasharray:${C};stroke-dashoffset:${C * (1 - pct)}` })),
    h('div', { class: 'ring-center' }, hide
      ? [h('b', {}, mealsCount), h('span', { class: 'muted small' }, 'món đã ghi')]
      : [h('b', {}, fmt(Math.max(goal - eaten, 0))), h('span', { class: 'muted small' }, 'còn lại')]));
}

function summaryCard(b, t, total, ex, count, special) {
  const exKcal = ex.reduce((s, e) => s + e.kcal, 0);
  const goal = t.target + (b.addExercise ? exKcal : 0);
  return h('section', { class: 'card kcal-card' },
    ring(total.kcal, goal, b.hideNumbers, count),
    h('div', { class: 'kcal-side' },
      b.hideNumbers
        ? h('p', {}, 'Đang ở chế độ ẩn con số. Chỉ cần ghi món ăn thôi 🌿')
        : [
            h('p', { class: 'kcal-big' }, h('b', {}, fmt(total.kcal)), ` / ${fmt(goal)} kcal`),
            h('p', { class: 'muted small' }, `Nhu cầu ước tính ${fmt(t.tdee)} · mức sàn ${fmt(t.floor)}`,
              t.clamped ? ' · mục tiêu đã được nâng lên mức sàn để an toàn' : ''),
            b.addExercise && exKcal ? h('p', { class: 'muted small' }, `+${fmt(exKcal)} kcal từ vận động`) : null,
            b.showMacros ? h('p', { class: 'macros' },
              h('span', {}, `Đạm ${fmt(total.p)}g`), h('span', {}, `Tinh bột ${fmt(total.c)}g`), h('span', {}, `Béo ${fmt(total.f)}g`)) : null,
          ],
      h('div', { class: 'presets' },
        h('button', { class: `chip${b.hideNumbers ? ' on' : ''}`, 'aria-pressed': String(b.hideNumbers), onclick: () => saveBody({ ...b, hideNumbers: !b.hideNumbers }) }, '🙈 Ẩn con số'),
        h('button', { class: `chip${b.showMacros ? ' on' : ''}`, 'aria-pressed': String(b.showMacros), onclick: () => saveBody({ ...b, showMacros: !b.showMacros }) }, 'Đạm/tinh bột/béo'),
        h('button', { class: `chip${special ? ' on' : ''}`, 'aria-pressed': String(special), title: 'Không tính vào trung bình tuần', onclick: () => toggleSpecial() }, '🎉 Ngày đặc biệt'),
        h('button', { class: 'chip', onclick: () => { editingProfile = true; notifyChange(); } }, '✏️ Hồ sơ'))));
}

function mealChips() {
  return h('div', { class: 'presets', role: 'radiogroup', 'aria-label': 'Chọn bữa' }, MEALS.map(([k, label]) => h('button', {
    class: `chip${k === mealSel ? ' on' : ''}`, role: 'radio', 'aria-checked': String(k === mealSel),
    onclick: (e) => {
      mealSel = k;
      e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c, i) => {
        const on = MEALS[i][0] === k;
        c.classList.toggle('on', on);
        c.setAttribute('aria-checked', String(on));
      });
    },
  }, label)));
}

// Một dòng kết quả: chọn số lượng (hoặc gram) rồi thêm.
function resultRow(food, hide, fav) {
  const gramsMode = food.per100;
  const amount = h('input', {
    class: 'input num', type: 'number', min: gramsMode ? '1' : '0.25', step: gramsMode ? '1' : '0.25',
    value: gramsMode ? (food.servingG ?? 100) : 1, 'aria-label': gramsMode ? 'Số gram' : `Số ${food.unit}`,
  });
  const preview = h('span', { class: 'muted small' });
  const update = () => {
    const n = portion(food, gramsMode ? { grams: Number(amount.value) || 0 } : { qty: Number(amount.value) || 0 });
    preview.textContent = hide ? '' : `${fmt(n.kcal)} kcal`;
  };
  amount.addEventListener('input', update);
  update();
  return h('li', { class: 'food-row' },
    h('div', { class: 'task-main' }, h('span', {}, food.name),
      h('span', { class: 'meta-text' }, gramsMode ? 'theo gram' : `1 ${food.unit} ≈ ${food.grams} g`, food.mine ? ' · món của tôi' : '')),
    amount, h('span', { class: 'muted small' }, gramsMode ? 'g' : food.unit), preview,
    h('button', { class: 'icon-btn', title: fav ? 'Bỏ yêu thích' : 'Yêu thích', 'aria-pressed': String(fav), onclick: () => toggleFavorite(food.id) }, fav ? '★' : '☆'),
    h('button', {
      class: 'chip', onclick: async () => {
        const v = Number(amount.value);
        if (!(v > 0)) return;
        await addMeal(gramsMode ? { meal: mealSel, food, grams: v } : { meal: mealSel, food, qty: v });
        toast(`Đã thêm ${food.name} vào ${MEALS.find((m) => m[0] === mealSel)[1]}`);
      },
    }, '+ Thêm'));
}

function addCard(b, mine, recent, favs) {
  const results = h('ul', { class: 'food-results' });
  const search = h('input', {
    class: 'input', type: 'search', placeholder: 'Tìm món: phở, cơm tấm, trứng…', 'aria-label': 'Tìm món ăn',
    oninput: () => {
      const list = searchFoods(search.value, mine);
      results.replaceChildren(...list.map((f) => resultRow(f, b.hideNumbers, favs.includes(f.id))));
      if (search.value.trim() && !list.length) results.append(h('li', { class: 'muted small' }, 'Không thấy món này. Dùng “Chỉ nhập kcal” bên dưới nhé.'));
    },
  });
  const quickPreview = h('span', { class: 'muted small' });
  const quick = h('input', {
    class: 'input', placeholder: 'Gõ nhanh: “trưa phở bò 1 bát”, “sáng 2 trứng luộc”', 'aria-label': 'Gõ nhanh món ăn',
    oninput: () => {
      const p = parseFoodLine(quick.value, mine);
      quickPreview.textContent = !quick.value.trim() ? '' : p.food
        ? `→ ${MEALS.find((m) => m[0] === (p.meal ?? mealSel))[1]}: ${p.food.name} × ${p.grams ? `${p.grams} g` : p.qty}${b.hideNumbers ? '' : ` ≈ ${fmt(portion(p.food, p.grams ? { grams: p.grams } : { qty: p.qty }).kcal)} kcal`}`
        : p.kcal ? `→ ${p.name || 'Món khác'}: ${p.kcal} kcal` : '→ chưa nhận ra món, thêm “350kcal” để nhập tay';
    },
  });
  const chip = (food) => h('button', {
    class: 'chip', onclick: async () => { await addMeal({ meal: mealSel, food, qty: food.per100 ? null : 1, grams: food.per100 ? 100 : null }); toast(`Đã thêm ${food.name}`); },
  }, food.name);
  const recentChip = (e) => {
    const food = e.foodId ? foodById(e.foodId, mine) : null;
    return food ? chip(food) : h('button', {
      class: 'chip', onclick: async () => { await addMeal({ meal: mealSel, name: e.name, kcal: e.kcal, p: e.p, c: e.c, f: e.f }); toast(`Đã thêm ${e.name}`); },
    }, e.name);
  };
  const favFoods = favs.map((id) => foodById(id, mine)).filter(Boolean);

  return h('section', { class: 'card' },
    h('h3', {}, '➕ Thêm món'),
    mealChips(),
    h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        const p = parseFoodLine(quick.value, mine);
        const meal = p.meal ?? mealSel;
        if (p.food || p.kcal) { quick.value = ''; quickPreview.textContent = ''; }
        if (p.food) await addMeal(p.grams ? { meal, food: p.food, grams: p.grams } : { meal, food: p.food, qty: p.qty });
        else if (p.kcal) await addMeal({ meal, name: p.name || 'Món khác', kcal: p.kcal });
        else { toast('Chưa nhận ra món. Thử tìm ở ô bên dưới, hoặc thêm “350kcal” để nhập tay.'); return; }
        toast('Đã ghi món ăn');
        quick.value = '';
        quickPreview.textContent = '';
      },
    }, quick, h('button', { class: 'chip', type: 'submit' }, 'Ghi')),
    quickPreview,
    search, results,
    favFoods.length ? h('div', { class: 'presets' }, h('span', { class: 'meta-text' }, '★ Yêu thích:'), favFoods.map(chip)) : null,
    recent.length ? h('div', { class: 'presets' }, h('span', { class: 'meta-text' }, '🕘 Gần đây:'), recent.map(recentChip)) : null,
    h('details', { class: 'sub' }, h('summary', {}, 'Chỉ nhập kcal / tạo món của tôi'),
      h('form', {
        class: 'form-row', onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const kcal = Number(f.kcal.value);
          if (!(kcal > 0)) return;
          const name = f.name.value.trim() || 'Món khác';
          if (f.save.checked) {
            const item = await saveMyFood({ name, unit: f.unit.value.trim() || 'phần', grams: 0, kcal, p: Number(f.p.value) || 0, c: Number(f.c.value) || 0, f: Number(f.fat.value) || 0 });
            await addMeal({ meal: mealSel, food: item, qty: 1 });
            toast(`Đã lưu “${name}” vào món của tôi`);
          } else {
            await addMeal({ meal: mealSel, name, kcal });
            toast('Đã ghi');
          }
        },
      },
        h('input', { class: 'input', name: 'name', placeholder: 'Tên món (tùy chọn)', 'aria-label': 'Tên món' }),
        h('input', { class: 'input num', name: 'kcal', type: 'number', min: '1', placeholder: 'kcal', required: true, 'aria-label': 'Số kcal' }),
        h('input', { class: 'input num', name: 'unit', placeholder: 'đơn vị', 'aria-label': 'Đơn vị' }),
        h('input', { class: 'input num', name: 'p', type: 'number', min: '0', placeholder: 'đạm g', 'aria-label': 'Đạm (g)' }),
        h('input', { class: 'input num', name: 'c', type: 'number', min: '0', placeholder: 'tinh bột g', 'aria-label': 'Tinh bột (g)' }),
        h('input', { class: 'input num', name: 'fat', type: 'number', min: '0', placeholder: 'béo g', 'aria-label': 'Béo (g)' }),
        h('label', { class: 'field-inline' }, h('input', { type: 'checkbox', name: 'save' }), 'Lưu thành món của tôi'),
        h('button', { class: 'chip', type: 'submit' }, 'Ghi'))),
    barcodeBox(b));
}

function barcodeBox(b) {
  const out = h('div');
  const video = h('video', { class: 'scan-video', playsinline: true, muted: true, hidden: true });
  const show = async (code) => {
    out.replaceChildren(h('p', { class: 'muted small' }, 'Đang tra…'));
    try {
      const food = await lookupBarcode(code);
      out.replaceChildren(h('ul', { class: 'food-results' }, resultRow(food, b.hideNumbers, false)),
        h('button', { class: 'chip', onclick: async () => { await saveMyFood(food); toast('Đã lưu vào món của tôi'); } }, 'Lưu vào món của tôi'));
    } catch (err) {
      out.replaceChildren(h('p', { class: 'muted small' }, err.message));
    }
  };
  return h('details', { class: 'sub' }, h('summary', {}, '🏷️ Mã vạch đồ đóng gói'),
    h('p', { class: 'muted small' }, 'Tra trên Open Food Facts (chỉ gửi số mã vạch). Số liệu theo 100 g do cộng đồng đóng góp.'),
    h('form', { class: 'inline-form', onsubmit: (e) => { e.preventDefault(); show(e.target.elements.code.value); } },
      h('input', { class: 'input', name: 'code', inputmode: 'numeric', placeholder: 'Nhập số mã vạch', 'aria-label': 'Mã vạch' }),
      h('button', { class: 'chip', type: 'submit' }, 'Tra'),
      canScan() ? h('button', {
        class: 'chip', type: 'button', onclick: async () => {
          scanner?.stop();
          video.hidden = false;
          scanner = scanBarcode(video);
          try { const code = await scanner.promise; if (code) show(code); } catch { toast('Không mở được camera'); }
          video.hidden = true;
        },
      }, '📷 Quét') : null),
    video, out);
}

async function mealSection(key, label, entries, hide, macros) {
  const total = sum(entries);
  const items = await Promise.all(entries.map(async (e) => {
    const url = e.photoId ? await photoUrl(e.photoId) : null;
    return h('li', {},
      url ? h('img', { class: 'thumb', src: url, alt: `Ảnh ${e.name}` }) : null,
      h('span', { class: 'grow' }, e.name,
        h('span', { class: 'muted small' }, e.grams ? ` · ${e.grams} g` : e.qty && e.qty !== 1 ? ` × ${e.qty}` : '', e.source === 'water' ? ' · từ phần Nước' : '')),
      hide ? null : h('span', { class: 'muted small num' }, `${fmt(e.kcal)} kcal`),
      macros && !hide ? h('span', { class: 'muted small' }, `Đ${fmt(e.p)} T${fmt(e.c)} B${fmt(e.f)}`) : null,
      h('button', { class: 'icon-btn', 'aria-label': `Xóa ${e.name}`, onclick: () => removeMeal(e.id) }, '✕'));
  }));
  const photo = h('input', {
    type: 'file', accept: 'image/*', capture: 'environment', hidden: true,
    onchange: async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const photoId = await savePhoto(file);
      await addMeal({ meal: key, name: `Ảnh bữa ${label.slice(label.indexOf(' ') + 1).toLowerCase()}`, kcal: 0, photoId, source: 'photo' });
      toast('Đã lưu ảnh bữa ăn. Có thể thêm món kèm theo.');
    },
  });
  return h('section', { class: 'card meal' },
    h('div', { class: 'card-head' },
      h('h3', {}, label, hide || !entries.length ? null : h('span', { class: 'count' }, `${fmt(total.kcal)} kcal`)),
      h('div', { class: 'btn-group' },
        h('label', { class: 'chip file-btn', title: 'Chụp/chọn ảnh bữa ăn' }, '📷', photo),
        h('button', {
          class: 'chip', title: 'Ghi lại các món của bữa này hôm qua',
          onclick: async () => { const n = await repeatYesterday(key); toast(n ? `Đã chép ${n} món từ hôm qua` : 'Hôm qua bữa này chưa ghi món nào'); },
        }, '↻ Như hôm qua'))),
    entries.length ? h('ul', { class: 'log-list' }, items) : h('p', { class: 'muted small' }, 'Chưa ghi.'));
}

function exerciseCard(ex, hide) {
  return h('section', { class: 'card' },
    h('h3', {}, '🏃 Vận động hôm nay', ex.length ? h('span', { class: 'count' }, `${ex.reduce((s, e) => s + e.minutes, 0)} phút`) : null),
    h('form', {
      class: 'form-row', onsubmit: async (e) => {
        e.preventDefault();
        const f = e.target.elements;
        const m = Number(f.minutes.value);
        if (!(m > 0)) return;
        await logExercise(f.kind.value, m);
        toast('Đã ghi vận động 💪');
      },
    },
      h('select', { class: 'input', name: 'kind', 'aria-label': 'Loại vận động' }, EXERCISES.map(([k, l]) => h('option', { value: k }, l))),
      h('label', { class: 'field-inline' }, h('input', { class: 'input num', name: 'minutes', type: 'number', min: '1', max: '600', value: '30', 'aria-label': 'Số phút' }), 'phút'),
      h('button', { class: 'chip', type: 'submit' }, '+ Ghi')),
    ex.length ? h('ul', { class: 'log-list' }, ex.map((e) => h('li', {},
      h('span', { class: 'grow' }, `${EXERCISES.find((x) => x[0] === e.kind)?.[1] ?? e.kind} ${e.minutes} phút`),
      hide ? null : h('span', { class: 'muted small' }, `≈ ${fmt(e.kcal)} kcal`)))) : null);
}

function trendCard(weeks, weights, b) {
  const hide = b.hideNumbers;
  const max = Math.max(...weeks.map((w) => w.avg ?? 0), 1);
  // Cân nặng: trung bình trượt 7 ngày, 60 ngày gần nhất.
  const from = addDays(todayKey(), -59);
  const recent = weights.filter((w) => w.day >= from);
  const smooth = recent.map((w, i) => {
    const win = recent.filter((x) => x.day <= w.day && x.day > addDays(w.day, -7));
    return { day: w.day, kg: win.reduce((s, x) => s + x.kg, 0) / win.length };
  });
  let chart = h('p', { class: 'muted small' }, 'Ghi cân nặng vài lần để thấy xu hướng (không cần cân mỗi ngày).');
  if (smooth.length >= 2) {
    const W = 300, H = 90;
    const lo = Math.min(...smooth.map((s) => s.kg)) - 0.5, hi = Math.max(...smooth.map((s) => s.kg)) + 0.5;
    const x = (d) => ((60 - (toDate(todayKey()) - toDate(d)) / 864e5) / 60) * W;
    const y = (kg) => H - ((kg - lo) / (hi - lo)) * H;
    const pts = smooth.map((s) => `${x(s.day).toFixed(1)},${y(s.kg).toFixed(1)}`).join(' ');
    const last = smooth.at(-1);
    chart = h('div', { class: 'weight-chart', title: `Xu hướng cân nặng (trung bình 7 ngày): ${last.kg.toFixed(1)} kg` },
      svg('svg', { viewBox: `0 0 ${W} ${H + 4}`, role: 'img', 'aria-label': `Xu hướng cân nặng 60 ngày, hiện khoảng ${last.kg.toFixed(1)} kg` },
        svg('polyline', { points: pts, class: 'wline' }),
        svg('circle', { cx: x(last.day), cy: y(last.kg), r: 4, class: 'wdot' })),
      h('p', { class: 'muted small' }, `Khoảng ${last.kg.toFixed(1)} kg (trung bình 7 ngày) · 60 ngày gần nhất`));
  }
  return h('section', { class: 'card' },
    h('h3', {}, '📈 Xu hướng'),
    hide ? h('p', { class: 'muted small' }, 'Đang ẩn con số.') : [
      h('p', { class: 'meta-text' }, 'Trung bình kcal mỗi ngày theo tuần (bỏ qua ngày đặc biệt)'),
      h('div', { class: 'vbars weeks' }, weeks.map((w) => h('div', { class: 'vbar-col', title: w.avg ? `Tuần từ ${toDate(w.start).getDate()}/${toDate(w.start).getMonth() + 1}: ${fmt(w.avg)} kcal (${w.days} ngày có ghi)` : 'Chưa ghi' },
        h('div', { class: 'vbar-area' }, w.avg ? h('div', { class: 'vbar ok', style: `height:${(w.avg / max) * 100}%` }) : null),
        h('span', { class: 'vbar-label' }, `${toDate(w.start).getDate()}/${toDate(w.start).getMonth() + 1}`)))),
      h('h4', {}, 'Cân nặng (tùy chọn)'),
      chart,
    ],
    h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        const kg = Number(e.target.elements.kg.value);
        if (!(kg > 20 && kg < 300)) return;
        await logWeight(kg);
        toast('Đã ghi cân nặng. Nhớ là chỉ cần nhìn xu hướng nhé 🌱');
      },
    }, h('input', { class: 'input num', name: 'kg', type: 'number', step: '0.1', placeholder: 'kg', 'aria-label': 'Cân nặng hôm nay (kg)' }),
      h('button', { class: 'chip', type: 'submit' }, 'Ghi cân nặng')));
}

export async function renderFood(root) {
  const b = await getBody();
  const head = h('div', { class: 'view-head' }, subnav('health', 'food'), h('h2', {}, 'Ăn uống'));
  const disclaimer = h('p', { class: 'muted small disclaimer' },
    'Số kcal chỉ là ước tính để tham khảo. Nếu có bệnh nền, đang mang thai hoặc cho con bú, hãy hỏi bác sĩ hoặc chuyên gia dinh dưỡng.');
  if (!profileReady(b) || editingProfile) {
    mount(root, head, profileCard(b), disclaimer);
    return;
  }
  const t = targets(b);
  const entries = await mealsOn();
  const ex = await exerciseOn();
  const total = sum(entries);
  const special = (await specialDays()).has(todayKey());
  const mine = await myFoods();
  const warn = await lowIntakeWarning();

  mount(root, 
    head,
    summaryCard(b, t, total, ex, entries.length, special),
    warn ? h('section', { class: 'card gentle' },
      '💛 Mấy ngày gần đây bạn ăn ít hơn mức cơ thể cần tối thiểu. Ăn đủ giúp giảm cân bền vững hơn — hãy thêm một bữa phụ nhẹ nhé.') : null,
    addCard(b, mine, await recentFoods(), await favorites()),
    await Promise.all(MEALS.map(([k, label]) => mealSection(k, label, entries.filter((e) => e.meal === k), b.hideNumbers, b.showMacros))),
    exerciseCard(ex, b.hideNumbers),
    h('label', { class: 'switch' },
      h('input', { type: 'checkbox', checked: b.addExercise, onchange: (e) => saveBody({ ...b, addExercise: e.target.checked }) }),
      ' Cộng kcal vận động vào mục tiêu ngày'),
    trendCard(await weeklyAverages(), await weightSeries(), b),
    disclaimer,
  );
}

export { FOODS };
