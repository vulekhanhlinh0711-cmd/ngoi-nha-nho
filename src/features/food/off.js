// P3.18: tra mã vạch qua Open Food Facts (chỉ gửi đi số mã vạch, không gửi gì khác).
export async function lookupBarcode(code) {
  const clean = String(code).replace(/\D/g, '');
  if (clean.length < 8) throw new Error('Mã vạch phải có ít nhất 8 chữ số.');
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=product_name,product_name_vi,nutriments,serving_quantity`);
  if (!res.ok) throw new Error('Không kết nối được Open Food Facts.');
  const data = await res.json();
  const p = data.product;
  const n = p?.nutriments;
  if (data.status !== 1 || !n || n['energy-kcal_100g'] == null) throw new Error('Chưa có sản phẩm này trong Open Food Facts.');
  return {
    id: `off-${clean}`,
    name: p.product_name_vi || p.product_name || `Sản phẩm ${clean}`,
    unit: '100g', grams: 100, per100: true,
    kcal: Math.round(n['energy-kcal_100g']),
    p: n.proteins_100g ?? 0, c: n.carbohydrates_100g ?? 0, f: n.fat_100g ?? 0,
    servingG: Number(p.serving_quantity) || null,
  };
}

export const canScan = () => 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;

// Mở camera, trả về mã vạch đầu tiên đọc được. Gọi stop() để hủy.
export function scanBarcode(video) {
  let stream;
  let stopped = false;
  const promise = (async () => {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    await video.play();
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    while (!stopped) {
      const codes = await detector.detect(video).catch(() => []);
      if (codes.length) return codes[0].rawValue;
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  })().finally(() => stream?.getTracks().forEach((t) => t.stop()));
  return { promise, stop: () => { stopped = true; } };
}
