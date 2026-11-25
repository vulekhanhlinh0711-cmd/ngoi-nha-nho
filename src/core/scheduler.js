// Một nhịp chung cho các việc kiểm tra định kỳ (nhắc phân loại, lịch hẹn, uống nước).
const jobs = [];
export const every20s = (fn) => jobs.push(fn);

function runAll() {
  for (const job of jobs) Promise.resolve().then(job).catch((e) => console.error(e));
}

export function startScheduler() {
  runAll();
  setInterval(runAll, 20_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') runAll();
  });
}
