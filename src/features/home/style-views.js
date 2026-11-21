// P7.10 mood board · P7.11 tủ đồ thật (chụp, gắn nhãn, phối theo lịch hẹn và thời tiết, tránh mua trùng).
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { getSetting, setSetting } from '../../core/db.js';
import { todayKey } from '../../core/time.js';
import { savePhoto, photoUrl, deletePhoto } from '../../core/photos.js';
import { listOpenTasks } from '../tasks/tasks.js';
import { STYLES, SEASONS, OCCASIONS } from './catalog.js';
import { boards, saveBoards, removePin, closet, saveCloset, similarIn } from './home.js';

const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };

// ---------- Mood board ----------
let boardId = null;
export async function renderMoodboard(root) {
  const list = await boards();
  boardId = list.some((b) => b.id === boardId) ? boardId : list[0].id;
  const b = list.find((x) => x.id === boardId);
  const pins = await Promise.all(b.pins.map(async (p, i) => {
    const url = p.photoId ? await photoUrl(p.photoId) : null;
    const link = safeUrl(p.url ?? '');
    return h('figure', { class: 'pin' },
      url ? h('img', { src: url, alt: p.note || 'Ảnh cảm hứng', loading: 'lazy' })
        : h('a', { class: 'pin-link', href: link ?? '#', target: '_blank', rel: 'noopener noreferrer' }, '📌 ', link ? new URL(link).hostname : 'link'),
      p.note ? h('figcaption', {}, p.note) : null,
      p.tags?.length ? h('div', { class: 'presets' }, p.tags.map((t) => h('span', { class: 'meta-chip' }, t))) : null,
      h('button', { class: 'icon-btn pin-x', 'aria-label': 'Gỡ ảnh này', onclick: () => removePin(b.id, i) }, '✕'));
  }));
  const tagSel = h('select', { class: 'input', name: 'tag', 'aria-label': 'Nhãn phong cách' }, h('option', { value: '' }, 'nhãn…'), [...STYLES, ...SEASONS, ...OCCASIONS].map((t) => h('option', { value: t }, t)));
  mount(root,
    h('div', { class: 'view-head' }, subnav('home', 'moodboard'), h('h2', {}, 'Mood board')),
    h('div', { class: 'toolbar' },
      h('div', { class: 'btn-group' }, list.map((x) => h('button', { class: `chip${x.id === boardId ? ' on' : ''}`, onclick: () => { boardId = x.id; notifyChange(); } }, x.name))),
      h('form', {
        class: 'inline-form', onsubmit: async (e) => {
          e.preventDefault();
          const name = e.target.elements.n.value.trim();
          if (!name) return;
          const id = `b${Date.now()}`;
          await saveBoards([...list, { id, name, pins: [] }]);
          boardId = id;
        },
      }, h('input', { class: 'input', name: 'n', placeholder: 'Bảng mới', maxlength: '30', 'aria-label': 'Tên bảng mới' }), h('button', { class: 'chip', type: 'submit' }, '+'))),
    h('section', { class: 'card' },
      h('form', {
        class: 'form-row', onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const file = f.photo.files[0];
          const url = safeUrl(f.url.value.trim());
          if (!file && !url) { toast('Chọn ảnh hoặc dán link (ví dụ link pin Pinterest)'); return; }
          const pin = { note: f.note.value.trim(), tags: f.tag.value ? [f.tag.value] : [], url, photoId: file ? await savePhoto(file) : null };
          b.pins.unshift(pin);
          await saveBoards(list);
          e.target.reset();
        },
      },
        h('label', { class: 'chip file-btn' }, '📷 Ảnh', h('input', { type: 'file', name: 'photo', accept: 'image/*', hidden: true })),
        h('input', { class: 'input', name: 'url', type: 'url', placeholder: 'hoặc dán link pin', 'aria-label': 'Link tham khảo' }),
        h('input', { class: 'input', name: 'note', placeholder: 'Ghi chú', 'aria-label': 'Ghi chú' }),
        tagSel, h('button', { class: 'chip', type: 'submit' }, '+ Ghim')),
      h('p', { class: 'muted small' }, 'Link chỉ được lưu lại để mở, app không tải nội dung từ Pinterest.')),
    pins.length ? h('div', { class: 'pin-grid' }, pins) : h('p', { class: 'muted small' }, 'Bảng còn trống.'));
}

