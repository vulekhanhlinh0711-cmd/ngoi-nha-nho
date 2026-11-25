// P3.03–P3.04: thư viện món ăn. Số liệu là ƯỚC TÍNH theo khẩu phần phổ biến
// (tham khảo bảng thành phần thực phẩm Việt Nam và dữ liệu USDA cho nguyên liệu lẻ).
// Mỗi dòng: [id, tên, đơn vị, gram/đơn vị, kcal/đơn vị, đạm, tinh bột, béo (g/đơn vị), "từ gọi khác"]
// Nguyên liệu lẻ dùng đơn vị "100g" để nhập theo gram.
const RAW = [
  // Món nước
  ['pho-bo', 'Phở bò', 'bát', 500, 430, 25, 55, 11, 'pho tai chin'],
  ['pho-ga', 'Phở gà', 'bát', 500, 400, 26, 52, 9, ''],
  ['bun-bo-hue', 'Bún bò Huế', 'bát', 550, 480, 26, 60, 15, 'bun bo'],
  ['bun-rieu', 'Bún riêu cua', 'bát', 500, 410, 20, 55, 12, ''],
  ['bun-cha', 'Bún chả', 'suất', 450, 560, 25, 65, 22, ''],
  ['bun-thit-nuong', 'Bún thịt nướng', 'bát', 400, 480, 22, 60, 16, 'bun thit nuong cha gio'],
  ['bun-ca', 'Bún cá', 'bát', 500, 380, 22, 55, 7, ''],
  ['bun-moc', 'Bún mọc', 'bát', 500, 390, 20, 55, 10, ''],
  ['bun-mam', 'Bún mắm', 'bát', 550, 500, 28, 58, 17, ''],
  ['bun-dau', 'Bún đậu mắm tôm', 'suất', 450, 650, 28, 60, 32, 'bun dau'],
  ['mien-ga', 'Miến gà', 'bát', 450, 350, 22, 50, 6, 'mien'],
  ['mien-luon', 'Miến lươn', 'bát', 450, 420, 20, 55, 13, ''],
  ['hu-tieu', 'Hủ tiếu Nam Vang', 'bát', 500, 420, 22, 58, 10, 'hu tieu'],
  ['mi-quang', 'Mì Quảng', 'bát', 450, 520, 25, 62, 18, ''],
  ['cao-lau', 'Cao lầu', 'bát', 400, 500, 24, 62, 16, ''],
  ['banh-canh', 'Bánh canh', 'bát', 500, 430, 20, 62, 11, 'banh canh cua'],
  ['banh-da-cua', 'Bánh đa cua', 'bát', 500, 420, 20, 58, 12, ''],
  ['chao-ga', 'Cháo gà', 'bát', 400, 260, 16, 38, 5, 'chao'],
  ['chao-long', 'Cháo lòng', 'bát', 400, 350, 18, 36, 14, ''],
  ['chao-suon', 'Cháo sườn', 'bát', 400, 300, 14, 40, 9, ''],
  ['mi-tom', 'Mì tôm (1 gói)', 'gói', 75, 350, 7, 47, 14, 'mi goi mi an lien'],
  ['mi-tom-trung', 'Mì tôm trứng', 'bát', 400, 430, 13, 48, 19, ''],
  ['lau', 'Lẩu (phần ăn)', 'suất', 600, 550, 35, 40, 25, 'lau thai lau bo'],
  // Cơm
  ['com-trang', 'Cơm trắng', 'bát', 150, 195, 4, 43, 0.4, 'com'],
  ['com-tam', 'Cơm tấm sườn bì chả', 'đĩa', 450, 680, 32, 75, 26, 'com tam suon'],
  ['com-ga', 'Cơm gà', 'đĩa', 400, 600, 30, 72, 18, 'com ga xoi mo'],
  ['com-rang', 'Cơm rang dưa bò', 'đĩa', 350, 620, 22, 75, 24, 'com chien'],
  ['com-rang-trung', 'Cơm rang trứng', 'đĩa', 300, 520, 15, 70, 19, 'com chien trung'],
  ['com-van-phong', 'Cơm văn phòng (cơm + 1 mặn + rau)', 'suất', 450, 650, 28, 80, 22, 'com hop com suat'],
  ['com-binh-dan', 'Cơm bình dân (2 món)', 'suất', 500, 700, 30, 85, 25, ''],
  ['com-chay', 'Cơm chay', 'suất', 400, 520, 15, 80, 15, ''],
  ['xoi-xeo', 'Xôi xéo', 'gói', 250, 480, 10, 80, 13, 'xoi'],
  ['xoi-ga', 'Xôi gà', 'gói', 300, 550, 25, 80, 15, ''],
  ['xoi-man', 'Xôi mặn', 'gói', 300, 580, 18, 82, 20, 'xoi thap cam'],
  ['xoi-lac', 'Xôi lạc', 'gói', 200, 400, 11, 66, 10, 'xoi dau phong'],
  // Bánh
  ['banh-mi-thit', 'Bánh mì thịt', 'ổ', 200, 450, 18, 55, 17, 'banh mi pate'],
  ['banh-mi-trung', 'Bánh mì trứng', 'ổ', 180, 380, 14, 50, 14, ''],
  ['banh-mi-op-la', 'Bánh mì ốp la (2 trứng)', 'suất', 250, 480, 18, 52, 22, 'op la'],
  ['banh-mi-khong', 'Bánh mì không', 'ổ', 80, 210, 7, 42, 2, 'banh mi'],
  ['banh-cuon', 'Bánh cuốn', 'đĩa', 300, 380, 15, 55, 11, ''],
  ['banh-xeo', 'Bánh xèo', 'cái', 200, 380, 12, 35, 22, ''],
  ['banh-bao', 'Bánh bao nhân thịt', 'cái', 150, 330, 12, 45, 11, ''],
  ['banh-chung', 'Bánh chưng', 'miếng', 200, 440, 13, 62, 15, 'banh tet'],
  ['banh-gio', 'Bánh giò', 'cái', 200, 300, 10, 40, 11, ''],
  ['banh-trang-tron', 'Bánh tráng trộn', 'túi', 150, 300, 8, 45, 10, ''],
  ['banh-trang-nuong', 'Bánh tráng nướng', 'cái', 100, 250, 9, 28, 11, ''],
  ['banh-beo', 'Bánh bèo', 'đĩa', 200, 250, 7, 42, 6, ''],
  ['banh-khot', 'Bánh khọt', 'đĩa', 200, 380, 10, 35, 22, ''],
  ['banh-flan', 'Bánh flan', 'cái', 100, 150, 5, 22, 5, 'flan caramen'],
  ['banh-quy', 'Bánh quy', 'cái', 10, 50, 0.6, 7, 2.3, 'cookie'],
  ['banh-ngot', 'Bánh ngọt (gato)', 'miếng', 80, 300, 4, 38, 15, 'gato banh kem'],
  ['banh-su-kem', 'Bánh su kem', 'cái', 30, 90, 2, 9, 5, ''],
  ['banh-crepe', 'Bánh crepe sầu riêng', 'cái', 60, 200, 3, 22, 11, ''],
  ['banh-pia', 'Bánh pía', 'cái', 100, 400, 6, 60, 15, ''],
  ['banh-trung-thu', 'Bánh trung thu', 'cái', 150, 650, 12, 90, 27, ''],
  ['banh-mi-sandwich', 'Bánh mì sandwich', 'lát', 30, 80, 2.5, 15, 1, 'sandwich'],
  ['croissant', 'Bánh sừng bò', 'cái', 60, 250, 5, 26, 14, 'croissant'],
  // Món mặn / món ăn kèm
  ['thit-kho', 'Thịt kho trứng', 'suất', 200, 420, 25, 8, 32, 'thit kho tau'],
  ['ca-kho', 'Cá kho', 'khúc', 120, 220, 22, 6, 12, ''],
  ['ga-luoc', 'Gà luộc', 'đĩa', 150, 300, 36, 0, 17, 'thit ga'],
  ['ga-ran', 'Gà rán', 'miếng', 120, 320, 22, 12, 20, 'ga chien kfc'],
  ['ga-nuong', 'Gà nướng', 'đĩa', 150, 320, 34, 3, 19, ''],
  ['suon-xao', 'Sườn xào chua ngọt', 'suất', 200, 450, 22, 20, 31, 'suon ram'],
  ['thit-luoc', 'Thịt luộc', 'đĩa', 100, 260, 18, 0, 21, ''],
  ['thit-nuong', 'Thịt nướng', 'đĩa', 150, 380, 24, 8, 28, 'thit heo nuong'],
  ['bo-xao', 'Bò xào rau', 'đĩa', 200, 300, 22, 10, 19, 'thit bo xao'],
  ['bo-bit-tet', 'Bò bít tết', 'suất', 300, 600, 38, 25, 38, 'beefsteak'],
  ['dau-sot-ca', 'Đậu sốt cà chua', 'đĩa', 200, 220, 14, 10, 14, 'dau phu'],
  ['dau-ran', 'Đậu rán', 'miếng', 50, 100, 6, 1.5, 8, 'dau chien'],
  ['trung-chien', 'Trứng chiên', 'quả', 60, 120, 7, 0.5, 10, 'trung op la'],
  ['trung-luoc', 'Trứng luộc', 'quả', 50, 75, 6.5, 0.5, 5, 'trung ga'],
  ['trung-vit-lon', 'Trứng vịt lộn', 'quả', 70, 180, 13, 2, 13, 'hot vit lon'],
  ['cha-gio', 'Chả giò / nem rán', 'cái', 40, 110, 4, 8, 7, 'nem ran'],
  ['goi-cuon', 'Gỏi cuốn', 'cái', 80, 80, 5, 12, 1.5, 'nem cuon'],
  ['nem-chua', 'Nem chua', 'cái', 25, 45, 4, 2, 2.5, ''],
  ['cha-lua', 'Chả lụa / giò lụa', 'lát', 30, 70, 4.5, 1, 5, 'gio lua'],
  ['xuc-xich', 'Xúc xích', 'cái', 50, 150, 6, 2, 13, ''],
  ['tom-rang', 'Tôm rang', 'đĩa', 150, 230, 30, 5, 10, 'tom'],
  ['muc-xao', 'Mực xào', 'đĩa', 200, 250, 25, 12, 11, 'muc'],
  ['oc', 'Ốc luộc / xào', 'đĩa', 200, 200, 25, 10, 6, 'oc'],
  ['canh-rau', 'Canh rau', 'bát', 250, 40, 2, 5, 1, 'canh'],
  ['canh-chua', 'Canh chua cá', 'bát', 300, 120, 12, 10, 4, ''],
  ['rau-luoc', 'Rau luộc', 'đĩa', 150, 40, 3, 6, 0.4, 'rau muong rau cai'],
  ['rau-xao', 'Rau xào', 'đĩa', 150, 110, 3, 8, 7, ''],
  ['dua-muoi', 'Dưa muối', 'đĩa', 80, 20, 1, 4, 0.1, 'dua chua'],
  ['salad', 'Salad rau trộn', 'đĩa', 200, 150, 4, 10, 10, 'xa lach'],
  ['nom', 'Nộm / gỏi', 'đĩa', 200, 220, 10, 22, 10, 'goi'],
  // Đồ ăn nhanh / quốc tế
  ['pizza', 'Pizza', 'miếng', 110, 290, 12, 33, 12, ''],
  ['hamburger', 'Hamburger', 'cái', 200, 500, 25, 40, 25, 'burger'],
  ['khoai-chien', 'Khoai tây chiên', 'phần vừa', 115, 365, 4, 48, 17, 'french fries'],
  ['mi-y', 'Mì Ý sốt bò bằm', 'đĩa', 350, 600, 25, 75, 20, 'spaghetti'],
  ['sushi', 'Sushi', 'miếng', 30, 45, 2, 8, 0.5, ''],
  ['kimbap', 'Kimbap', 'cuộn', 250, 450, 14, 70, 12, 'gimbap'],
  ['tokbokki', 'Tokbokki', 'phần', 250, 450, 9, 85, 8, 'tteokbokki'],
  ['mi-cay', 'Mì cay', 'bát', 500, 600, 25, 75, 22, ''],
  ['ga-sot-han', 'Gà sốt Hàn Quốc', 'phần', 200, 520, 28, 30, 32, ''],
  // Đồ uống (kcal theo ly)
  ['tra-sua', 'Trà sữa trân châu', 'ly', 500, 380, 3, 65, 12, 'tra sua'],
  ['tra-sua-it-duong', 'Trà sữa ít đường', 'ly', 500, 250, 3, 38, 9, ''],
  ['ca-phe-sua', 'Cà phê sữa đá', 'ly', 200, 130, 3, 22, 3.5, 'cafe sua nau'],
  ['ca-phe-den', 'Cà phê đen (có đường)', 'ly', 150, 50, 0.3, 12, 0, 'cafe den'],
  ['bac-xiu', 'Bạc xỉu', 'ly', 250, 200, 5, 30, 7, ''],
  ['latte', 'Latte', 'ly', 350, 190, 10, 18, 7, 'cappuccino'],
  ['sinh-to-bo', 'Sinh tố bơ', 'ly', 400, 400, 5, 45, 22, 'sinh to'],
  ['nuoc-ep-cam', 'Nước ép cam', 'ly', 300, 135, 2, 31, 0.5, 'nuoc cam'],
  ['nuoc-ngot', 'Nước ngọt có ga (lon)', 'lon', 330, 140, 0, 35, 0, 'coca pepsi'],
  ['tra-dao', 'Trà đào', 'ly', 400, 200, 0, 50, 0, 'tra trai cay'],
  ['sua-chua-uong', 'Sữa chua uống', 'chai', 180, 120, 4, 20, 2.5, ''],
  ['bia', 'Bia', 'lon', 330, 145, 1.5, 12, 0, 'beer'],
  ['ruou-vang', 'Rượu vang', 'ly', 150, 125, 0, 4, 0, 'wine'],
  ['nuoc-mia', 'Nước mía', 'ly', 300, 180, 0, 45, 0, ''],
  ['che', 'Chè', 'cốc', 300, 300, 5, 60, 5, 'che dau'],
  ['kem', 'Kem', 'viên', 70, 140, 2.5, 17, 7, 'kem que'],
  ['sua-chua', 'Sữa chua', 'hộp', 100, 100, 3.5, 15, 3, 'yaourt'],
  // Ăn vặt / trái cây
  ['chuoi', 'Chuối', 'quả', 120, 105, 1.3, 27, 0.4, ''],
  ['tao', 'Táo', 'quả', 180, 95, 0.5, 25, 0.3, ''],
  ['cam', 'Cam', 'quả', 150, 70, 1.4, 18, 0.2, ''],
  ['xoai', 'Xoài', 'quả', 300, 180, 2.5, 45, 1, ''],
  ['dua-hau', 'Dưa hấu', 'miếng', 300, 90, 2, 23, 0.5, ''],
  ['buoi', 'Bưởi', 'múi', 50, 20, 0.4, 5, 0, ''],
  ['nho', 'Nho', 'chùm nhỏ', 150, 100, 1, 27, 0.2, ''],
  ['sau-rieng', 'Sầu riêng', 'múi', 100, 150, 1.5, 27, 5, ''],
  ['bo', 'Bơ', 'quả', 200, 320, 4, 17, 29, 'qua bo'],
  ['khoai-lang', 'Khoai lang luộc', 'củ', 150, 130, 2.4, 30, 0.2, 'khoai lang'],
  ['ngo-luoc', 'Ngô luộc', 'bắp', 150, 140, 5, 30, 2, 'bap'],
  ['banh-snack', 'Snack khoai tây', 'gói', 50, 270, 3, 26, 17, 'snack bim bim'],
  ['hat-dieu', 'Hạt điều', 'nắm', 30, 165, 5, 9, 13, 'hat'],
  ['lac-rang', 'Lạc rang', 'nắm', 30, 170, 7, 5, 14, 'dau phong'],
  ['socola', 'Sô-cô-la', 'thanh', 40, 215, 3, 24, 12, 'chocolate'],
  ['keo', 'Kẹo', 'cái', 5, 20, 0, 5, 0, ''],
  ['banh-gao', 'Bánh gạo', 'cái', 12, 50, 0.6, 9, 1.5, ''],
  // Nguyên liệu lẻ (theo 100 g) — tham khảo USDA FoodData Central
  ['i-gao', 'Gạo (sống)', '100g', 100, 360, 7, 79, 0.6, 'gao trang'],
  ['i-yen-mach', 'Yến mạch', '100g', 100, 380, 13, 67, 7, 'oat'],
  ['i-banh-pho', 'Bánh phở / bún tươi', '100g', 100, 110, 1.7, 25, 0.2, 'bun tuoi'],
  ['i-uc-ga', 'Ức gà (chín)', '100g', 100, 165, 31, 0, 3.6, 'uc ga'],
  ['i-dui-ga', 'Đùi gà (chín, có da)', '100g', 100, 230, 24, 0, 15, ''],
  ['i-thit-heo-nac', 'Thịt heo nạc', '100g', 100, 145, 21, 0, 6, 'thit lon nac'],
  ['i-ba-chi', 'Thịt ba chỉ', '100g', 100, 520, 9, 0, 53, 'ba roi'],
  ['i-thit-bo', 'Thịt bò nạc', '100g', 100, 170, 26, 0, 7, ''],
  ['i-ca-hoi', 'Cá hồi', '100g', 100, 210, 20, 0, 13, 'salmon'],
  ['i-ca-ngu', 'Cá ngừ', '100g', 100, 130, 28, 0, 1, ''],
  ['i-ca-ro-phi', 'Cá rô phi / cá basa', '100g', 100, 115, 20, 0, 3, 'ca basa'],
  ['i-tom', 'Tôm (sống)', '100g', 100, 85, 20, 0, 0.5, ''],
  ['i-trung', 'Trứng gà', '100g', 100, 145, 12.5, 1, 10, ''],
  ['i-dau-phu', 'Đậu phụ', '100g', 100, 95, 10, 2, 5.5, 'tofu'],
  ['i-sua-tuoi', 'Sữa tươi', '100g', 100, 62, 3.2, 4.8, 3.3, 'sua tuoi khong duong'],
  ['i-sua-hat', 'Sữa hạt / sữa đậu nành', '100g', 100, 45, 3, 4, 1.8, 'sua dau nanh'],
  ['i-pho-mai', 'Phô mai', '100g', 100, 400, 25, 1.3, 33, 'cheese'],
  ['i-khoai-tay', 'Khoai tây', '100g', 100, 77, 2, 17, 0.1, ''],
  ['i-bong-cai', 'Súp lơ xanh', '100g', 100, 34, 2.8, 7, 0.4, 'bong cai xanh broccoli'],
  ['i-rau-muong', 'Rau muống', '100g', 100, 20, 2.6, 3, 0.2, ''],
  ['i-ca-chua', 'Cà chua', '100g', 100, 18, 0.9, 3.9, 0.2, ''],
  ['i-dua-chuot', 'Dưa chuột', '100g', 100, 15, 0.7, 3.6, 0.1, 'dua leo'],
  ['i-ca-rot', 'Cà rốt', '100g', 100, 41, 0.9, 10, 0.2, ''],
  ['i-dau-xanh', 'Đậu xanh (khô)', '100g', 100, 347, 24, 63, 1.2, ''],
  ['i-hat-chia', 'Hạt chia', '100g', 100, 486, 17, 42, 31, ''],
  ['i-hanh-nhan', 'Hạnh nhân', '100g', 100, 580, 21, 22, 50, 'almond'],
  ['i-bo-dau-phong', 'Bơ đậu phộng', '100g', 100, 590, 25, 20, 50, 'peanut butter'],
  ['i-mat-ong', 'Mật ong', '100g', 100, 305, 0.3, 82, 0, ''],
  ['i-duong', 'Đường', '100g', 100, 390, 0, 100, 0, ''],
  ['i-dau-an', 'Dầu ăn', '100g', 100, 885, 0, 0, 100, 'dau an'],
  ['i-bo-thuc-vat', 'Bơ (butter)', '100g', 100, 715, 0.9, 0.1, 81, 'butter'],
  ['i-sua-chua-hy-lap', 'Sữa chua Hy Lạp', '100g', 100, 97, 9, 4, 5, 'greek yogurt'],
  ['i-whey', 'Whey protein', '100g', 100, 400, 78, 10, 6, ''],
  ['i-banh-mi-den', 'Bánh mì đen', '100g', 100, 250, 9, 45, 3.5, 'bread'],
  ['i-mi-trung', 'Mì trứng (khô)', '100g', 100, 380, 14, 71, 4.5, ''],
  ['i-nam', 'Nấm', '100g', 100, 25, 3, 3.5, 0.3, ''],
];

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
export const normalize = strip;

