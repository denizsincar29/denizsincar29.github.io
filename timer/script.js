"use strict";

/* ---------- библиотека встроенных звуков ---------- */

const ALARM_SOUNDS = Array.from({ length: 17 }, (_, i) => ({
  type: "builtin",
  src: `sounds/alarm${i + 1}.ogg`,
  label: `Сигнал ${i + 1}`,
}));

const CLOCK_SOUNDS = Array.from({ length: 7 }, (_, i) => ({
  type: "builtin",
  src: `sounds/clock${i + 1}.ogg`,
  label: `Тиканье ${i + 1}`,
}));

const STORAGE_KEY = "timers_v1";

let timers = loadTimers();

const listEl = document.getElementById("timerList");
const emptyHint = document.getElementById("emptyHint");
const liveRegion = document.getElementById("liveRegion");

const createDialog = document.getElementById("createDialog");
const createForm = document.getElementById("createForm");
const queuesContainer = document.getElementById("queuesContainer");
const timerNameInput = document.getElementById("timerName");

const runDialog = document.getElementById("runDialog");
const runTitle = document.getElementById("runTitle");
const queueStatus = document.getElementById("queueStatus");
const clockDisplay = document.getElementById("clockDisplay");
const runLive = document.getElementById("runLive");

const previewAudio = document.getElementById("previewAudio");
const beepEnd = document.getElementById("beepEnd");
const beepTick = document.getElementById("beepTick");

function loadTimers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTimers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
}

function announce(text) {
  liveRegion.textContent = "";
  requestAnimationFrame(() => { liveRegion.textContent = text; });
}

function runAnnounce(text) {
  runLive.textContent = "";
  requestAnimationFrame(() => { runLive.textContent = text; });
}

/* ---------- доступный список выбора звука (ARIA listbox) ---------- */

let pickerSeq = 0;

/**
 * Создаёт доступный список выбора звука.
 * @param {{legend:string, sounds:{type:string,src:string,label:string}[], allowNone:boolean, noneLabel:string}} opts
 * @returns {{el:HTMLElement, getValue:()=>{type:string,src:string|null,label:string}, setValue:(v:any)=>void}}
 */
