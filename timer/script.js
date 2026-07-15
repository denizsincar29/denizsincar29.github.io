"use strict";

/* ---------- библиотека встроенных звуков (id — для данных, label — только для UI) ---------- */

const ALARM_SOUNDS = Array.from({ length: 17 }, (_, i) => ({
  type: "builtin",
  id: `alarm${i + 1}`,
  src: `sounds/alarm${i + 1}.ogg`,
  label: `Сигнал ${i + 1}`,
}));

const CLOCK_SOUNDS = Array.from({ length: 7 }, (_, i) => ({
  type: "builtin",
  id: `clock${i + 1}`,
  src: `sounds/clock${i + 1}.ogg`,
  label: `Тиканье ${i + 1}`,
}));

const BUILTIN_BY_ID = new Map(
  [...ALARM_SOUNDS, ...CLOCK_SOUNDS].map((s) => [s.id, s])
);

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
const brailleStatus = document.getElementById("brailleStatus");
const btnSaveActive = document.getElementById("btnSaveActive");
const btnUrlStart = document.getElementById("btnUrlStart");

const stopDialog = document.getElementById("stopDialog");

const importDialog = document.getElementById("importDialog");
const importText = document.getElementById("importText");

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

function updateBraille() {
  if (brailleStatus) {
    brailleStatus.textContent = `${queueStatus.textContent} ${clockDisplay.textContent}`.trim();
  }
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

/* ---------- base64 (url-safe) для ?json= ---------- */

function b64encode(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64decode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return JSON.parse(decodeURIComponent(escape(atob(str))));
}

/* ---------- компактный ?name=&q1time=... (только встроенные звуки) ---------- */

function pad(n) { return String(n).padStart(2, "0"); }
function timeStr(q) { return `${pad(q.h)}:${pad(q.m)}:${pad(q.s)}`; }
function idsStr(list) { return (list || []).map((s) => s.id).join(","); }

function hasCustomSound(t) {
  return t.queues.some((q) =>
    [q.endSound, q.tickSound, q.warnSound].some((list) =>
      (list || []).some((s) => s.type === "custom")
    )
  );
}

function buildCompactParams(t) {
  const p = new URLSearchParams();
  p.set("name", t.name);
  t.queues.forEach((q, i) => {
    const n = i + 1;
    p.set(`q${n}time`, timeStr(q));
    if (q.endSound && q.endSound.length) p.set(`q${n}end`, idsStr(q.endSound));
    if (q.tickSound && q.tickSound.length) p.set(`q${n}tick`, idsStr(q.tickSound));
    if (q.warnSound && q.warnSound.length) p.set(`q${n}warn`, idsStr(q.warnSound));
    if (q.warnSeconds) p.set(`q${n}warnsec`, q.warnSeconds);
    if (q.warnLoop) p.set(`q${n}warnloop`, "1");
    if (q.announceEvery) p.set(`q${n}announce`, q.announceEvery);
    if (q.countdownSeconds) p.set(`q${n}countdown`, q.countdownSeconds);
    if (q.startDelay) p.set(`q${n}delay`, q.startDelay);
  });
  return p;
}

function parseCompactParams(params) {
  const name = params.get("name");
  if (!name) return null;
  const idsToEntries = (str) =>
    str
      ? str.split(",").filter(Boolean).map((id) => {
          const b = BUILTIN_BY_ID.get(id);
          return b ? { type: "builtin", id, src: b.src } : null;
        }).filter(Boolean)
      : [];
  const queues = [];
  for (let n = 1; ; n++) {
    const t = params.get(`q${n}time`);
    if (!t) break;
    const [h, m, s] = t.split(":").map(Number);
    queues.push({
      h: h || 0, m: m || 0, s: s || 0,
      endSound: idsToEntries(params.get(`q${n}end`)),
      tickSound: idsToEntries(params.get(`q${n}tick`)),
      warnSound: idsToEntries(params.get(`q${n}warn`)),
      warnSeconds: Number(params.get(`q${n}warnsec`)) || 0,
      warnLoop: params.get(`q${n}warnloop`) === "1",
      announceEvery: Number(params.get(`q${n}announce`)) || 0,
      countdownSeconds: Number(params.get(`q${n}countdown`)) || 0,
      startDelay: Number(params.get(`q${n}delay`)) || 0,
    });
  }
  if (queues.length === 0) return null;
  return { name, queues };
}

function buildShareUrl(t, { state = null, autostart = false, forceJson = false } = {}) {
  const base = location.origin + location.pathname;
  let url;
  if (forceJson || state || hasCustomSound(t)) {
    const payload = state ? { ...t, state } : t;
    url = `${base}?json=${b64encode(payload)}`;
  } else {
    url = `${base}?${buildCompactParams(t).toString()}`;
  }
  if (autostart) url += "&autostart=true";
  return url;
}

/* ---------- копирование в буфер с запасным вариантом ---------- */

async function copyText(text, dialogTitle) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    openManualCopyDialog(text, dialogTitle);
    return false;
  }
}

