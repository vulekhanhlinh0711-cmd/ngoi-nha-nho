// P7.01: bộ đồ họa dùng emoji + CSS (thống nhất phong cách 2D, dễ thêm đồ mới; sau này thay bằng ảnh 2D chỉ cần sửa `icon`).

// ---- Nội thất ----
export const FURNITURE = [
  ['sofa', 'Sofa', '🛋️', 60], ['bed', 'Giường', '🛏️', 80], ['chair', 'Ghế', '🪑', 25], ['lamp', 'Đèn', '💡', 20],
  ['plant', 'Chậu cây', '🪴', 15], ['books', 'Kệ sách', '📚', 40], ['clock', 'Đồng hồ', '🕰️', 30], ['frame', 'Tranh', '🖼️', 15],
  ['window', 'Cửa sổ', '🪟', 30], ['mirror', 'Gương', '🪞', 25], ['tv', 'TV', '📺', 60], ['teddy', 'Gấu bông', '🧸', 20],
  ['guitar', 'Đàn guitar', '🎸', 45], ['candle', 'Nến thơm', '🕯️', 10], ['flowers', 'Bình hoa', '💐', 18], ['cat', 'Mèo cưng', '🐈', 90],
  ['bath', 'Bồn tắm', '🛁', 70], ['cup', 'Tách trà', '🍵', 8], ['radio', 'Radio', '📻', 35], ['globe', 'Quả địa cầu', '🌍', 30],
  // P12.10: cây hoa và đồ trang trí mới
  ['monstera', 'Cây trầu bà lá xẻ', '🌿', 30], ['cactus', 'Xương rồng', '🌵', 12], ['tulips', 'Chậu tulip', '🌷', 22], ['lavender', 'Oải hương', '💜', 24],
  ['bonsai', 'Bonsai', '🌳', 50], ['sunflower', 'Hướng dương', '🌻', 18], ['hangplant', 'Chậu cây treo', '🪴', 20], ['lights', 'Dây đèn', '✨', 25],
  ['rug', 'Thảm tròn', '🟣', 30], ['cushion', 'Gối tựa', '🟨', 12],
].map(([id, name, icon, price]) => ({ id, name, icon, price }));
export const furnitureOf = (id) => FURNITURE.find((f) => f.id === id);

// Phòng mở theo cấp; cấp tăng theo tổng xu đã kiếm (không giảm khi tiêu).
// P12.09: 8 khu. Bếp và phòng tắm lát gạch; vườn và ban công ở ngoài trời (đổi màu sàn được, tường thì không).
export const ROOMS = [
  { id: 'living', name: 'Phòng khách', icon: '🛋️', level: 1, wall: '#f6e6d3', floor: '#c99a6b' },
  { id: 'bedroom', name: 'Phòng ngủ', icon: '🛏️', level: 1, wall: '#f3e1e6', floor: '#d3ae88' },
  { id: 'study', name: 'Phòng làm việc', icon: '💻', level: 2, wall: '#e3ecdf', floor: '#b98e66' },
  { id: 'kitchen', name: 'Phòng bếp', icon: '🍳', level: 2, wall: '#f7ecd6', floor: '#c9b9a4', tiled: true },
  { id: 'bathroom', name: 'Phòng tắm', icon: '🛁', level: 3, wall: '#e2eef0', floor: '#d8e3e6', tiled: true },
  { id: 'dressing', name: 'Phòng thay đồ', icon: '👗', level: 3, wall: '#f8e4e4', floor: '#e0c3a0' },
  { id: 'yard', name: 'Khu vườn nhỏ', icon: '🌷', level: 4, wall: '#cfe8c4', floor: '#a9d295', outdoor: true },
  { id: 'balcony', name: 'Ban công', icon: '🌇', level: 4, wall: '#cfe4ef', floor: '#c9a27a', outdoor: true },
];
export const XP_PER_LEVEL = 300;
export const levelOf = (earned) => 1 + Math.floor(earned / XP_PER_LEVEL);

// ---- Thời trang (P7.08). Không dùng tên/logo thương hiệu; bộ sưu tập đặt tên riêng. ----
export const STYLES = ['street style', 'elegant', 'vintage', 'tối giản', 'công sở', 'Hàn Quốc', 'boho', 'thể thao'];
export const SEASONS = ['xuân hè', 'thu đông'];
export const OCCASIONS = ['đi làm', 'cà phê cuối tuần', 'dự tiệc', 'du lịch biển'];
export const SLOTS = [['top', 'Áo'], ['bottom', 'Quần/váy'], ['dress', 'Đầm'], ['outer', 'Áo khoác'], ['shoes', 'Giày'], ['bag', 'Túi'], ['acc', 'Phụ kiện']];

