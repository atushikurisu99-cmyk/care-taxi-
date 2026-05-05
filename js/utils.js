window.AppUtils = (() => {
  function timeToMinutes(value) {
    const parts = String(value).split(":").map(Number);
    return parts[0] * 60 + parts[1];
  }

  function formatHour(mins) {
    const h = Math.floor(mins / 60);
    return `${h}:00`;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function getUiNowMinutes() {
    return 14 * 60 + 26;
  }

  return { timeToMinutes, formatHour, clamp, easeOutCubic, getUiNowMinutes };
})();
