// Thanh chuyển nhanh giữa các màn trong cùng một nhóm tab.
import { h } from './dom.js';

export const GROUPS = {
  tasks: [['tasks', 'Danh sách'], ['board', 'Bảng'], ['matrix', 'Ưu tiên'], ['calendar', 'Lịch'], ['lists', 'Theo ngày', true]],
  health: [['water', 'Nước'], ['food', 'Ăn uống'], ['habits', 'Thói quen']],
  home: [['house', 'Ngôi nhà'], ['garden', 'Khu vườn'], ['avatar', 'Nhân vật'], ['moodboard', 'Mood board'], ['closet', 'Tủ đồ thật'], ['stylist', 'Tư vấn']],
  learn: [['ielts', 'IELTS'], ['lessons', 'Kiến thức tài chính']],
  journal: [['journal', 'Viết'], ['journal-album', 'Album ảnh'], ['journal-cal', 'Lịch & tổng kết']],
  finance: [['money', 'Thu chi'], ['budget', 'Ngân sách'], ['saving', 'Tiết kiệm & nợ'], ['wishlist', 'Wishlist'], ['money-report', 'Báo cáo'], ['market', 'Thị trường']],
};

export const groupOf = (view) => Object.keys(GROUPS).find((g) => GROUPS[g].some(([k]) => k === view)) ?? view;

export function subnav(group, active) {
  return h('nav', { class: 'segmented', 'aria-label': 'Chuyển màn' },
    GROUPS[group].filter(([k, , hidden]) => !hidden || k === active).map(([k, label]) => h('a', {
      href: `#${k}`, class: k === active ? 'on' : null, 'aria-current': k === active ? 'page' : null,
    }, label)));
}
