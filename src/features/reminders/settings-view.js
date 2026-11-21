// Cài đặt giờ phân loại Inbox và quyền thông báo.
import { h, mount } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { getTriageSettings, saveTriageSettings } from './triage-reminder.js';
import { getLeadMin, setLeadMin } from '../calendar/appt-reminder.js';
import { exportData, importData, lastBackup } from '../backup/backup.js';
import { pinSettings } from '../../core/lock.js';
import { aiSettings, saveApiKey, setProvider, provider, modelLabel, ask } from '../ai/claude.js';

function permissionText() {
  if (!('Notification' in window)) return 'Trình duyệt này không hỗ trợ thông báo.';
  return {
    granted: 'Đã bật thông báo trình duyệt.',
    denied: 'Thông báo đang bị chặn. Bật lại trong cài đặt trang của trình duyệt.',
    default: 'Chưa bật thông báo. App vẫn hiện banner khi đang mở.',
  }[Notification.permission];
}

export async function renderSettings(root) {
  const state = await getTriageSettings();
  const lead = await getLeadMin();
  const backupAt = await lastBackup();
  const ai = await aiSettings();
  const save = async () => {
    await saveTriageSettings(state);
    toast('Đã lưu cài đặt');
  };

  const timeRow = (t, i) => h('li', { class: 'time-row' },
    h('input', {
      type: 'time', value: t, 'aria-label': `Giờ nhắc ${i + 1}`,
      onchange: (e) => { state.times[i] = e.target.value; save(); },
    }),
    h('button', {
      class: 'icon-btn', 'aria-label': 'Bỏ giờ này',
      onclick: async () => { state.times.splice(i, 1); await save(); notifyChange(); },
    }, '✕'));

  mount(root, 
    h('div', { class: 'view-head' }, h('h2', {}, 'Cài đặt')),
    (await import('./sync-card.js')).syncCard(),
    await (await import('./scene-card.js')).sceneCard(),
    await profileCard(),
    await seasonCard(),
    lookCard(),
    (await import('../greet/greet.js')).greetCard(h),
    h('section', { class: 'card' },
      h('h3', {}, 'Giờ phân loại Inbox'),
      h('p', { class: 'muted small' },
        'Đến giờ này, nếu Inbox còn việc, app sẽ nhắc bạn sắp xếp. Mỗi giờ chỉ nhắc 1 lần/ngày.'),
      h('label', { class: 'switch' },
        h('input', {
          type: 'checkbox', checked: state.enabled,
          onchange: (e) => { state.enabled = e.target.checked; save(); },
        }),
        ' Bật nhắc'),
      h('ul', { class: 'time-list' }, state.times.map(timeRow)),
      h('button', {
        class: 'btn',
        onclick: async () => { state.times.push('12:00'); await save(); notifyChange(); },
      }, '+ Thêm giờ')),
    h('section', { class: 'card' },
      h('h3', {}, 'Nhắc lịch hẹn'),
      h('label', { class: 'field-inline' }, 'Nhắc trước',
        h('select', {
          class: 'input', 'aria-label': 'Số phút nhắc trước giờ hẹn',
          onchange: async (e) => { await setLeadMin(Number(e.target.value)); toast('Đã lưu cài đặt'); },
        }, [5, 10, 15, 30, 60].map((n) => h('option', { value: n, selected: n === lead }, `${n} phút`))))),
    await aiCard(),
    await (await import('../../core/device-link.js')).deviceLinkCard(toast),
    h('section', { class: 'card' },
      h('h3', {}, '🔒 Khóa PIN'),
      h('p', { class: 'muted small' }, 'Che nhật ký và tài chính khỏi người khác cầm máy. PIN không mã hóa dữ liệu trong trình duyệt.'),
      await pinSettings('journal', 'Nhật ký', notifyChange),
      await pinSettings('finance', 'Tài chính', notifyChange)),
    h('section', { class: 'card' },
      h('h3', {}, 'Sao lưu dữ liệu'),
      h('p', { class: 'muted small' },
        'Dữ liệu chỉ nằm trên trình duyệt của máy này. Thỉnh thoảng hãy xuất file để không bị mất. ',
        backupAt ? `Lần gần nhất: ${new Date(backupAt).toLocaleString('vi-VN')}.` : 'Bạn chưa sao lưu lần nào.'),
      h('div', { class: 'presets' },
        h('button', {
          class: 'btn', onclick: async () => {
            const n = await exportData();
            toast(`Đã xuất ${n.tasks} việc và ${n.events} sự kiện`);
          },
        }, '⬇ Xuất file sao lưu'),
        h('label', { class: 'chip file-btn' }, '⬆ Nhập từ file',
          h('input', {
            type: 'file', accept: 'application/json,.json', hidden: true,
            onchange: async (e) => {
              const file = e.target.files[0];
              e.target.value = '';
              if (!file) return;
              if (!confirm('Nhập file sẽ THAY THẾ toàn bộ dữ liệu hiện tại trên máy này (app tự chụp một bản sao trước khi nhập). Tiếp tục?')) return;
              try {
                const { snapshot } = await import('../../core/safety.js');
                await snapshot('truoc-nhap-file');
                const n = await importData(file);
                toast(`Đã nhập ${n.tasks} việc và ${n.events} sự kiện`);
              } catch (err) {
                toast(`Không nhập được: ${err.message}`, { duration: 8000 });
              }
            },
          }))),
      await snapshotsBlock()),
    h('section', { class: 'card' },
      h('h3', {}, 'Thông báo'),
      h('p', { class: 'muted small' }, permissionText()),
      'Notification' in window && Notification.permission === 'default'
        ? h('button', {
            class: 'btn',
            onclick: async () => { await Notification.requestPermission(); notifyChange(); },
          }, 'Bật thông báo trình duyệt')
        : null),
  );
}

