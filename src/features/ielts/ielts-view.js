// Màn IELTS (P9.01–P9.05): tổng quan + kế hoạch, flashcard, luyện 4 kỹ năng.
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { fmtClock } from '../../core/time.js';
import { WEEKDAY_NAMES } from '../../core/dates.js';
import { SKILLS, DICTATION, READINGS, WRITING_TASKS, WRITING_CHECK, CUE_CARDS } from './content.js';
import {
  lessonDone, getPlan, savePlan, planFor, ieltsSummary,
} from './ielts.js';
import { prepCard } from './prep.js';
import { speakTTS } from './pronounce.js';
import { vocabTeaser } from '../vocab/vocab-view.js';

let skill = 'listening';
let pick = { listening: 0, reading: 0, writing: 0, speaking: 0 };
const startedAt = {};
const minutesSince = (k) => (startedAt[k] ? (Date.now() - startedAt[k]) / 60000 : 1);
const words = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);

function summaryCard(s, plan) {
  return h('section', { class: 'card' },
    h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('b', {}, `${s.learned}/${s.total}`), h('span', {}, 'từ đã thuộc / sổ tay')),
      h('div', { class: 'stat' }, h('b', {}, `${s.weekMinutes} phút`), h('span', {}, `học tuần này (${s.weekLessons} buổi)`)),
      h('div', { class: 'stat' }, h('b', {}, s.weakest ? s.weakest.name : '—'), h('span', {}, s.weakest?.avg != null ? `kỹ năng yếu nhất (TB ${s.weakest.avg}%)` : 'nên luyện thêm'))),
    plan ? h('p', { class: 'insight' }, `Hôm nay theo kế hoạch: ${SKILLS.find((x) => x[0] === plan.skill)[1]} ${plan.minutes} phút. `,
      h('button', { class: 'chip', onclick: () => { skill = plan.skill; notifyChange(); } }, 'Bắt đầu'))
      : h('p', { class: 'muted small' }, 'Hôm nay là ngày nghỉ theo kế hoạch. Ôn vài thẻ từ là đủ 🌿'));
}

function planCard(p) {
  return h('details', { class: 'card' }, h('summary', {}, '🗓️ Kế hoạch học'),
    h('div', { class: 'form-row' },
      h('label', { class: 'field-inline' }, 'Mỗi buổi', h('input', { class: 'input num', type: 'number', min: '10', max: '180', value: p.minutes, 'aria-label': 'Số phút mỗi buổi', onchange: (e) => savePlan({ ...p, minutes: Number(e.target.value) || 30 }) }), 'phút'),
      h('label', { class: 'field-inline' }, h('input', { type: 'checkbox', checked: p.autoTask, onchange: (e) => savePlan({ ...p, autoTask: e.target.checked }) }), 'Tự thêm việc vào Hôm nay')),
    h('ul', { class: 'log-list' }, [1, 2, 3, 4, 5, 6, 0].map((wd) => h('li', {},
      h('label', { class: 'field-inline grow' }, h('input', {
        type: 'checkbox', checked: p.days.includes(wd),
        onchange: (e) => savePlan({ ...p, days: e.target.checked ? [...p.days, wd] : p.days.filter((d) => d !== wd) }),
      }), WEEKDAY_NAMES[wd]),
      h('select', { class: 'input', 'aria-label': `Kỹ năng ${WEEKDAY_NAMES[wd]}`, onchange: (e) => savePlan({ ...p, skills: { ...p.skills, [wd]: e.target.value } }) },
        SKILLS.map(([k, l]) => h('option', { value: k, selected: p.skills[wd] === k }, l)))))));
}

function speak(text, rate = 0.9) {
  if (!speakTTS(text, rate)) toast('Trình duyệt chưa hỗ trợ đọc to');
}

