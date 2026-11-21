// P12.07: đăng nhập Google để chọn nhạc từ tài khoản YouTube của bạn (playlist, video đã thích, tìm kiếm).
// Cần OAuth Client ID do bạn tự tạo ở Google Cloud (app chạy riêng trên máy bạn, không có máy chủ).
// Chỉ xin quyền ĐỌC (youtube.readonly). Mã truy cập chỉ giữ trong bộ nhớ, hết hạn sau ~1 giờ, tải lại trang là mất.
import { getSetting, setSetting } from '../../core/db.js';

const GIS = 'https://accounts.google.com/gsi/client';
const API = 'https://www.googleapis.com/youtube/v3';
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

let token = null; // { value, exp }
let tokenClient = null;

// Client ID của bạn (không phải bí mật — Google cho phép để công khai trong mã web). Điền sẵn để mọi máy đều có.
export const DEFAULT_YT_CLIENT_ID = '814057869589-icne5tiuk761jfs57d60125vj27p3du2.apps.googleusercontent.com';
export async function ytConfig() {
  const c = { clientId: '', ...((await getSetting('youtube')) ?? {}) };
  if (!c.clientId) c.clientId = DEFAULT_YT_CLIENT_ID;
  return c;
}
export async function saveClientId(clientId) { await setSetting('youtube', { ...(await ytConfig()), clientId: clientId.trim() }); tokenClient = null; }
export const signedIn = () => !!token && token.exp > Date.now();

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = GIS; s.async = true;
    s.onload = ok;
    s.onerror = () => fail(new Error('Không tải được thư viện đăng nhập Google. Kiểm tra mạng.'));
    document.head.append(s);
  });
}

// Mở cửa sổ đăng nhập Google; phải gọi trực tiếp từ một cú bấm.
export async function signIn() {
  const { clientId } = await ytConfig();
  if (!clientId) throw new Error('Chưa có Client ID.');
  await loadGis();
  return new Promise((ok, fail) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) => {
        if (r.error) { fail(new Error(r.error === 'access_denied' ? 'Bạn đã từ chối cấp quyền.' : `Đăng nhập lỗi: ${r.error}`)); return; }
        token = { value: r.access_token, exp: Date.now() + (Number(r.expires_in) - 60) * 1000 };
        ok();
      },
      error_callback: (e) => fail(new Error(e?.type === 'popup_closed' ? 'Cửa sổ đăng nhập đã bị đóng.' : e?.type === 'popup_failed_to_open' ? 'Trình duyệt chặn cửa sổ bật lên. Cho phép popup rồi thử lại.' : 'Không đăng nhập được.')),
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function signOut() {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token.value, () => {});
  token = null;
}

async function call(path, params) {
  if (!signedIn()) { token = null; throw new Error('Phiên đăng nhập đã hết. Bấm Đăng nhập lại.'); }
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token.value}` } });
  if (res.status === 401) { token = null; throw new Error('Phiên đăng nhập đã hết. Bấm Đăng nhập lại.'); }
  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    const reason = body?.error?.errors?.[0]?.reason;
    throw new Error(reason === 'quotaExceeded' ? 'Hết lượt gọi YouTube hôm nay (hạn mức miễn phí). Thử lại ngày mai.' : 'YouTube từ chối. Kiểm tra đã bật “YouTube Data API v3” trong Google Cloud chưa.');
  }
  if (!res.ok) throw new Error(`YouTube lỗi ${res.status}.`);
  return res.json();
}

const thumb = (sn) => sn?.thumbnails?.medium?.url ?? sn?.thumbnails?.default?.url ?? '';

export async function myPlaylists() {
  const r = await call('playlists', { part: 'snippet,contentDetails', mine: 'true', maxResults: '50' });
  return r.items.map((p) => ({ kind: 'playlist', id: p.id, title: p.snippet.title, thumb: thumb(p.snippet), count: p.contentDetails?.itemCount }));
}
export async function likedVideos() {
  const r = await call('videos', { part: 'snippet', myRating: 'like', maxResults: '30' });
  return r.items.map((v) => ({ kind: 'video', id: v.id, title: v.snippet.title, thumb: thumb(v.snippet), by: v.snippet.channelTitle }));
}
// Tìm kiếm tốn 100 đơn vị hạn mức/lần (mặc định 10.000/ngày ≈ 100 lần tìm).
export async function searchYt(q) {
  const r = await call('search', { part: 'snippet', q, type: 'video,playlist', maxResults: '12', safeSearch: 'moderate' });
  return r.items.map((it) => ({
    kind: it.id.kind === 'youtube#playlist' ? 'playlist' : 'video',
    id: it.id.playlistId ?? it.id.videoId, title: it.snippet.title, thumb: thumb(it.snippet), by: it.snippet.channelTitle,
    live: it.snippet.liveBroadcastContent === 'live',
  })).filter((x) => x.id);
}

export const linkOf = (item) => (item.kind === 'playlist'
  ? `https://www.youtube.com/playlist?list=${item.id}`
  : `https://www.youtube.com/watch?v=${item.id}`);