// ---------- Tủ đồ thật ----------
const CATS = ['Áo', 'Quần', 'Váy/đầm', 'Áo khoác', 'Giày', 'Túi', 'Phụ kiện'];
let weather = null;

// Thời tiết (tùy chọn): chỉ gửi tên thành phố tới Open-Meteo khi bạn bấm "Xem thời tiết".
async function fetchWeather(city) {
  const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=vi`)).json();
  const p = geo.results?.[0];
  if (!p) throw new Error('Không tìm thấy thành phố.');
  const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`)).json();
  return { city: p.name, max: w.daily.temperature_2m_max[0], min: w.daily.temperature_2m_min[0], rain: w.daily.precipitation_probability_max[0] };
}
export function weatherAdvice(wx) {
  const season = wx.max >= 26 ? 'xuân hè' : wx.max <= 20 ? 'thu đông' : null;
  const tips = [];
  if (wx.max >= 30) tips.push('trời nóng: chọn đồ mỏng, sáng màu');
  if (wx.max <= 20) tips.push('trời lạnh: thêm áo khoác');
  if (wx.max - wx.min >= 8) tips.push('chênh lệch nhiệt độ: mặc nhiều lớp');
  if (wx.rain >= 50) tips.push('có thể mưa: mang ô, tránh giày vải');
  return { season, tips };
}

function suggest(items, occasion, season) {
  const pick = (cat) => items.find((x) => x.category === cat && (!occasion || x.tags?.includes(occasion)) && (!season || !x.season || x.season === season))
    ?? items.find((x) => x.category === cat && (!season || !x.season || x.season === season));
  const dress = pick('Váy/đầm');
  const parts = dress ? [dress] : [pick('Áo'), pick('Quần')];
  if (season === 'thu đông') parts.push(pick('Áo khoác'));
  parts.push(pick('Giày'), pick('Túi'));
  return parts.filter(Boolean);
}