function createSoundPicker(opts) {
  pickerSeq++;
  const uid = `picker_${pickerSeq}`;

  const wrapper = document.createElement("div");
  wrapper.className = "sound-picker";

  const legend = document.createElement("span");
  legend.className = "picker-label";
  legend.id = `${uid}_label`;
  legend.textContent = opts.legend;
  wrapper.appendChild(legend);

  const hint = document.createElement("span");
  hint.className = "picker-hint";
  hint.textContent = " (стрелки — выбрать, пробел — прослушать)";
  legend.appendChild(hint);

  const listbox = document.createElement("div");
  listbox.className = "listbox";
  listbox.setAttribute("role", "listbox");
  listbox.setAttribute("aria-labelledby", legend.id);
  wrapper.appendChild(listbox);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*";
  fileInput.hidden = true;
  fileInput.className = "custom-file-input";
  wrapper.appendChild(fileInput);

  const options = [];
  const entries = [];
  if (opts.allowNone) {
    entries.push({ type: "none", src: null, label: opts.noneLabel || "Без звука" });
  }
  opts.sounds.forEach((s) => entries.push(s));
  entries.push({ type: "custom", src: null, label: "Свой файл… (Enter — выбрать)" });

  entries.forEach((entry, i) => {
    const opt = document.createElement("div");
    opt.setAttribute("role", "option");
    opt.className = "option";
    opt.tabIndex = i === 0 ? 0 : -1;
    opt.dataset.type = entry.type;
    if (entry.src) opt.dataset.src = entry.src;
    opt.dataset.label = entry.label;
    opt.textContent = entry.label;
    opt.setAttribute("aria-selected", i === 0 ? "true" : "false");
    if (i === 0) opt.classList.add("selected");
    listbox.appendChild(opt);
    options.push(opt);
  });

  function selectIndex(idx) {
    options.forEach((o, i) => {
      const active = i === idx;
      o.tabIndex = active ? 0 : -1;
      o.setAttribute("aria-selected", active ? "true" : "false");
      o.classList.toggle("selected", active);
    });
    options[idx].focus();
  }

  function currentIndex() {
    return options.findIndex((o) => o.tabIndex === 0);
  }

  function playPreview(opt) {
    if (opt.dataset.type === "none") {
      announce("Без звука");
      return;
    }
    if (!opt.dataset.src) {
      announce("Сначала выберите файл клавишей Enter");
      return;
    }
    previewAudio.src = opt.dataset.src;
    previewAudio.play().catch(() => {});
  }

  listbox.addEventListener("keydown", (e) => {
    const idx = currentIndex();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectIndex(Math.min(idx + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectIndex(Math.max(idx - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      selectIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      selectIndex(options.length - 1);
    } else if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      playPreview(options[idx]);
    } else if (e.key === "Enter") {
      if (options[idx].dataset.type === "custom") {
        e.preventDefault();
        fileInput.click();
      }
    }
  });

  listbox.addEventListener("click", (e) => {
    const opt = e.target.closest('[role="option"]');
    if (!opt) return;
    selectIndex(options.indexOf(opt));
    if (opt.dataset.type === "custom") fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const customOpt = options[options.length - 1];
      customOpt.dataset.src = reader.result;
      customOpt.dataset.label = `Свой файл: ${file.name}`;
      customOpt.textContent = customOpt.dataset.label;
      selectIndex(options.length - 1);
      announce(`Файл ${file.name} выбран`);
    };
    reader.readAsDataURL(file);
  });

  return {
    el: wrapper,
    getValue() {
      const idx = currentIndex();
      const opt = options[Math.max(idx, 0)];
      return {
        type: opt.dataset.type,
        src: opt.dataset.src || null,
        label: opt.dataset.label,
      };
    },
    setValue(v) {
      if (!v) return;
      let idx = options.findIndex((o) => o.dataset.type === v.type && o.dataset.src === v.src);
      if (idx === -1 && v.type === "custom" && v.src) {
        idx = options.length - 1;
        options[idx].dataset.src = v.src;
        options[idx].dataset.label = v.label || "Свой файл";
        options[idx].textContent = options[idx].dataset.label;
      }
      if (idx === -1) idx = 0;
      selectIndex(idx);
    },
  };
}

/* ---------- список таймеров ---------- */

function renderList() {
  listEl.innerHTML = "";
  emptyHint.hidden = timers.length !== 0;
  timers.forEach((t, idx) => {
    const li = document.createElement("li");

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "select-timer";
    startBtn.textContent = `${t.name} (${t.queues.length} ${pluralQueue(t.queues.length)})`;
    startBtn.addEventListener("click", () => startTimer(idx));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "danger";
    delBtn.textContent = "Удалить";
    delBtn.setAttribute("aria-label", `Удалить таймер ${t.name}`);
    delBtn.addEventListener("click", () => {
      if (confirm(`Удалить таймер «${t.name}»?`)) {
        timers.splice(idx, 1);
        saveTimers();
        renderList();
        announce(`Таймер ${t.name} удалён`);
      }
    });

    li.appendChild(startBtn);
    li.appendChild(delBtn);
    listEl.appendChild(li);
  });
}

function pluralQueue(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "очередь";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "очереди";
  return "очередей";
}

/* ---------- создание таймера ---------- */

let queueCount = 0;
const queuePickers = new Map(); // queueIndex -> {end, tick}

function addQueueBlock() {
  queueCount++;
  const n = queueCount;
  const block = document.createElement("fieldset");
  block.className = "queue-block";
  block.dataset.queueIndex = String(n);
  block.innerHTML = `
    <legend>Очередь ${n}</legend>
    <div class="hms">
      <div>
        <label for="h_${n}">Часы</label>
        <input type="number" id="h_${n}" min="0" max="23" value="0" required>
      </div>
      <div>
        <label for="m_${n}">Минуты</label>
        <input type="number" id="m_${n}" min="0" max="59" value="0" required>
      </div>
      <div>
        <label for="s_${n}">Секунды</label>
        <input type="number" id="s_${n}" min="0" max="59" value="0" required>
      </div>
    </div>
  `;

  const endPicker = createSoundPicker({
    legend: "Звук по окончании",
    sounds: ALARM_SOUNDS,
    allowNone: true,
    noneLabel: "Без звука (короткий сигнал)",
  });
  const tickPicker = createSoundPicker({
    legend: "Звук тиканья",
    sounds: CLOCK_SOUNDS,
    allowNone: true,
    noneLabel: "Без тиканья",
  });
  block.appendChild(endPicker.el);
  block.appendChild(tickPicker.el);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "danger removeQueue";
  removeBtn.textContent = "Удалить очередь";
  removeBtn.addEventListener("click", () => {
    block.remove();
    queuePickers.delete(n);
  });
  block.appendChild(removeBtn);

  queuePickers.set(n, { end: endPicker, tick: tickPicker });
  queuesContainer.appendChild(block);
}

document.getElementById("btnAddQueue").addEventListener("click", addQueueBlock);

document.getElementById("btnNewTimer").addEventListener("click", () => {
  createForm.reset();
  queuesContainer.innerHTML = "";
  queuePickers.clear();
  queueCount = 0;
  addQueueBlock();
  createDialog.showModal();
  timerNameInput.focus();
});

document.getElementById("btnCancelCreate").addEventListener("click", () => {
  createDialog.close();
});

createForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = timerNameInput.value.trim();
  if (!name) return;

  const blocks = [...queuesContainer.querySelectorAll(".queue-block")];
  if (blocks.length === 0) {
    announce("Добавьте хотя бы одну очередь");
    return;
  }

  const queues = [];
  for (const block of blocks) {
    const n = Number(block.dataset.queueIndex);
    const h = Number(document.getElementById(`h_${n}`).value) || 0;
    const m = Number(document.getElementById(`m_${n}`).value) || 0;
    const s = Number(document.getElementById(`s_${n}`).value) || 0;
    if (h === 0 && m === 0 && s === 0) {
      announce(`Очередь ${n}: время не может быть нулевым`);
      return;
    }
    const pickers = queuePickers.get(n);
    const endSound = pickers.end.getValue();
    const tickSound = pickers.tick.getValue();
    queues.push({ h, m, s, endSound, tickSound });
  }

  timers.push({ name, queues });
  saveTimers();
  renderList();
  createDialog.close();
  announce(`Таймер ${name} сохранён`);
});

