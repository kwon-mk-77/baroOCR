const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n) => String(n).padStart(2, '0');

/** Date -> 'YYYY-MM-DD' (로컬 시간 기준) */
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISODate(new Date());

export const parseISODate = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** 목록 그룹 헤더용: 오늘 / 어제 / 10월 27일 (월) */
export const formatDateLabel = (iso) => {
  if (!iso) return '';
  if (iso === todayISO()) return '오늘';
  if (iso === toISODate(addDays(new Date(), -1))) return '어제';
  const d = parseISODate(iso);
  const prefix = d.getFullYear() !== new Date().getFullYear() ? `${d.getFullYear()}년 ` : '';
  return `${prefix}${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
};

export const formatDateFull = (iso) => {
  if (!iso) return '';
  const d = parseISODate(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
};

export const formatShortDate = (iso) => {
  if (!iso) return '';
  const d = parseISODate(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};

export const formatNumber = (n) =>
  n === null || n === undefined || n === '' ? '' : Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 3 });

export const formatQty = (n, unit) => {
  const num = formatNumber(n);
  return num ? `${num}${unit ? ` ${unit}` : ''}` : '';
};

export const itemAmount = (it) =>
  [formatQty(it.quantity, it.unit), formatQty(it.weight, it.weight_unit)].filter(Boolean).join(' · ');

export const receiptTitle = (r) => {
  if (!r.items?.length) return '(품목 없음)';
  const first = r.items[0].material_name;
  return r.items.length > 1 ? `${first} 외 ${r.items.length - 1}건` : first;
};

/** 문자열 입력값 -> 숫자 또는 null ('1,500' -> 1500) */
export const toNumberOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/,/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export const PERIODS = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'lastMonth', label: '지난 달' },
  { key: 'custom', label: '기간 선택' },
];

/** 기간 키 -> { date_from, date_to } */
export const periodRange = (key) => {
  const now = new Date();
  switch (key) {
    case 'today':
      return { date_from: todayISO(), date_to: todayISO() };
    case 'week': {
      const day = now.getDay() || 7; // 월요일 시작
      return { date_from: toISODate(addDays(now, 1 - day)), date_to: todayISO() };
    }
    case 'month':
      return { date_from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), date_to: todayISO() };
    case 'lastMonth':
      return {
        date_from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        date_to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case 'year':
      return { date_from: toISODate(new Date(now.getFullYear(), 0, 1)), date_to: todayISO() };
    default:
      return { date_from: '', date_to: '' };
  }
};