function listening() {
  const i = pick.listening % DICTATION.length;
  const sentence = DICTATION[i];
  const result = h('div');
  startedAt.listening ??= Date.now();
  return [
    h('p', { class: 'muted small' }, 'Nghe câu rồi gõ lại chính xác. Có thể nghe chậm.'),
    h('div', { class: 'presets' },
      h('button', { class: 'btn', onclick: () => speak(sentence) }, '🔊 Nghe'),
      h('button', { class: 'chip', onclick: () => speak(sentence, 0.65) }, '🐢 Nghe chậm')),
    h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        const want = words(sentence), got = words(e.target.elements.a.value);
        const ok = want.filter((w, k) => got[k] === w).length;
        const score = Math.round((ok / want.length) * 100);
        mount(result, h('p', {}, `Đúng ${ok}/${want.length} từ (${score}%).`), h('p', { class: 'small' }, `Đáp án: ${sentence}`));
        await lessonDone('listening', minutesSince('listening'), { score });
        delete startedAt.listening;
      },
    }, h('input', { class: 'input', name: 'a', placeholder: 'Gõ lại câu bạn nghe được', 'aria-label': 'Câu nghe được', autocomplete: 'off' }), h('button', { class: 'chip', type: 'submit' }, 'Kiểm tra')),
    result,
    h('button', { class: 'chip', onclick: () => { pick.listening++; notifyChange(); } }, 'Câu khác →'),
  ];
}

function reading() {
  const r = READINGS[pick.reading % READINGS.length];
  startedAt.reading ??= Date.now();
  const result = h('div');
  return [
    h('h4', {}, r.title),
    h('p', { class: 'reading-text' }, r.text),
    h('form', {
      class: 'quiz', onsubmit: async (e) => {
        e.preventDefault();
        const f = e.target.elements;
        const ok = r.questions.filter(([, ans], k) => f[`q${k}`].value === ans).length;
        const score = Math.round((ok / r.questions.length) * 100);
        mount(result, h('p', {}, `Đúng ${ok}/${r.questions.length} (${score}%).`), h('p', { class: 'small' }, `Đáp án: ${r.questions.map(([, a], k) => `${k + 1}-${a}`).join(', ')}`));
        await lessonDone('reading', minutesSince('reading'), { score });
        delete startedAt.reading;
      },
    },
      r.questions.map(([q], k) => h('fieldset', {}, h('legend', {}, `${k + 1}. ${q}`),
        ['T', 'F', 'NG'].map((a) => h('label', { class: 'field-inline' }, h('input', { type: 'radio', name: `q${k}`, value: a, required: true }), { T: 'True', F: 'False', NG: 'Not Given' }[a])))),
      h('button', { class: 'btn', type: 'submit' }, 'Nộp bài')),
    result,
    h('button', { class: 'chip', onclick: () => { pick.reading++; notifyChange(); } }, 'Bài khác →'),
  ];
}

let writeTimer = null;
function writing() {
  const [task, prompt, minWords, mins] = WRITING_TASKS[pick.writing % WRITING_TASKS.length];
  const count = h('span', { class: 'muted small' }, '0 từ');
  const clock = h('span', { class: 'muted small' }, `${mins}:00`);
  const area = h('textarea', {
    class: 'input', rows: '10', 'aria-label': 'Bài viết',
    oninput: (e) => {
      count.textContent = `${words(e.target.value).length} từ${words(e.target.value).length < minWords ? ` (cần ${minWords})` : ''}`;
      if (!startedAt.writing) {
        startedAt.writing = Date.now();
        clearInterval(writeTimer);
        writeTimer = setInterval(() => {
          if (!clock.isConnected) { clearInterval(writeTimer); return; }
          clock.textContent = fmtClock(mins * 60000 - (Date.now() - startedAt.writing));
        }, 1000);
      }
    },
  });
  return [
    h('p', {}, h('b', {}, `${task}: `), prompt),
    h('div', { class: 'presets' }, count, h('span', {}, '·'), clock, h('span', { class: 'muted small' }, '(đồng hồ chạy khi bắt đầu gõ)')),
    area,
    h('form', {
      class: 'quiz', onsubmit: async (e) => {
        e.preventDefault();
        const checks = [...e.target.querySelectorAll('input[type=checkbox]')].filter((c) => c.checked).length;
        const score = Math.round((checks / WRITING_CHECK.length) * 100);
        await lessonDone('writing', minutesSince('writing'), { score, words: words(area.value).length });
        delete startedAt.writing;
        toast(`Đã lưu buổi viết (tự chấm ${score}%). Bài viết không được lưu lại.`);
      },
    }, h('p', { class: 'muted small' }, 'Tự kiểm tra sau khi viết:'),
      WRITING_CHECK.map((c) => h('label', { class: 'field-inline check' }, h('input', { type: 'checkbox' }), c)),
      h('button', { class: 'btn', type: 'submit' }, 'Xong buổi viết')),
    h('button', { class: 'chip', onclick: () => { pick.writing++; delete startedAt.writing; notifyChange(); } }, 'Đề khác →'),
  ];
}

