// P23: thẻ Cài đặt "Đồng bộ nhiều máy".
import { h } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { syncConfig, setSyncConfig, signUp, signIn, signOut, signedInEmail, syncNow, syncState } from '../../core/sync.js';

const STATUS = { off: '⚪ Chưa bật', syncing: '🔄 Đang đồng bộ…', ok: '🟢 Đã đồng bộ', error: '🔴 Lỗi', offline: '🟠 Mất mạng — sẽ đồng bộ khi có mạng' };

export function syncCard() {
  const cfg = syncConfig();
  const email = signedInEmail();
  const head = h('h3', {}, '☁️ Đồng bộ máy tính · điện thoại · iPad');
  if (!cfg.url) {
    return h('section', { class: 'card' }, head,
      h('p', { class: 'muted small' }, 'Cần dự án Supabase (miễn phí). Dán Project URL và Publishable/anon key vào đây (hoặc nhờ mình điền sẵn vào app).'),
      h('form', {
        class: 'sync-form', onsubmit: (e) => {
          e.preventDefault();
          const f = e.target.elements;
          if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(f.u.value.trim())) { toast('URL phải dạng https://xxxx.supabase.co'); return; }
          setSyncConfig(f.u.value, f.k.value); notifyChange(); toast('Đã lưu. Giờ tạo tài khoản / đăng nhập.');
        },
      }, h('input', { class: 'input', name: 'u', placeholder: 'https://xxxx.supabase.co', 'aria-label': 'Project URL' }),
        h('input', { class: 'input', name: 'k', placeholder: 'Publishable / anon key', 'aria-label': 'Anon key' }),
        h('button', { class: 'btn', type: 'submit' }, 'Lưu')));
  }
  if (!email) {
    const go = (fn) => async (e) => {
      const form = e.currentTarget.form;
      const em = form.elements.e.value.trim(), pw = form.elements.p.value;
      if (!em || pw.length < 8) { toast('Nhập email và mật khẩu từ 8 ký tự'); return; }
      try {
        if (fn === 'up') {
          const r = await signUp(em, pw);
          if (r === 'confirm') { toast('📧 Đã gửi email xác nhận. Mở hộp thư, bấm link, rồi quay lại bấm Đăng nhập.', { duration: 12000 }); return; }
          await signIn(em, pw);
        } else await signIn(em, pw);
        toast('✅ Đã bật đồng bộ cho máy này'); notifyChange();
      } catch (err) { toast(err.message, { duration: 9000 }); }
    };
    return h('section', { class: 'card' }, head,
      h('p', { class: 'muted small' }, 'Dùng CÙNG một email + mật khẩu trên mọi máy. Lần đầu bấm “Tạo tài khoản”, các máy sau bấm “Đăng nhập”.'),
      h('form', { class: 'sync-form', onsubmit: (e) => e.preventDefault() },
        h('input', { class: 'input', name: 'e', type: 'email', autocomplete: 'email', placeholder: 'Email', 'aria-label': 'Email' }),
        h('input', { class: 'input', name: 'p', type: 'password', autocomplete: 'current-password', placeholder: 'Mật khẩu (từ 8 ký tự)', 'aria-label': 'Mật khẩu' }),
        h('div', { class: 'presets' },
          h('button', { class: 'btn', type: 'button', onclick: go('in') }, 'Đăng nhập'),
          h('button', { class: 'chip', type: 'button', onclick: go('up') }, 'Tạo tài khoản'))));
  }
  return h('section', { class: 'card' }, head,
    h('p', {}, `Đang đồng bộ với tài khoản ${email}`),
    h('p', { class: 'small sync-line' }, STATUS[syncState.status] ?? '', syncState.lastSync ? ` · lần cuối ${syncState.lastSync.toLocaleTimeString('vi-VN')}` : '', syncState.error ? ` · ${syncState.error}` : ''),
    h('p', { class: 'muted small' }, 'Thêm/sửa trên máy nào, các máy khác cập nhật trong khoảng 15 giây khi đang mở app. Ảnh (nhật ký, nhân vật, ảnh đại diện) chưa đồng bộ — chỉ lưu trên máy đã tải.'),
    h('div', { class: 'presets' },
      h('button', { class: 'btn', onclick: async () => { await syncNow(); toast(syncState.status === 'ok' ? '✅ Đã đồng bộ' : `Chưa đồng bộ được: ${syncState.error ?? ''}`); notifyChange(); } }, '🔄 Đồng bộ ngay'),
      h('button', { class: 'chip', onclick: () => { if (confirm('Ngừng đồng bộ trên máy này? Dữ liệu trên máy vẫn giữ nguyên.')) { signOut(); notifyChange(); } } }, 'Đăng xuất')));
}