/* ---------- запуск таймера ---------- */

let activeInterval = null;
let activeTimer = null;
let queueIdx = 0;
let remaining = { h: 0, m: 0, s: 0 };
let paused = false;

function fmt(n) { return String(n).padStart(2, "0"); }

function updateClock() {
  clockDisplay.textContent = `${fmt(remaining.h)}:${fmt(remaining.m)}:${fmt(remaining.s)}`;
}

function playSound(el, sound) {
  if (sound && sound.type !== "none" && sound.src) {
    el.src = sound.src;
    el.play().catch(() => {});
  } else {
    el.pause();
  }
}

function beep(freq = 880, dur = 0.2) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

function startTimer(idx) {
  activeTimer = timers[idx];
  queueIdx = 0;
  runTitle.textContent = activeTimer.name;
  runDialog.showModal();
  startQueue();
}

function startQueue() {
  const q = activeTimer.queues[queueIdx];
  remaining = { h: q.h, m: q.m, s: q.s };
  paused = false;
  updateClock();
  queueStatus.textContent = `Очередь ${queueIdx + 1} из ${activeTimer.queues.length}`;
  runAnnounce(`Начата очередь ${queueIdx + 1} из ${activeTimer.queues.length}`);
  playSound(beepTick, q.tickSound);
  if (activeInterval) clearInterval(activeInterval);
  activeInterval = setInterval(tick, 1000);
}

function tick() {
  if (paused) return;
  if (remaining.s > 0) {
    remaining.s--;
  } else if (remaining.m > 0) {
    remaining.m--; remaining.s = 59;
  } else if (remaining.h > 0) {
    remaining.h--; remaining.m = 59; remaining.s = 59;
  } else {
    finishQueue();
    return;
  }
  updateClock();
}

function finishQueue() {
  clearInterval(activeInterval);
  beepTick.pause();
  const q = activeTimer.queues[queueIdx];
  if (q.endSound && q.endSound.type !== "none" && q.endSound.src) {
    playSound(beepEnd, q.endSound);
  } else {
    beep(660, 0.4);
  }
  queueIdx++;
  if (queueIdx < activeTimer.queues.length) {
    runAnnounce("Очередь завершена");
    startQueue();
  } else {
    runAnnounce("Все очереди завершены");
    queueStatus.textContent = "Готово";
  }
}

document.getElementById("btnPause").addEventListener("click", togglePause);
function togglePause() {
  paused = !paused;
  if (paused) { beepTick.pause(); runAnnounce("Пауза"); }
  else { beepTick.play().catch(() => {}); runAnnounce("Продолжено"); }
}

document.getElementById("btnAnnounce").addEventListener("click", () => {
  runAnnounce(`${remaining.h} часов, ${remaining.m} минут, ${remaining.s} секунд`);
});

document.getElementById("btnStop").addEventListener("click", stopTimer);
function stopTimer() {
  if (confirm("Остановить и закрыть таймер?")) {
    clearInterval(activeInterval);
    beepTick.pause();
    beepEnd.pause();
    runDialog.close();
  }
}

runDialog.addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P" || e.key === "з" || e.key === "З") togglePause();
  if (e.key === "t" || e.key === "T" || e.key === "е" || e.key === "Е") {
    runAnnounce(`${remaining.h} часов, ${remaining.m} минут, ${remaining.s} секунд`);
  }
  if (e.key === "Escape") {
    e.preventDefault();
    stopTimer();
  }
});

renderList();
