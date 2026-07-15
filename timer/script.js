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

const importDialog = document.getElementById("importDialog");
const importText = document.getElementById("importText");
const importMode = document.getElementById("importMode");

const previewAudio = document.getElementById("previewAudio");
const beepEnd = document.getElementById("beepEnd");
const beepTick = document.getElementById("beepTick");
const beepWarn = document.getElementById("beepWarn");

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

function pickRandom(list) {
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function resolveSrc(src) {
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  return new URL(src, document.baseURI).href;
}

/* ---------- доступный список выбора звука (ARIA listbox, мультивыбор) ---------- */

let pickerSeq = 0;

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
  hint.textContent = " (стрелки — переместиться, пробел — выбрать/снять, Shift+пробел — прослушать/остановить; несколько выбранных — при срабатывании звук случайный; Delete — удалить свой файл)";
  legend.appendChild(hint);

  const listbox = document.createElement("div");
  listbox.className = "listbox";
  listbox.setAttribute("role", "listbox");
  listbox.setAttribute("aria-multiselectable", "true");
  listbox.setAttribute("aria-labelledby", legend.id);
  wrapper.appendChild(listbox);

  const addFileBtn = document.createElement("button");
  addFileBtn.type = "button";
  addFileBtn.className = "add-file-btn";
  addFileBtn.textContent = "Добавить свой файл (можно несколько)";
  wrapper.appendChild(addFileBtn);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*";
  fileInput.multiple = true;
  fileInput.hidden = true;
  wrapper.appendChild(fileInput);

  addFileBtn.addEventListener("click", () => fileInput.click());

  const options = [];

  function makeOption(entry, custom) {
    const opt = document.createElement("div");
    opt.setAttribute("role", "option");
    opt.className = "option";
    opt.tabIndex = options.length === 0 ? 0 : -1;
    opt.dataset.type = entry.type;
    opt.dataset.custom = custom ? "true" : "false";
    if (entry.src) opt.dataset.src = entry.src;
    opt.dataset.label = entry.label;
    opt.textContent = entry.label;
    opt.setAttribute("aria-selected", "false");
    listbox.appendChild(opt);
    options.push(opt);
    return opt;
  }

  opts.sounds.forEach((s) => makeOption(s, false));

  function currentIndex() {
    const idx = options.findIndex((o) => o.tabIndex === 0);
    return idx === -1 ? 0 : idx;
  }

  function moveFocus(idx) {
    idx = Math.max(0, Math.min(idx, options.length - 1));
    options.forEach((o, i) => { o.tabIndex = i === idx ? 0 : -1; });
    options[idx].focus();
  }

  function toggleSelect(opt) {
    const selected = opt.getAttribute("aria-selected") === "true";
    opt.setAttribute("aria-selected", selected ? "false" : "true");
    opt.classList.toggle("selected", !selected);
    return !selected;
  }

  function togglePreview(opt) {
    if (!opt.dataset.src) {
      announce("У этого пункта нет звука");
      return;
    }
    const target = resolveSrc(opt.dataset.src);
    if (!previewAudio.paused && previewAudio.src === target) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
      announce("Прослушивание остановлено");
    } else {
      previewAudio.src = opt.dataset.src;
      previewAudio.currentTime = 0;
      previewAudio.play().catch(() => {});
      announce(`Прослушивание: ${opt.dataset.label}`);
    }
  }

  function removeOption(opt) {
    const idx = options.indexOf(opt);
    if (idx === -1) return;
    options.splice(idx, 1);
    opt.remove();
    if (options.length > 0) moveFocus(Math.min(idx, options.length - 1));
  }

  listbox.addEventListener("keydown", (e) => {
    if (options.length === 0) return;
    const idx = currentIndex();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(idx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(idx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(options.length - 1);
    } else if (e.code === "Space") {
      e.preventDefault();
      const opt = options[idx];
      if (e.shiftKey) {
        togglePreview(opt);
      } else {
        const nowSelected = toggleSelect(opt);
        announce(`${opt.dataset.label}: ${nowSelected ? "выбран" : "снят"}`);
      }
    } else if (e.key === "Delete" || e.key === "Backspace") {
      const opt = options[idx];
      if (opt.dataset.custom === "true") {
        e.preventDefault();
        const label = opt.dataset.label;
        removeOption(opt);
        announce(`Файл ${label} удалён из списка`);
      }
    }
  });

  listbox.addEventListener("click", (e) => {
    const opt = e.target.closest('[role="option"]');
    if (!opt) return;
    moveFocus(options.indexOf(opt));
    const nowSelected = toggleSelect(opt);
    announce(`${opt.dataset.label}: ${nowSelected ? "выбран" : "снят"}`);
  });

  fileInput.addEventListener("change", () => {
    const files = [...fileInput.files];
    if (files.length === 0) return;
    let loaded = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const opt = makeOption({ type: "custom", src: reader.result, label: file.name }, true);
        opt.setAttribute("aria-selected", "true");
        opt.classList.add("selected");
        loaded++;
        if (loaded === files.length) announce(`Загружено файлов: ${files.length}`);
      };
      reader.readAsDataURL(file);
    });
    fileInput.value = "";
  });

  return {
    el: wrapper,
    getValue() {
      return options
        .filter((o) => o.getAttribute("aria-selected") === "true")
        .map((o) => ({ type: o.dataset.type, src: o.dataset.src, label: o.dataset.label }));
    },
    setValue(list) {
      if (!Array.isArray(list)) return;
      list.forEach((v) => {
        let opt = options.find((o) => o.dataset.src === v.src);
        if (!opt && v.type === "custom") opt = makeOption(v, true);
        if (opt) {
          opt.setAttribute("aria-selected", "true");
          opt.classList.add("selected");
        }
      });
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

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "Копировать JSON";
    copyBtn.setAttribute("aria-label", `Копировать JSON таймера ${t.name}`);
    copyBtn.addEventListener("click", () => copyTimerJson(t));

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
    li.appendChild(copyBtn);
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

/* ---------- экспорт / импорт JSON ---------- */

async function copyTimerJson(t) {
  const json = JSON.stringify(t, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    announce(`JSON таймера ${t.name} скопирован в буфер обмена`);
  } catch {
    importText.value = json;
    importMode.value = "manual-copy";
    document.getElementById("importTitle").textContent = `JSON таймера «${t.name}» — скопируйте вручную (Ctrl+C)`;
    document.getElementById("btnDoImport").hidden = true;
    importDialog.showModal();
    importText.focus();
    importText.select();
  }
}

document.getElementById("btnImportTimer").addEventListener("click", async () => {
  importMode.value = "import";
  document.getElementById("importTitle").textContent = "Вставить JSON таймера";
  document.getElementById("btnDoImport").hidden = false;
  importText.value = "";
  try {
    const clip = await navigator.clipboard.readText();
    if (clip && clip.trim().startsWith("{")) importText.value = clip;
  } catch {
    /* буфер недоступен — пусть вставит вручную Ctrl+V */
  }
  importDialog.showModal();
  importText.focus();
});

document.getElementById("btnCancelImport").addEventListener("click", () => {
  importDialog.close();
});

document.getElementById("btnDoImport").addEventListener("click", () => {
  let data;
  try {
    data = JSON.parse(importText.value);
  } catch {
    announce("Не удалось разобрать JSON — проверьте текст");
    return;
  }
  if (!data || typeof data.name !== "string" || !Array.isArray(data.queues)) {
    announce("Это не похоже на JSON таймера");
    return;
  }
  let name = data.name;
  const names = new Set(timers.map((t) => t.name));
  let suffix = 2;
  while (names.has(name)) { name = `${data.name} (${suffix})`; suffix++; }
  data.name = name;
  timers.push(data);
  saveTimers();
  renderList();
  importDialog.close();
  announce(`Таймер ${name} импортирован`);
});

/* ---------- создание таймера ---------- */

let queueCount = 0;
const queuePickers = new Map(); // queueIndex -> {end, tick, warn}

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
    <div class="settings-row">
      <div>
        <label for="startdelay_${n}">Отсчёт/пауза перед началом этой очереди, секунд (0 — сразу)</label>
        <input type="number" id="startdelay_${n}" min="0" value="0">
      </div>
    </div>
  `;

  const endPicker = createSoundPicker({
    legend: "Звук по окончании (ничего не выбрано — короткий сигнал)",
    sounds: ALARM_SOUNDS,
  });
  const tickPicker = createSoundPicker({
    legend: "Звук тиканья (ничего не выбрано — тишина)",
    sounds: CLOCK_SOUNDS,
  });
  const warnPicker = createSoundPicker({
    legend: "Звук предупреждения перед концом (ничего не выбрано — выключено)",
    sounds: ALARM_SOUNDS,
  });
  block.appendChild(endPicker.el);
  block.appendChild(tickPicker.el);
  block.appendChild(warnPicker.el);

  const warnBlock = document.createElement("div");
  warnBlock.className = "settings-row";
  warnBlock.innerHTML = `
    <div>
      <label for="warnsec_${n}">За сколько секунд до конца сработает предупреждение</label>
      <input type="number" id="warnsec_${n}" min="0" value="0">
    </div>
    <div class="checkbox-row">
      <input type="checkbox" id="warnloop_${n}">
      <label for="warnloop_${n}">Зациклить предупреждение (играть до конца очереди)</label>
    </div>
  `;
  block.appendChild(warnBlock);

  const srBlock = document.createElement("div");
  srBlock.className = "settings-row";
  srBlock.innerHTML = `
    <div>
      <label for="announce_${n}">Скринридер озвучивает время каждые … секунд (0 — выключено)</label>
      <input type="number" id="announce_${n}" min="0" value="0">
    </div>
    <div>
      <label for="countdown_${n}">Считать вслух последние … секунд (0 — выключено)</label>
      <input type="number" id="countdown_${n}" min="0" value="0">
    </div>
  `;
  block.appendChild(srBlock);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "danger removeQueue";
  removeBtn.textContent = "Удалить очередь";
  removeBtn.addEventListener("click", () => {
    block.remove();
    queuePickers.delete(n);
  });
  block.appendChild(removeBtn);

  queuePickers.set(n, { end: endPicker, tick: tickPicker, warn: warnPicker });
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
    const warnSound = pickers.warn.getValue();
    const warnSeconds = Number(document.getElementById(`warnsec_${n}`).value) || 0;
    const warnLoop = document.getElementById(`warnloop_${n}`).checked;
    const announceEvery = Number(document.getElementById(`announce_${n}`).value) || 0;
    const countdownSeconds = Number(document.getElementById(`countdown_${n}`).value) || 0;
    const startDelay = Number(document.getElementById(`startdelay_${n}`).value) || 0;
    queues.push({
      h, m, s, endSound, tickSound,
      warnSound, warnSeconds, warnLoop,
      announceEvery, countdownSeconds, startDelay,
    });
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
let warnTriggered = false;
let elapsedSinceQueueStart = 0;
let phase = "idle"; // idle | precountdown | running | finished
let preRemaining = 0;

function fmt(n) { return String(n).padStart(2, "0"); }
function totalSeconds(t) { return t.h * 3600 + t.m * 60 + t.s; }

function updateClock() {
  clockDisplay.textContent = `${fmt(remaining.h)}:${fmt(remaining.m)}:${fmt(remaining.s)}`;
}

function playSound(el, soundList) {
  const chosen = pickRandom(soundList);
  if (chosen && chosen.src) {
    el.src = chosen.src;
    el.play().catch(() => {});
  } else {
    el.pause();
  }
}

function playWarnSound(soundList, loop) {
  const chosen = pickRandom(soundList);
  if (chosen && chosen.src) {
    beepWarn.loop = loop;
    beepWarn.src = chosen.src;
    beepWarn.currentTime = 0;
    beepWarn.play().catch(() => {});
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

function stopAllSounds() {
  beepEnd.pause();
  beepTick.pause();
  beepWarn.pause();
  runAnnounce("Звук выключен");
}

function startTimer(idx) {
  activeTimer = timers[idx];
  queueIdx = 0;
  runTitle.textContent = activeTimer.name;
  queueStatus.textContent = "";
  runDialog.showModal();
  startQueue();
}

function startQueue() {
  const q = activeTimer.queues[queueIdx];
  if (q.startDelay > 0) {
    beginPreCountdown(q.startDelay, () => beginQueueRun(q));
  } else {
    beginQueueRun(q);
  }
}

function beginPreCountdown(seconds, onDone) {
  phase = "precountdown";
  preRemaining = seconds;
  paused = false;
  queueStatus.textContent = `Пауза перед очередью ${queueIdx + 1} из ${activeTimer.queues.length}`;
  clockDisplay.textContent = String(preRemaining);
  runAnnounce(`Начало через ${preRemaining}`);
  if (activeInterval) clearInterval(activeInterval);
  activeInterval = setInterval(() => {
    if (paused) return;
    preRemaining--;
    if (preRemaining <= 0) {
      clearInterval(activeInterval);
      onDone();
      return;
    }
    clockDisplay.textContent = String(preRemaining);
    runAnnounce(String(preRemaining));
  }, 1000);
}

function beginQueueRun(q) {
  phase = "running";
  remaining = { h: q.h, m: q.m, s: q.s };
  paused = false;
  warnTriggered = false;
  elapsedSinceQueueStart = 0;
  updateClock();
  queueStatus.textContent = `Очередь ${queueIdx + 1} из ${activeTimer.queues.length}`;
  runAnnounce(`Начата очередь ${queueIdx + 1} из ${activeTimer.queues.length}`);
  beepWarn.pause();
  beepWarn.loop = false;
  playSound(beepTick, q.tickSound);
  if (activeInterval) clearInterval(activeInterval);
  activeInterval = setInterval(tick, 1000);
}

function tick() {
  if (paused) return;
  if (totalSeconds(remaining) <= 0) { finishQueue(); return; }

  if (remaining.s > 0) {
    remaining.s--;
  } else if (remaining.m > 0) {
    remaining.m--; remaining.s = 59;
  } else if (remaining.h > 0) {
    remaining.h--; remaining.m = 59; remaining.s = 59;
  }
  elapsedSinceQueueStart++;
  updateClock();

  const q = activeTimer.queues[queueIdx];
  const totalRemaining = totalSeconds(remaining);

  if (q.announceEvery > 0 && elapsedSinceQueueStart % q.announceEvery === 0) {
    runAnnounce(`${remaining.h} часов, ${remaining.m} минут, ${remaining.s} секунд`);
  }
  if (q.countdownSeconds > 0 && totalRemaining <= q.countdownSeconds) {
    runAnnounce(String(totalRemaining));
  }
  if (!warnTriggered && q.warnSeconds > 0 && totalRemaining === q.warnSeconds) {
    warnTriggered = true;
    playWarnSound(q.warnSound, q.warnLoop);
  }
}

function finishQueue() {
  clearInterval(activeInterval);
  beepTick.pause();
  beepWarn.pause();
  const q = activeTimer.queues[queueIdx];
  const chosen = pickRandom(q.endSound);
  if (chosen && chosen.src) {
    playSound(beepEnd, q.endSound);
  } else {
    beep(660, 0.4);
  }
  queueIdx++;
  if (queueIdx < activeTimer.queues.length) {
    runAnnounce("Очередь завершена");
    startQueue();
  } else {
    phase = "finished";
    runAnnounce("Все очереди завершены. Нажмите Стоп или Esc, чтобы закрыть окно.");
    queueStatus.textContent = "Готово";
    clockDisplay.textContent = "00:00:00";
  }
}

document.getElementById("btnPause").addEventListener("click", togglePause);
function togglePause() {
  if (phase === "finished") return;
  paused = !paused;
  if (paused) {
    beepTick.pause();
    beepWarn.pause();
    runAnnounce("Пауза");
  } else {
    if (phase === "running") beepTick.play().catch(() => {});
    if (phase === "running" && warnTriggered && beepWarn.loop) beepWarn.play().catch(() => {});
    runAnnounce("Продолжено");
  }
}

document.getElementById("btnAnnounce").addEventListener("click", () => {
  if (phase === "precountdown") {
    runAnnounce(`До начала: ${preRemaining}`);
  } else {
    runAnnounce(`${remaining.h} часов, ${remaining.m} минут, ${remaining.s} секунд`);
  }
});

document.getElementById("btnMute").addEventListener("click", stopAllSounds);

document.getElementById("btnStop").addEventListener("click", stopTimer);
function stopTimer() {
  if (phase === "finished") {
    closeRunDialog();
    return;
  }
  if (confirm("Остановить и закрыть таймер?")) {
    closeRunDialog();
  }
}

function closeRunDialog() {
  clearInterval(activeInterval);
  beepTick.pause();
  beepEnd.pause();
  beepWarn.pause();
  phase = "idle";
  runDialog.close();
}

runDialog.addEventListener("keydown", (e) => {
  if (e.code === "KeyP") togglePause();
  if (e.code === "KeyT") document.getElementById("btnAnnounce").click();
  if (e.code === "KeyM") stopAllSounds();
  if (e.code === "Escape") {
    e.preventDefault();
    stopTimer();
  }
});

renderList();
