// Bắt đầu tập trung từ bất kỳ màn nào (nút ▶ cạnh việc).
import { startWork } from './pomodoro.js';

export async function startFocusOn(taskId) {
  await startWork(taskId);
  location.hash = '#focus';
}