// P13: chọn giao diện (lưu riêng trên máy này).
function lookCard() {
  const cur = document.documentElement.classList.contains('clean') ? 'clean' : 'cozy';
  const set = (v) => {
    document.documentElement.classList.toggle('clean', v === 'clean');
    try { localStorage.setItem('look', v); } catch { /* chế độ riêng tư: chỉ áp dụng phiên này */ }
    document.querySelectorAll('.look-pick .chip').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  };
  return h('section', { class: 'card' },
    h('h3', {}, '🎨 Giao diện'),
    h('div', { class: 'presets look-pick', role: 'radiogroup', 'aria-label': 'Giao diện' },
      [['clean', '✨ Nổi khối 3D (theo mùa lễ)'], ['cozy', '🌸 Ấm áp (kem, hồng phấn)']].map(([v, label]) => h('button', {
        class: `chip${cur === v ? ' on' : ''}`, role: 'radio', 'aria-checked': String(cur === v), dataset: { v }, onclick: () => set(v),
      }, label))),
    h('p', { class: 'muted small' }, 'Phần Nhà & vườn luôn giữ tranh vẽ ấm áp ở cả hai giao diện.'),
    h('label', { class: 'field-inline' },
      h('input', {
        type: 'checkbox', checked: document.documentElement.classList.contains('lite'),
        onchange: (e) => { document.documentElement.classList.toggle('lite', e.target.checked); try { localStorage.setItem('lite', e.target.checked ? '1' : '0'); } catch { /* bỏ qua */ } },
      }), '⚡ Chế độ nhẹ — tắt tuyết rơi, đèn nháy và hiệu ứng chuyển động (máy yếu / tiết kiệm pin)'),
    h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        const { setSetting } = await import('../../core/db.js');
        await setSetting('profileName', e.target.elements.n.value.trim().slice(0, 30) || null);
        toast('Đã lưu tên gọi');
      },
    }, h('label', { class: 'field-inline' }, 'Tên gọi trên lời chào', h('input', { class: 'input', name: 'n', maxlength: '30', placeholder: 'VD: Linh', 'aria-label': 'Tên gọi' })),
      h('button', { class: 'chip', type: 'submit' }, 'Lưu')));
}

