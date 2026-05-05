window.AppUtils = (() => {
  function timeToMinutes(value) {
    if (typeof value === "number") return value;
    const parts = String(value).split(":").map(Number);
    return parts[0] * 60 + parts[1];
  }
  function formatHour(mins) { return `${Math.floor(mins / 60)}:00`; }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function getUiNowMinutes() {
    // PDFトレース確認用。実運用時は現在時刻へ差し替え可。
    return 14 * 60 + 26;
  }
  return { timeToMinutes, formatHour, clamp, easeOutCubic, getUiNowMinutes };
})();
