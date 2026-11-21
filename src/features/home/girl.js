// P16.01: ảnh đại diện mặc định — cô bé tóc dài, nơ lớn, ôm bó hoa (vẽ riêng cho app, phong cách chibi dịu).
// Màu nơ đổi được; mùa Noel đội thêm mũ len đỏ.
import { svgFrom } from './art.js';

export function girlMarkup({ bow = '#ee7a6e', hat = false, bg = '#f3ece6' } = {}) {
  const hair = '#3a2a24', hairHi = '#5a4136', skin = '#fbe3d3';
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="100" fill="${bg}"/>
  <!-- tóc sau -->
  <path d="M42 96 C36 50 70 30 100 30 C134 30 164 52 158 100 C156 130 166 160 172 200 L28 200 C34 160 44 130 42 96Z" fill="${hair}"/>
  <path d="M150 110 C160 140 168 170 170 200 L156 200 C152 170 148 140 150 110Z" fill="${hairHi}" opacity=".5"/>
  <!-- áo -->
  <path d="M58 200 C60 170 76 156 100 156 C124 156 140 170 142 200Z" fill="#8f9aa6"/>
  <ellipse cx="66" cy="172" rx="20" ry="16" fill="#fbf1dc"/><ellipse cx="134" cy="172" rx="20" ry="16" fill="#fbf1dc"/>
  <!-- cổ + mặt -->
  <rect x="90" y="138" width="20" height="20" rx="8" fill="${skin}"/>
  <ellipse cx="100" cy="104" rx="44" ry="46" fill="${skin}"/>
  <!-- tai -->
  <ellipse cx="57" cy="110" rx="7" ry="9" fill="${skin}"/><ellipse cx="143" cy="110" rx="7" ry="9" fill="${skin}"/>
  <!-- mắt -->
  <g>
    <ellipse cx="82" cy="112" rx="10" ry="12" fill="#2f2622"/><ellipse cx="118" cy="112" rx="10" ry="12" fill="#2f2622"/>
    <ellipse cx="82" cy="115" rx="7" ry="8" fill="#6f7f8c"/><ellipse cx="118" cy="115" rx="7" ry="8" fill="#6f7f8c"/>
    <circle cx="79" cy="107" r="4" fill="#fff"/><circle cx="115" cy="107" r="4" fill="#fff"/>
    <circle cx="86" cy="118" r="1.8" fill="#fff"/><circle cx="122" cy="118" r="1.8" fill="#fff"/>
    <path d="M74 92 q8 -4 16 0 M110 92 q8 -4 16 0" stroke="#5a4136" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </g>
  <!-- má hồng, miệng -->
  <ellipse cx="70" cy="128" rx="10" ry="6" fill="#f4a0a0" opacity=".65"/><ellipse cx="130" cy="128" rx="10" ry="6" fill="#f4a0a0" opacity=".65"/>
  <path d="M93 132 q7 6 14 0" stroke="#c85f5f" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <!-- tóc mái -->
  <path d="M54 104 C50 66 72 50 100 50 C130 50 152 66 146 104 C138 88 132 76 124 70 C118 84 104 90 92 92 C96 82 96 74 94 68 C84 80 70 88 54 104Z" fill="${hair}"/>
  <path d="M74 66 q10 -8 24 -8" stroke="${hairHi}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
  ${hat ? `
  <!-- mũ Noel -->
  <path d="M52 70 C60 30 120 14 150 40 C162 52 166 66 170 84 L150 70 C148 60 140 54 132 54 C110 50 80 56 52 70Z" fill="#d6413e"/>
  <rect x="44" y="62" width="112" height="18" rx="9" fill="#fff8f0" transform="rotate(-6 100 70)"/>
  <circle cx="172" cy="88" r="11" fill="#fff8f0"/>` : `
  <!-- băng đô + nơ -->
  <path d="M56 80 C70 56 130 56 146 80" stroke="${bow}" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M100 52 C84 30 56 26 52 44 C50 58 72 64 98 58Z" fill="${bow}"/>
  <path d="M100 52 C116 30 146 24 152 42 C156 58 130 64 102 58Z" fill="${bow}"/>
  <path d="M60 42 C70 40 84 46 94 54" stroke="#fff" stroke-width="2.5" fill="none" opacity=".35"/>
  <path d="M96 58 L84 82 L94 78 Z M104 58 L118 82 L108 78Z" fill="${bow}"/>
  <ellipse cx="100" cy="54" rx="9" ry="8" fill="${bow}" stroke="#00000022"/>`}
  <!-- bó hoa -->
  <path d="M22 200 L40 150 L84 150 L96 200Z" fill="#efe1c8"/>
  <path d="M44 156 L60 182 L78 156" fill="#e6d4b4"/>
  <g>
    <ellipse cx="40" cy="152" rx="13" ry="9" fill="#5f9474"/><ellipse cx="86" cy="150" rx="13" ry="9" fill="#5f9474"/>
    <circle cx="44" cy="140" r="12" fill="#e9533d"/><circle cx="44" cy="140" r="5" fill="#c43a2b"/>
    <circle cx="64" cy="132" r="11" fill="#f4a273"/><circle cx="64" cy="132" r="4.5" fill="#e07e4f"/>
    <circle cx="84" cy="140" r="11" fill="#f2c26a"/><circle cx="84" cy="140" r="4.5" fill="#dca244"/>
    <circle cx="58" cy="152" r="9" fill="#c8b3e2"/><circle cx="74" cy="152" r="10" fill="#f19a8c"/>
    <circle cx="30" cy="128" r="8" fill="#f2b5a5"/>
  </g>
  <path d="M46 186 q14 -8 28 0 q-6 8 -14 6 q-8 2 -14 -6Z" fill="${bow}"/>
  <!-- tim -->
  <path d="M168 40 c-4 -8 -16 -6 -14 4 c1 6 14 12 14 12 s13 -6 14 -12 c2 -10 -10 -12 -14 -4z" fill="${bow}" opacity=".85"/>
</svg>`;
}

export const girlSvg = (opts) => svgFrom(girlMarkup(opts));

// P18: kiểu "cô gái 3D" — tóc nâu dài gợn sóng, mắt to, tay chạm cằm, áo len kem trễ vai, khuyên vàng.
// Đổ bóng bằng gradient để có cảm giác khối 3D. id gradient riêng cho mỗi lần vẽ (nhiều ảnh trên cùng trang).
let seq = 0;
export function girl3dMarkup({ hat = false, bg = '#e9ddd6' } = {}) {
  const u = `g3${(seq++).toString(36)}`;
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="${u}bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#f6eee8"/><stop offset="1" stop-color="${bg}"/></radialGradient>
    <radialGradient id="${u}skin" cx="45%" cy="38%" r="65%"><stop offset="0" stop-color="#f6c8a4"/><stop offset=".7" stop-color="#e6a47c"/><stop offset="1" stop-color="#cf8a63"/></radialGradient>
    <linearGradient id="${u}hair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b3a2a"/><stop offset=".5" stop-color="#3f271c"/><stop offset="1" stop-color="#2a1912"/></linearGradient>
    <linearGradient id="${u}hairHi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a3e" stop-opacity=".9"/><stop offset="1" stop-color="#8a5a3e" stop-opacity="0"/></linearGradient>
    <radialGradient id="${u}eye" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="#a36a3a"/><stop offset=".6" stop-color="#6b3f1f"/><stop offset="1" stop-color="#2a170c"/></radialGradient>
    <linearGradient id="${u}knit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6ecdc"/><stop offset="1" stop-color="#dccbb2"/></linearGradient>
    <radialGradient id="${u}blush"><stop offset="0" stop-color="#f08c86" stop-opacity=".55"/><stop offset="1" stop-color="#f08c86" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#${u}bg)"/>
  <!-- tóc sau, gợn sóng -->
  <path d="M46 92 C40 48 74 22 104 24 C140 26 166 52 160 96 C158 120 170 140 166 162 C162 184 172 196 176 200 L26 200 C34 186 30 170 34 152 C38 134 48 118 46 92Z" fill="url(#${u}hair)"/>
  <path d="M40 140 q-10 20 4 40 M162 130 q12 22 0 44" stroke="#2a1912" stroke-width="5" fill="none" opacity=".5"/>
  <!-- vai + áo len trễ vai -->
  <path d="M52 168 C62 150 80 146 100 146 C120 146 140 150 150 168 L156 200 L44 200Z" fill="url(#${u}skin)"/>
  <path d="M36 200 C38 182 52 172 66 170 C80 176 120 176 136 170 C150 172 164 182 166 200Z" fill="url(#${u}knit)"/>
  <path d="M66 172 C82 180 118 180 136 172" stroke="#cdb99c" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M${50 + i * 13} 186 v14" stroke="#d4c2a6" stroke-width="2" opacity=".7"/>`).join('')}
  <!-- cổ -->
  <path d="M88 132 L88 152 Q100 160 112 152 L112 132Z" fill="#d99470"/>
  <!-- mặt -->
  <ellipse cx="100" cy="98" rx="40" ry="44" fill="url(#${u}skin)"/>
  <ellipse cx="60" cy="104" rx="6" ry="9" fill="#e09a74"/><ellipse cx="140" cy="104" rx="6" ry="9" fill="#e09a74"/>
  <circle cx="61" cy="118" r="4.2" fill="none" stroke="#e8b84a" stroke-width="2.2"/><circle cx="139" cy="118" r="4.2" fill="none" stroke="#e8b84a" stroke-width="2.2"/>
  <!-- má hồng -->
  <ellipse cx="74" cy="118" rx="13" ry="8" fill="url(#${u}blush)"/><ellipse cx="126" cy="118" rx="13" ry="8" fill="url(#${u}blush)"/>
  <!-- mắt to, nhìn lên (đang nghĩ) -->
  <g>
    <ellipse cx="82" cy="99" rx="13" ry="14" fill="#fff"/><ellipse cx="118" cy="99" rx="13" ry="14" fill="#fff"/>
    <circle cx="85" cy="95" r="10" fill="url(#${u}eye)"/><circle cx="121" cy="95" r="10" fill="url(#${u}eye)"/>
    <circle cx="85" cy="95" r="4.5" fill="#1a0e07"/><circle cx="121" cy="95" r="4.5" fill="#1a0e07"/>
    <circle cx="88.5" cy="91" r="3.2" fill="#fff"/><circle cx="124.5" cy="91" r="3.2" fill="#fff"/>
    <circle cx="81.5" cy="99" r="1.4" fill="#fff" opacity=".8"/><circle cx="117.5" cy="99" r="1.4" fill="#fff" opacity=".8"/>
    <path d="M68 92 q14 -14 28 -4" stroke="#1a0e07" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M104 88 q14 -10 28 4" stroke="#1a0e07" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M68 92 l-4 -3 M71 88 l-3 -4 M132 92 l4 -3 M129 88 l3 -4" stroke="#1a0e07" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M70 80 q12 -6 22 -2 M108 77 q12 -3 22 4" stroke="#3f271c" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  </g>
  <!-- mũi, miệng cười mỉm -->
  <path d="M99 106 q-3 8 1 10 q3 1 5 -1" stroke="#c07a55" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="101" cy="111" rx="3" ry="1.6" fill="#fff" opacity=".35"/>
  <path d="M91 124 q9 6 18 -1" stroke="#b5554a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M93 125 q8 4 14 -1" stroke="#e8857a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <!-- tóc trước: rẽ ngôi, lọn gợn sóng ôm mặt -->
  <path d="M58 104 C52 64 74 44 100 44 C130 44 150 62 144 104 C140 86 134 70 120 62 C110 72 92 74 80 70 C72 78 64 90 58 104Z" fill="url(#${u}hair)"/>
  <path d="M100 46 C92 52 86 60 80 70" stroke="#2a1912" stroke-width="2" fill="none" opacity=".6"/>
  <path d="M96 48 C88 54 82 62 78 70" stroke="#8a5a3e" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>
  <path d="M104 48 C118 52 130 60 136 72" stroke="#8a5a3e" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
  <path d="M58 98 C48 112 62 124 52 138 C42 152 58 162 48 176 C42 186 50 194 46 200" stroke="url(#${u}hair)" stroke-width="18" fill="none" stroke-linecap="round"/>
  <path d="M144 98 C154 112 140 124 150 138 C160 152 144 162 154 176 C160 186 152 194 156 200" stroke="url(#${u}hair)" stroke-width="18" fill="none" stroke-linecap="round"/>
  <path d="M56 112 C50 122 58 128 52 138 C46 148 56 156 50 166" stroke="#8a5a3e" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
  <path d="M146 112 C152 122 144 128 150 138 C156 148 146 156 152 166" stroke="#8a5a3e" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
  <!-- tay chạm cằm: tay áo len + nắm tay nhỏ, ngón trỏ chạm cằm -->
  <path d="M96 200 C98 182 106 168 118 158 L134 166 C124 176 118 188 118 200Z" fill="url(#${u}knit)"/>
  <path d="M104 182 q10 4 18 -4 M100 192 q12 4 20 -4" stroke="#d4c2a6" stroke-width="2" fill="none"/>
  <ellipse cx="124" cy="152" rx="11" ry="9" fill="url(#${u}skin)"/>
  <path d="M116 147 q4 3 9 2 M117 152 q4 3 9 2 M119 157 q4 2 8 1" stroke="#c07a55" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <path d="M117 146 C113 140 110 134 109 129 C108 126 111 124 113 126 C115 130 119 138 123 143Z" fill="#f2b893"/>
  <ellipse cx="110.5" cy="127.5" rx="2" ry="1.5" fill="#fbe0cf"/>
  ${hat ? `<!-- mũ len Noel -->
  <path d="M56 70 C60 30 120 12 152 40 C164 52 170 66 172 84 L152 70 C150 60 140 54 130 52 C110 48 80 54 56 70Z" fill="#d6413e"/>
  <path d="M60 40 C80 26 110 22 130 30" stroke="#f17c74" stroke-width="5" fill="none" opacity=".6"/>
  <rect x="48" y="62" width="108" height="18" rx="9" fill="#fff8f0" transform="rotate(-6 100 70)"/>
  <circle cx="174" cy="88" r="11" fill="#fff8f0"/>` : `<!-- ánh sáng trên tóc -->
  <path d="M120 54 C132 58 140 68 142 80" stroke="url(#${u}hairHi)" stroke-width="6" fill="none" stroke-linecap="round"/>`}
</svg>`;
}
export const girl3dSvg = (opts) => svgFrom(girl3dMarkup(opts));
