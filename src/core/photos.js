// Ảnh: thu nhỏ trước khi lưu (cạnh dài tối đa 1024px, JPEG) để tiết kiệm dung lượng.
import { get, put, del } from './db.js';

// Đọc ảnh: createImageBitmap, dự phòng bằng <img> (một số trình duyệt không đọc được HEIC qua createImageBitmap).
async function decode(file) {
  try { return await createImageBitmap(file); } catch { /* thử cách khác */ }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 2000); }
}

export async function shrink(file, maxSide = 1024, quality = 0.8) {
  const bmp = await decode(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width || bmp.naturalWidth, bmp.height || bmp.naturalHeight));
  const canvas = document.createElement('canvas');
  const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight;
  canvas.width = Math.round(w0 * scale);
  canvas.height = Math.round(h0 * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

// P35: nhật ký lưu ảnh 1600px (rõ nét kiểu Instagram); ảnh khác mặc định 1024px.
export async function savePhoto(file, maxSide = 1024) {
  let blob;
  try { blob = await shrink(file, maxSide, maxSide > 1024 ? 0.88 : 0.8); } catch { blob = file; } // không đọc được thì giữ ảnh gốc
  const id = await put('photos', { blob, at: new Date().toISOString() });
  import('./sync.js').then((m) => m.uploadPhoto(id, blob)).catch(() => {}); // đồng bộ sang các máy khác
  return id;
}

export async function deletePhoto(id) {
  await del('photos', id);
  import('./sync.js').then((m) => m.deleteRemotePhoto(id)).catch(() => {});
}

const urls = new Map();
// URL tạm để hiển thị ảnh (giữ lại để không tạo lặp).
export async function photoUrl(id) {
  if (urls.has(id)) return urls.get(id);
  let rec = await get('photos', id);
  if (!rec) { // chưa có trên máy này → tải từ kho đồng bộ (nếu đã đăng nhập)
    const blob = await import('./sync.js').then((m) => m.downloadPhoto(id)).catch(() => null);
    if (!blob) return null;
    rec = { id, blob, at: new Date().toISOString() };
  }
  const url = URL.createObjectURL(rec.blob);
  urls.set(id, url);
  return url;
}