let recorder = null;
function speaking() {
  const [topic, points] = CUE_CARDS[pick.speaking % CUE_CARDS.length];
  const status = h('p', { class: 'speak-status' }, 'Bấm bắt đầu: 1 phút chuẩn bị, 2 phút nói.');
  const audio = h('audio', { controls: true, hidden: true });
  let timer;
  const run = (label, secs, next) => {
    let left = secs;
    clearInterval(timer);
    status.textContent = `${label}: ${fmtClock(left * 1000)}`;
    timer = setInterval(() => {
      left--;
      if (!status.isConnected) { clearInterval(timer); return; }
      status.textContent = `${label}: ${fmtClock(left * 1000)}`;
      if (left <= 0) { clearInterval(timer); next?.(); }
    }, 1000);
  };
  const record = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        audio.src = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
        audio.hidden = false;
      };
      recorder.start();
    } catch { recorder = null; }
  };
  return [
    h('div', { class: 'cue-card' }, h('b', {}, topic), h('p', { class: 'small' }, 'You should say:'), h('ul', {}, points.map((p) => h('li', {}, p)))),
    status,
    h('div', { class: 'presets' },
      h('button', {
        class: 'btn', onclick: () => {
          startedAt.speaking = Date.now();
          run('Chuẩn bị', 60, async () => {
            await record();
            run(recorder ? 'Đang nói (đang ghi âm)' : 'Đang nói', 120, () => { recorder?.state === 'recording' && recorder.stop(); status.textContent = 'Hết giờ! Nghe lại bài nói của bạn.'; });
          });
        },
      }, '▶ Bắt đầu'),
      h('button', { class: 'chip', onclick: () => { clearInterval(timer); recorder?.state === 'recording' && recorder.stop(); status.textContent = 'Đã dừng.'; } }, '⏹ Dừng'),
      h('button', {
        class: 'chip', onclick: async () => { await lessonDone('speaking', minutesSince('speaking')); delete startedAt.speaking; toast('Đã lưu buổi luyện nói'); },
      }, '✓ Xong buổi nói')),
    audio,
    h('p', { class: 'muted small' }, 'Ghi âm chỉ phát lại ngay tại đây, không lưu và không gửi đi đâu.'),
    h('button', { class: 'chip', onclick: () => { pick.speaking++; notifyChange(); } }, 'Đề khác →'),
  ];
}

export async function renderIelts(root) {
  const s = await ieltsSummary();
  const p = await getPlan();
  const body = { listening, reading, writing, speaking }[skill]();
  mount(root,
    h('div', { class: 'view-head' }, subnav('learn', 'ielts'), h('h2', {}, 'IELTS')),
    summaryCard(s, await planFor()),
    await prepCard(),
    await vocabTeaser(),
    h('section', { class: 'card' },
      h('div', { class: 'presets', role: 'tablist' }, SKILLS.map(([k, l]) => h('button', {
        class: `chip${k === skill ? ' on' : ''}`, role: 'tab', 'aria-selected': String(k === skill),
        onclick: () => { skill = k; notifyChange(); },
      }, `${l}${s.bySkill[k].count ? ` · ${s.bySkill[k].count}` : ''}`))),
      body),
    planCard(p));
}