function openManualCopyDialog(text, title) {
  importText.value = text;
  document.getElementById("importTitle").textContent = title || "Скопируйте вручную (Ctrl+C)";
  document.getElementById("btnDoImport").hidden = true;
  importDialog.showModal();
  importText.focus();
  importText.select();
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
    opt.dataset.id = entry.id;
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
        const opt = makeOption({ type: "custom", id: file.name, src: reader.result, label: file.name }, true);
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
        .map((o) => ({ type: o.dataset.type, id: o.dataset.id, src: o.dataset.src }));
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
    const resumeTag = t.savedState ? " — есть сохранённое состояние" : "";
    startBtn.textContent = `${t.name} (${t.queues.length} ${pluralQueue(t.queues.length)})${resumeTag}`;
    startBtn.addEventListener("click", () => startTimer(idx));

    const copyUrlBtn = document.createElement("button");
    copyUrlBtn.type = "button";
    copyUrlBtn.textContent = "Копировать ссылку";
    copyUrlBtn.setAttribute("aria-label", `Копировать ссылку на таймер ${t.name}`);
    copyUrlBtn.addEventListener("click", () => copyTimerUrl(t));

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
    li.appendChild(copyUrlBtn);
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

/* ---------- экспорт / импорт ---------- */

async function copyTimerJson(t) {
  const json = JSON.stringify(t, null, 2);
  const ok = await copyText(json, `JSON таймера «${t.name}» — скопируйте вручную (Ctrl+C)`);
  if (ok) announce(`JSON таймера ${t.name} скопирован в буфер обмена`);
}

async function copyTimerUrl(t) {
  const url = buildShareUrl(t);
  const ok = await copyText(url, `Ссылка на таймер «${t.name}» — скопируйте вручную (Ctrl+C)`);
  if (ok) announce(`Ссылка на таймер ${t.name} скопирована`);
}

document.getElementById("btnImportTimer").addEventListener("click", async () => {
  document.getElementById("importTitle").textContent = "Вставить JSON таймера";
  document.getElementById("btnDoImport").hidden = false;
  importText.value = "";
  try {
    const clip = await navigator.clipboard.readText();
    if (clip && clip.trim().startsWith("{")) importText.value = clip;
  } catch {
    /* буфер недоступен — вставит вручную Ctrl+V */
  }
  importDialog.showModal();
  importText.focus();
});

document.getElementById("btnCancelImport").addEventListener("click", () => importDialog.close());

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
  addTimerDedupName(data);
  importDialog.close();
});

function addTimerDedupName(data) {
  let name = data.name;
  const names = new Set(timers.map((t) => t.name));
  let suffix = 2;
  while (names.has(name)) { name = `${data.name} (${suffix})`; suffix++; }
  data.name = name;
  timers.push(data);
  saveTimers();
  renderList();
  announce(`Таймер ${name} импортирован`);
}

/* ---------- создание таймера ---------- */

let queueCount = 0;
const queuePickers = new Map();

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

document.getElementById("btnCancelCreate").addEventListener("click", () => createDialog.close());

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
    queues.push({
      h, m, s,
      endSound: pickers.end.getValue(),
      tickSound: pickers.tick.getValue(),
      warnSound: pickers.warn.getValue(),
      warnSeconds: Number(document.getElementById(`warnsec_${n}`).value) || 0,
      warnLoop: document.getElementById(`warnloop_${n}`).checked,
      announceEvery: Number(document.getElementById(`announce_${n}`).value) || 0,
      countdownSeconds: Number(document.getElementById(`countdown_${n}`).value) || 0,
      startDelay: Number(document.getElementById(`startdelay_${n}`).value) || 0,
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
let activeTimerSaved = true;
let queueIdx = 0;
let remaining = { h: 0, m: 0, s: 0 };
let paused = false;
let warnTriggered = false;
let elapsedSinceQueueStart = 0;
let phase = "idle"; // idle | precountdown | running | finished

function fmt(n) { return String(n).padStart(2, "0"); }
function totalSeconds(t) { return t.h * 3600 + t.m * 60 + t.s; }

function updateClock() {
  clockDisplay.textContent = `${fmt(remaining.h)}:${fmt(remaining.m)}:${fmt(remaining.s)}`;
  updateBraille();
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
  activeTimerSaved = true;
  btnSaveActive.hidden = true;
  btnUrlStart.hidden = true;
  runTitle.textContent = activeTimer.name;
  queueStatus.textContent = "";
  runDialog.showModal();

  if (activeTimer.savedState) {
    queueIdx = activeTimer.savedState.queueIdx;
    const overrideRemaining = activeTimer.savedState.remaining;
    delete activeTimer.savedState;
    saveTimers();
    renderList();
    beginQueueRun(activeTimer.queues[queueIdx], overrideRemaining);
    runAnnounce(`Продолжаем с сохранённого состояния: очередь ${queueIdx + 1}`);
  } else {
    queueIdx = 0;
    startQueue();
  }
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
  let preRemaining = seconds;
  paused = false;
  queueStatus.textContent = `Пауза перед очередью ${queueIdx + 1} из ${activeTimer.queues.length}`;
  clockDisplay.textContent = String(preRemaining);
  updateBraille();
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
    updateBraille();
    runAnnounce(String(preRemaining));
  }, 1000);
}

