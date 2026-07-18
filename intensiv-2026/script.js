// Скачивание календаря напрямую из calendar.ics
document.getElementById('download-ics').addEventListener('click', async function () {
  try {
    const res = await fetch('calendar.ics');
    if (!res.ok) throw new Error('network');
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intensiv-2026.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    // если fetch не сработал (например, открыли файл локально без сервера) — просто переходим по прямой ссылке
    window.location.href = 'calendar.ics';
  }
});
