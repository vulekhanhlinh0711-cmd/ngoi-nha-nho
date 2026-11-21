// Nhật ký sự kiện: mọi hành động đều ghi lại để sau này tính xu, streak, thống kê.
import { put, del, getAllByIndex } from './db.js';

export const bus = new EventTarget();

export function logEvent(type, data = {}) {
  return put('events', { type, source: 'habit', at: new Date().toISOString(), ...data });
}

// Báo cho giao diện vẽ lại khi dữ liệu đổi.
export function notifyChange() {
  bus.dispatchEvent(new Event('change'));
}

export const queryEvents = (type) => getAllByIndex('events', 'type', type);
export const deleteEvent = (id) => del('events', id);