export const FOODS = RAW.map(([id, name, unit, grams, kcal, p, c, f, alias]) => ({
  id, name, unit, grams, kcal, p, c, f, per100: unit === '100g',
  key: `${strip(name)} ${alias}`.trim(),
}));

const byId = new Map(FOODS.map((x) => [x.id, x]));
export const foodById = (id, extra = []) => byId.get(id) ?? extra.find((x) => x.id === id);

// Tìm món: khớp theo từ (không dấu); ưu tiên khớp ở đầu tên.
export function searchFoods(query, extra = [], limit = 8) {
  const q = strip(query).trim();
  if (!q) return [];
  const words = q.split(/\s+/);
  const pool = [...extra.map((x) => ({ ...x, key: x.key ?? strip(x.name) })), ...FOODS];
  // Thứ tự trong thư viện = độ phổ biến; nguyên liệu lẻ xếp sau món ăn.
  return pool
    .map((x, i) => {
      if (!words.every((w) => x.key.includes(w))) return null;
      const name = strip(x.name);
      return { x, score: (name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2) + (x.per100 ? 0.5 : 0) + i / 10000 };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((r) => r.x);
}

// Kcal/macro cho một số lượng: qty đơn vị, hoặc grams (nếu có).
export function portion(food, { qty = 1, grams = null } = {}) {
  const factor = grams != null ? grams / (food.per100 ? 100 : food.grams) : qty;
  const r = (v) => Math.round(v * factor * 10) / 10;
  return { kcal: Math.round(food.kcal * factor), p: r(food.p), c: r(food.c), f: r(food.f) };
}