export async function renderCloset(root) {
  const items = await closet();
  const city = (await getSetting('weatherCity')) ?? '';
  const urls = new Map(await Promise.all(items.filter((x) => x.photoId).map(async (x) => [x.photoId, await photoUrl(x.photoId)])));
  const today = todayKey();
  const appts = (await listOpenTasks()).filter((t) => t.dueDate === today && t.dueTime);
  const advice = weather ? weatherAdvice(weather) : null;
  const occ = appts.some((t) => /họp|làm|văn phòng|meeting/i.test(t.title)) ? 'đi làm' : appts.some((t) => /tiệc|cưới|sinh nhật/i.test(t.title)) ? 'dự tiệc' : null;
  const outfit = items.length ? suggest(items, occ, advice?.season) : [];
  const thumb = (x) => (urls.get(x.photoId) ? h('img', { src: urls.get(x.photoId), alt: x.name }) : h('span', { class: 'thumb-ph' }, '👕'));

  mount(root,
    h('div', { class: 'view-head' }, subnav('home', 'closet'), h('h2', {}, 'Tủ đồ thật')),
    h('section', { class: 'card' },
      h('h3', {}, '☀️ Hôm nay mặc gì?'),
      h('form', {
        class: 'inline-form', onsubmit: async (e) => {
          e.preventDefault();
          const c = e.target.elements.city.value.trim();
          if (!c) return;
          await setSetting('weatherCity', c);
          try { weather = await fetchWeather(c); } catch (err) { toast(err.message || 'Không lấy được thời tiết'); }
          notifyChange();
        },
      }, h('input', { class: 'input', name: 'city', value: city, placeholder: 'Thành phố (VD: Hà Nội)', 'aria-label': 'Thành phố' }), h('button', { class: 'chip', type: 'submit' }, 'Xem thời tiết')),
      h('p', { class: 'muted small' }, 'Thời tiết lấy từ Open-Meteo (miễn phí), chỉ gửi tên thành phố khi bạn bấm.'),
      weather ? h('p', {}, `${weather.city}: ${Math.round(weather.min)}–${Math.round(weather.max)}°C, khả năng mưa ${weather.rain}%. `, advice.tips.join('; ')) : null,
      appts.length ? h('p', { class: 'small' }, `Lịch hôm nay: ${appts.map((t) => `${t.dueTime} ${t.title}`).join(', ')}${occ ? ` → gợi ý phong cách ${occ}` : ''}`) : null,
      outfit.length ? h('div', { class: 'closet-row' }, outfit.map((x) => h('div', { class: 'closet-item' }, thumb(x), h('span', { class: 'small' }, x.name)))) : h('p', { class: 'muted small' }, 'Thêm đồ vào tủ để nhận gợi ý phối.')),
    h('section', { class: 'card' },
      h('h3', {}, '➕ Thêm đồ thật'),
      h('form', {
        class: 'form-row', onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const item = { id: `w${Date.now()}`, name: f.name.value.trim() || f.category.value, category: f.category.value, color: f.color.value.trim(), season: f.season.value || null, tags: f.occasion.value ? [f.occasion.value] : [] };
          const dup = similarIn(items, item);
          if (dup.length && !confirm(`Bạn đã có ${dup.length} món ${item.category.toLowerCase()} màu ${item.color}: ${dup.map((d) => d.name).join(', ')}. Vẫn thêm?`)) return;
          if (f.photo.files[0]) item.photoId = await savePhoto(f.photo.files[0]);
          await saveCloset([...items, item]);
          e.target.reset();
          toast('Đã thêm vào tủ đồ');
        },
      },
        h('label', { class: 'chip file-btn' }, '📷 Chụp', h('input', { type: 'file', name: 'photo', accept: 'image/*', capture: 'environment', hidden: true })),
        h('input', { class: 'input', name: 'name', placeholder: 'Tên (áo sơ mi trắng…)', 'aria-label': 'Tên món đồ' }),
        h('select', { class: 'input', name: 'category', 'aria-label': 'Loại' }, CATS.map((c) => h('option', { value: c }, c))),
        h('input', { class: 'input num', name: 'color', placeholder: 'màu', 'aria-label': 'Màu' }),
        h('select', { class: 'input', name: 'season', 'aria-label': 'Mùa' }, h('option', { value: '' }, 'mọi mùa'), SEASONS.map((s) => h('option', { value: s }, s))),
        h('select', { class: 'input', name: 'occasion', 'aria-label': 'Dịp' }, h('option', { value: '' }, 'dịp…'), OCCASIONS.map((o) => h('option', { value: o }, o))),
        h('button', { class: 'chip', type: 'submit' }, '+ Thêm')),
      h('p', { class: 'muted small' }, 'Thêm món trùng loại và màu với món đã có, app sẽ hỏi lại để tránh mua trùng. Ảnh chỉ lưu trên máy này.')),
    items.length ? h('section', { class: 'card' },
      h('h3', {}, `👚 Trong tủ (${items.length})`),
      CATS.filter((c) => items.some((x) => x.category === c)).map((c) => [h('h4', {}, c),
        h('div', { class: 'closet-row' }, items.filter((x) => x.category === c).map((x) => h('div', { class: 'closet-item' },
          thumb(x), h('span', { class: 'small' }, x.name, x.color ? ` · ${x.color}` : ''),
          h('button', { class: 'icon-btn', 'aria-label': `Xóa ${x.name}`, onclick: async () => { if (!confirm('Xóa món này khỏi tủ?')) return; if (x.photoId) await deletePhoto(x.photoId); await saveCloset(items.filter((y) => y.id !== x.id)); } }, '✕'))))])) : null);
}