// [id, tên, ô, emoji, màu, giá, phong cách, mùa, dịp, bộ sưu tập]
const RAW = [
  ['tee-white', 'Áo thun trắng', 'top', '👕', '#f4f4f0', 20, 'tối giản,street style,thể thao', 'xuân hè', 'cà phê cuối tuần,du lịch biển', 'Phố Tối giản'],
  ['blouse-silk', 'Áo lụa kem', 'top', '👚', '#efe0c8', 45, 'elegant,công sở', 'xuân hè,thu đông', 'đi làm,dự tiệc', 'Milano Sang trọng'],
  ['shirt-stripe', 'Sơ mi kẻ', 'top', '👔', '#c9d8ea', 35, 'công sở,tối giản', 'xuân hè,thu đông', 'đi làm', 'Phố Tối giản'],
  ['knit-cream', 'Áo len cổ lọ', 'top', '🧶', '#e6d3b3', 40, 'Hàn Quốc,vintage,tối giản', 'thu đông', 'đi làm,cà phê cuối tuần', 'Seoul Mùa Lá'],
  ['crop-pink', 'Áo croptop hồng', 'top', '👚', '#f2b8c6', 25, 'Hàn Quốc,street style', 'xuân hè', 'cà phê cuối tuần', 'Seoul Mùa Lá'],
  ['shirt-pink', 'Sơ mi kẻ hồng', 'top', '👚', '#f3b9d3', 40, 'Hàn Quốc,tối giản,công sở', 'xuân hè,thu đông', 'cà phê cuối tuần,đi làm', 'Seoul Mùa Lá'],
  ['polo-wine', 'Áo polo len đỏ đô', 'top', '👕', '#8e2433', 38, 'Hàn Quốc,vintage,street style', 'thu đông,xuân hè', 'cà phê cuối tuần,đi làm', 'Seoul Mùa Lá'],
  ['jeans', 'Quần jeans', 'bottom', '👖', '#5b7fa8', 35, 'street style,tối giản,Hàn Quốc', 'xuân hè,thu đông', 'cà phê cuối tuần,đi làm', 'Phố Tối giản'],
  ['slacks', 'Quần âu', 'bottom', '👖', '#3d3d45', 40, 'công sở,elegant', 'thu đông,xuân hè', 'đi làm', 'Milano Sang trọng'],
  ['skirt-pleat', 'Chân váy xếp ly', 'bottom', '👗', '#b7a3d9', 30, 'Hàn Quốc,vintage', 'xuân hè', 'cà phê cuối tuần,đi làm', 'Seoul Mùa Lá'],
  ['shorts', 'Quần short', 'bottom', '🩳', '#d9c39b', 20, 'thể thao,street style', 'xuân hè', 'du lịch biển', 'Biển Xanh'],
  ['leggings', 'Quần tập', 'bottom', '🩱', '#2e2e33', 25, 'thể thao', 'xuân hè,thu đông', 'cà phê cuối tuần', 'Năng Động'],
  ['dress-floral', 'Đầm hoa nhí', 'dress', '👗', '#f3c6a5', 50, 'boho,vintage', 'xuân hè', 'cà phê cuối tuần,du lịch biển', 'Biển Xanh'],
  ['dress-black', 'Đầm đen dự tiệc', 'dress', '👗', '#222', 80, 'elegant', 'xuân hè,thu đông', 'dự tiệc', 'Milano Sang trọng'],
  ['kimono', 'Đầm suông boho', 'dress', '👘', '#c7956b', 55, 'boho', 'xuân hè', 'du lịch biển', 'Biển Xanh'],
  ['bikini', 'Đồ bơi', 'dress', '👙', '#7cc6d6', 35, 'thể thao,boho', 'xuân hè', 'du lịch biển', 'Biển Xanh'],
  ['coat-camel', 'Măng tô be', 'outer', '🧥', '#c69c6d', 90, 'elegant,công sở,Hàn Quốc', 'thu đông', 'đi làm,dự tiệc', 'Milano Sang trọng'],
  ['blazer', 'Blazer', 'outer', '🥼', '#8c8c94', 60, 'công sở,tối giản', 'thu đông,xuân hè', 'đi làm', 'Phố Tối giản'],
  ['denim-jacket', 'Áo khoác jeans', 'outer', '🧥', '#6b8fb8', 50, 'street style,vintage', 'thu đông', 'cà phê cuối tuần', 'Phố Tối giản'],
  ['scarf', 'Khăn len', 'acc', '🧣', '#b5524f', 20, 'vintage,Hàn Quốc', 'thu đông', 'cà phê cuối tuần,đi làm', 'Seoul Mùa Lá'],
  ['sneakers', 'Giày thể thao', 'shoes', '👟', '#f4f4f0', 40, 'thể thao,street style,Hàn Quốc', 'xuân hè,thu đông', 'cà phê cuối tuần,du lịch biển', 'Năng Động'],
  ['heels', 'Giày cao gót', 'shoes', '👠', '#a33a4a', 55, 'elegant', 'xuân hè,thu đông', 'dự tiệc,đi làm', 'Milano Sang trọng'],
  ['flats', 'Giày búp bê', 'shoes', '🥿', '#d9c2a5', 35, 'công sở,tối giản,vintage', 'xuân hè,thu đông', 'đi làm', 'Phố Tối giản'],
  ['sandals', 'Dép sandal', 'shoes', '🩴', '#c99b6b', 15, 'boho', 'xuân hè', 'du lịch biển', 'Biển Xanh'],
  ['boots', 'Bốt cổ ngắn', 'shoes', '👢', '#5a3e2b', 60, 'vintage,street style', 'thu đông', 'cà phê cuối tuần', 'Seoul Mùa Lá'],
  ['tote', 'Túi tote vải', 'bag', '👜', '#e8dcc2', 25, 'tối giản,Hàn Quốc', 'xuân hè,thu đông', 'đi làm,cà phê cuối tuần', 'Phố Tối giản'],
  ['clutch', 'Ví cầm tay', 'bag', '👛', '#d4af37', 45, 'elegant', 'xuân hè,thu đông', 'dự tiệc', 'Milano Sang trọng'],
  ['backpack', 'Balo', 'bag', '🎒', '#8aa37b', 35, 'thể thao,street style', 'xuân hè,thu đông', 'du lịch biển', 'Năng Động'],
  ['straw-hat', 'Mũ cói', 'acc', '👒', '#e3c27a', 20, 'boho,vintage', 'xuân hè', 'du lịch biển', 'Biển Xanh'],
  ['cap', 'Mũ lưỡi trai', 'acc', '🧢', '#3b5b8c', 15, 'thể thao,street style', 'xuân hè', 'cà phê cuối tuần', 'Năng Động'],
  ['sunglasses', 'Kính râm', 'acc', '🕶️', '#222', 25, 'street style,boho', 'xuân hè', 'du lịch biển', 'Biển Xanh'],
  ['pearl', 'Vòng ngọc trai', 'acc', '📿', '#f1ece0', 40, 'elegant,vintage', 'xuân hè,thu đông', 'dự tiệc', 'Milano Sang trọng'],
  ['ring', 'Nhẫn bạc', 'acc', '💍', '#d9d9d9', 30, 'tối giản,elegant', 'xuân hè,thu đông', 'dự tiệc,đi làm', 'Phố Tối giản'],
];
export const CLOTHES = RAW.map(([id, name, slot, icon, color, price, styles, seasons, occasions, collection]) => ({
  id, name, slot, icon, color, price, styles: styles.split(','), seasons: seasons.split(','), occasions: occasions.split(','), collection,
}));
export const clothOf = (id) => CLOTHES.find((c) => c.id === id);

// Đồ giới hạn theo mùa: chỉ bán trong các tháng của mùa đó.
export const currentSeason = (month = new Date().getMonth() + 1) => (month >= 4 && month <= 9 ? 'xuân hè' : 'thu đông');
export const LIMITED = { 'coat-camel': 'thu đông', 'bikini': 'xuân hè', 'knit-cream': 'thu đông', 'kimono': 'xuân hè' };
export const isAvailable = (c, month) => !LIMITED[c.id] || LIMITED[c.id] === currentSeason(month);

// ---- Nhân vật (P7.07) ----
export const SKIN = ['#f6d7c3', '#eec1a0', '#d9a07a', '#b97c55', '#8a5a3c'];
export const HAIR_COLORS = ['#2b2321', '#5a3a29', '#8b5a3c', '#c99a5b', '#e3c27a', '#b5524f', '#6b5b95'];
export const HAIR_STYLES = [['short', 'Tóc ngắn'], ['bob', 'Tóc bob'], ['long', 'Tóc dài'], ['bun', 'Búi tóc'], ['ponytail', 'Đuôi ngựa']];
export const EYES = [['dot', 'Mắt chấm'], ['round', 'Mắt tròn'], ['smile', 'Mắt cười']];