function beginQueueRun(q, overrideRemaining) {
  phase = "running";
  remaining = overrideRemaining || { h: q.h, m: q.m, s: q.s };
  paused = false;
  warnTriggered = false;
  elapsedSinceQueueStart = 0;
  updateClock();
  queueStatus.textContent = `Очередь ${queueIdx + 1} из ${activeTimer.queues.length}`;
  updateBraille();
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
    updateBraille();
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
  runAnnounce(`${remaining.h} часов, ${remaining.m} минут, ${remaining.s} секунд`);
});

document.getElementById("btnMute").addEventListener("click", stopAllSounds);

/* ---------- диалог остановки: обычный стоп / сохранить состояние / скопировать состояние ---------- */

document.getElementById("btnStop").addEventListener("click", stopTimer);
function stopTimer() {
  if (phase === "finished" || phase === "idle") {
    closeRunDialog();
    return;
  }
  stopDialog.showModal();
}

function currentStateSnapshot() {
  return { queueIdx, remaining: { ...remaining } };
}

document.getElementById("btnStopOnly").addEventListener("click", () => {
  stopDialog.close();
  closeRunDialog();
});

document.getElementById("btnStopCancel").addEventListener("click", () => stopDialog.close());

document.getElementById("btnStopSaveState").addEventListener("click", () => {
  const snap = currentStateSnapshot();
  const idx = timers.indexOf(activeTimer);
  const entry = { name: activeTimer.name, queues: activeTimer.queues, savedState: snap };
  if (idx !== -1) timers[idx] = entry;
  else timers.push(entry);
  saveTimers();
  renderList();
  announce(`Состояние таймера ${activeTimer.name} сохранено`);
  stopDialog.close();
  closeRunDialog();
});

document.getElementById("btnStopCopyState").addEventListener("click", async () => {
  const url = buildShareUrl(activeTimer, { state: currentStateSnapshot(), forceJson: true });
  const ok = await copyText(url, "Ссылка с состоянием — скопируйте вручную (Ctrl+C)");
  stopDialog.close();
  closeRunDialog();
  if (ok) announce("Ссылка с состоянием скопирована");
});

function closeRunDialog() {
  clearInterval(activeInterval);
  beepTick.pause();
  beepEnd.pause();
  beepWarn.pause();
  phase = "idle";
  runDialog.close();
}

btnSaveActive.addEventListener("click", () => {
  if (!activeTimer) return;
  timers.push(activeTimer);
  saveTimers();
  renderList();
  activeTimerSaved = true;
  btnSaveActive.hidden = true;
  announce(`Таймер ${activeTimer.name} сохранён локально`);
});

runDialog.addEventListener("keydown", (e) => {
  if (e.code === "KeyP") togglePause();
  if (e.code === "KeyT") document.getElementById("btnAnnounce").click();
  if (e.code === "KeyM") stopAllSounds();
  if (e.code === "KeyB") {
    e.preventDefault();
    brailleStatus.focus();
  }
  if (e.code === "Escape") {
    e.preventDefault();
    stopTimer();
  }
});

/* ---------- загрузка из URL: ?json=... или ?name=&q1time=... , &autostart=true ---------- */

function canAutoplayAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const state = ctx.state;
    ctx.close();
    return state === "running";
  } catch {
    return false;
  }
}

function initFromUrl() {
  const params = new URLSearchParams(location.search);
  let incoming = null;
  if (params.has("json")) {
    try { incoming = b64decode(params.get("json")); } catch { announce("Не удалось прочитать таймер из ссылки"); }
  } else if (params.has("name") && params.has("q1time")) {
    incoming = parseCompactParams(params);
  }
  if (!incoming) return;

  const state = incoming.state || null;
  activeTimer = { name: incoming.name, queues: incoming.queues };
  activeTimerSaved = false;
  queueIdx = state ? state.queueIdx : 0;

  runTitle.textContent = activeTimer.name;
  queueStatus.textContent = "";
  btnSaveActive.hidden = false;
  runDialog.showModal();

  const autostart = params.get("autostart") === "true";
  const begin = () => {
    if (state) {
      beginQueueRun(activeTimer.queues[queueIdx], state.remaining);
      runAnnounce(`Восстановлено состояние: очередь ${queueIdx + 1}, осталось ${state.remaining.h} ч ${state.remaining.m} мин ${state.remaining.s} сек`);
    } else {
      startQueue();
    }
  };

  if (autostart && canAutoplayAudio()) {
    begin();
  } else {
    btnUrlStart.hidden = false;
    btnUrlStart.focus();
    btnUrlStart.onclick = () => {
      btnUrlStart.hidden = true;
      begin();
    };
    if (!autostart) {
      runAnnounce("Таймер загружен из ссылки. Нажмите «Начать».");
    } else {
      runAnnounce("Звук может быть заблокирован браузером. Нажмите «Начать», чтобы запустить таймер.");
    }
  }
}

renderList();
initFromUrl();
