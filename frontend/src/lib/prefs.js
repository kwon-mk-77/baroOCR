// 기기별 사용자 설정 (현재 현장, 마지막 공정, 인수자 이름 등)
const PREFIX = 'baroinsu.';

export const prefs = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch { /* 저장 불가 환경 무시 */ }
  },
};