// P16.01: ảnh đại diện.
async function profileCard() {
  const { getProfile, setBow, setStyle, setPhoto, clearPhoto, avatarEl, BOW_COLORS } = await import('../../core/profile.js');
  const p = await getProfile();
  return h('section', { class: 'card profile-card' },
    h('h3', {}, '🎀 Ảnh đại diện'),
    h('div', { class: 'profile-row' },
      await avatarEl('settings-pfp'),
      h('div', { class: 'grow' },
        h('div', { class: 'presets' },
          h('label', { class: 'chip file-chip' }, '📷 Tải ảnh của bạn…', h('input', {
            type: 'file', accept: 'image/*', hidden: true,
            onchange: async (e) => { const f = e.target.files?.[0]; if (f) { await setPhoto(f); toast('Đã đổi ảnh đại diện'); } },
          })),
          p.photoId ? h('button', { class: 'chip', onclick: () => clearPhoto() }, '↺ Dùng hình vẽ mặc định') : null),
        p.photoId ? null : h('div', { class: 'presets', role: 'radiogroup', 'aria-label': 'Kiểu hình vẽ' },
          [['photo', '🌟 Ảnh 3D'], ['svg3d', '💁‍♀️ Hình vẽ cô gái'], ['bow', '🎀 Cô bé nơ đỏ']].map(([k, l]) => h('button', {
            class: `chip${(p.style === '3d' ? 'photo' : p.style) === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(p.style === k), onclick: () => setStyle(k),
          }, l))),
        p.photoId || p.style !== 'bow' ? null : h('div', { class: 'presets', role: 'radiogroup', 'aria-label': 'Màu nơ' },
          h('span', { class: 'meta-text' }, 'Màu nơ:'),
          BOW_COLORS.map((c) => h('button', {
            class: `swatch${c === p.bow ? ' on' : ''}`, style: `--pc:${c}`, role: 'radio', 'aria-checked': String(c === p.bow), 'aria-label': `Màu nơ ${c}`,
            onclick: () => setBow(c),
          }))),
        h('p', { class: 'muted small' }, 'Ảnh tải lên chỉ lưu trên máy này, không đưa lên web.'))));
}

// P16.02: nền theo mùa / lễ.
async function seasonCard() {
  const { SEASONS, seasonFor, applySeason } = await import('../../core/season.js');
  const { getSetting, setSetting } = await import('../../core/db.js');
  const pref = (await getSetting('seasonPref')) ?? 'auto';
  const auto = SEASONS.find((x) => x.id === seasonFor());
  const set = async (v) => { await setSetting('seasonPref', v); await applySeason(); notifyChange(); };
  return h('section', { class: 'card' },
    h('h3', {}, '🎄 Nền theo mùa & lễ hội'),
    h('div', { class: 'presets', role: 'radiogroup', 'aria-label': 'Nền theo mùa' },
      h('button', { class: `chip${pref === 'auto' ? ' on' : ''}`, role: 'radio', 'aria-checked': String(pref === 'auto'), onclick: () => set('auto') }, `✨ Tự động (đang: ${auto.icon} ${auto.name})`),
      SEASONS.map((x) => h('button', { class: `chip${pref === x.id ? ' on' : ''}`, role: 'radio', 'aria-checked': String(pref === x.id), onclick: () => set(x.id) }, `${x.icon} ${x.name}`))),
    h('p', { class: 'muted small' }, 'Tự động: Giáng sinh 15/11–27/12, Tết (10 ngày trước đến 7 ngày sau mùng 1), Valentine, Trung thu, Halloween; ngoài dịp lễ thì theo mùa.'));
}

// P19: bản sao tự động trên máy + khôi phục.
async function snapshotsBlock() {
  const { listSnapshots, restoreSnapshot, snapshot } = await import('../../core/safety.js');
  const list = await listSnapshots();
  const persisted = await navigator.storage?.persisted?.().catch(() => false);
  const label = (x) => `${new Date(x.at).toLocaleString('vi-VN')} · ${x.counts.tasks} việc, ${x.counts.events} sự kiện${x.reason !== 'daily' ? ` (${x.reason.replace(/-/g, ' ')})` : ''}`;
  return h('details', { class: 'snaps' },
    h('summary', {}, `🛟 Bản sao tự động trên máy (${list.length})`),
    h('p', { class: 'muted small' },
      'Mỗi ngày app tự chụp một bản sao, giữ 14 bản gần nhất, và chụp thêm trước khi nhập file hoặc khôi phục. Đổi giao diện hay nâng cấp app không xóa dữ liệu của bạn. ',
      persisted ? '✅ Trình duyệt đã đồng ý lưu bền (không tự xóa).' : 'Trình duyệt chưa xác nhận lưu bền — vẫn nên xuất file định kỳ.'),
    h('div', { class: 'presets' }, h('button', { class: 'chip', onclick: async () => { const n = await snapshot('chup-tay'); toast(`Đã chụp: ${n.tasks} việc, ${n.events} sự kiện`); notifyChange(); } }, '📸 Chụp ngay')),
    list.length ? h('ul', { class: 'snap-list' }, list.map((x) => h('li', {},
      h('span', { class: 'grow small' }, label(x)),
      h('button', {
        class: 'chip', onclick: async () => {
          if (!confirm(`Khôi phục dữ liệu về bản ${new Date(x.at).toLocaleString('vi-VN')}? Dữ liệu hiện tại sẽ được chụp lại trước để có thể quay về.`)) return;
          const n = await restoreSnapshot(x.id);
          toast(`Đã khôi phục ${n.tasks} việc, ${n.events} sự kiện`);
          notifyChange();
        },
      }, 'Khôi phục')))) : h('p', { class: 'muted small' }, 'Chưa có bản sao nào.'));
}

// P33: Trợ lý AI — Gemini (miễn phí) hoặc Claude (trả phí).
async function aiCard() {
  const s = await aiSettings();
  const p = await provider();
  const mask = (k) => (k ? `…${k.slice(-4)}` : '');
  const test = async (e) => {
    const b = e.currentTarget; b.disabled = true; b.textContent = 'Đang kiểm tra…';
    try { const r = await ask({ system: 'Trả lời ngắn.', messages: [{ role: 'user', content: 'Chỉ trả lời: OK' }], maxTokens: 20 }); toast(r.text ? '✅ AI hoạt động tốt!' : '⚠️ AI không trả lời'); } catch (err) { toast(`❌ ${err.message}`, { duration: 9000 }); }
    b.disabled = false; b.textContent = 'Kiểm tra';
  };
  return h('section', { class: 'card' },
    h('h3', {}, '🤖 Trợ lý AI'),
    h('p', { class: 'muted small' }, `Đang dùng: ${await modelLabel()}. Chỉ gửi tóm tắt con số và câu bạn gõ — không gửi nhật ký, số tiền, ảnh.`),
    s.geminiKey && s.apiKey ? h('div', { class: 'presets', role: 'radiogroup', 'aria-label': 'Nhà cung cấp AI' },
      [['gemini', '🆓 Gemini (miễn phí)'], ['claude', '💳 Claude (trả phí)']].map(([k, l]) => h('button', { class: `chip${p === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(p === k), onclick: () => setProvider(k) }, l))) : null,
    h('div', { class: 'presets' },
      s.geminiKey ? h('span', { class: 'meta-chip' }, `Gemini ${mask(s.geminiKey)}`) : null,
      s.apiKey ? h('span', { class: 'meta-chip' }, `Claude ${mask(s.apiKey)}`) : null,
      p ? h('button', { class: 'chip', onclick: test }, 'Kiểm tra') : null,
      p ? h('a', { class: 'chip', href: '#ai' }, 'Mở trò chuyện') : null,
      p ? h('button', { class: 'chip', onclick: async () => { if (confirm('Xóa khóa AI trên mọi máy?')) { await saveApiKey(''); toast('Đã xóa khóa'); } } }, 'Xóa khóa') : null),
    h('form', { class: 'inline-form', onsubmit: async (e) => { e.preventDefault(); const v = e.target.elements.k.value.trim(); if (v) { const k = await saveApiKey(v); toast(k === 'gemini' ? 'Đã lưu khóa Gemini' : 'Đã lưu khóa Claude'); } } },
      h('input', { class: 'input', name: 'k', type: 'password', autocomplete: 'off', placeholder: p ? 'Thêm/đổi khóa: AIza…, AQ.… hoặc sk-ant-…' : 'Dán khóa: AIza… hoặc AQ.… (Gemini, miễn phí) hoặc sk-ant-…', 'aria-label': 'Khóa AI' }),
      h('button', { class: 'chip', type: 'submit' }, 'Lưu')),
    p ? null : h('p', { class: 'muted small' }, 'Lấy khóa miễn phí: aistudio.google.com/apikey → Create API key.'));
}
