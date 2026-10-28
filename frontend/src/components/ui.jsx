import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, House, ClipboardList, Camera, ChartColumn, Settings, X,
  Truck, Building2, Hammer, Zap, Wrench, Package, LoaderCircle,
} from 'lucide-react';

/* ---------- 상단 헤더 ---------- */
export function PageHeader({ title, back, right }) {
  const navigate = useNavigate();
  const goBack = () => (typeof back === 'string' ? navigate(back) : navigate(-1));
  return (
    <header className="header">
      <div className="header-left">
        {back && (
          <button className="icon-btn" onClick={goBack} aria-label="뒤로가기">
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="header-title">{title}</h1>
      </div>
      <div className="header-right">{right}</div>
    </header>
  );
}

/* ---------- 하단 탭 ---------- */
const TABS = [
  { to: '/home', label: '홈', icon: House },
  { to: '/list', label: '내역', icon: ClipboardList },
  { to: '/camera', label: '촬영', icon: Camera, center: true },
  { to: '/stats', label: '통계', icon: ChartColumn },
  { to: '/settings', label: '설정', icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ to, label, icon: Icon, center }) =>
        center ? (
          <NavLink key={to} to={to} className="bottom-nav-center" aria-label="인수증 촬영">
            <span className="bottom-nav-center-btn"><Icon size={26} /></span>
          </NavLink>
        ) : (
          <NavLink key={to} to={to} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ),
      )}
    </nav>
  );
}

/* ---------- 공정 아이콘 ---------- */
const PROCESS_ICONS = {
  토공사: Truck,
  골조공사: Building2,
  '조적/미장공사': Hammer,
  '전기/설비공사': Zap,
  수장공사: Wrench,
};

export function ProcessIcon({ process, size = 40 }) {
  const Icon = PROCESS_ICONS[process?.name] || Package;
  const color = process?.color || '#4E5968';
  return (
    <span className="process-icon" style={{ width: size, height: size, color, backgroundColor: `${color}1A` }}>
      <Icon size={size * 0.5} />
    </span>
  );
}

export function ProcessBadge({ process }) {
  if (!process) return null;
  return (
    <span className="badge" style={{ color: process.color, backgroundColor: `${process.color}1A` }}>
      {process.name}
    </span>
  );
}

/* ---------- 바텀시트 ---------- */
export function BottomSheet({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기"><X size={22} /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------- 확인 다이얼로그 ---------- */
export function ConfirmDialog({ open, title, message, confirmLabel = '확인', danger, onConfirm, onCancel, busy }) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <h2>{title}</h2>
        {message && <p>{message}</p>}
        <div className="dialog-actions">
          <button className="btn btn-gray" onClick={onCancel} disabled={busy}>취소</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? <LoaderCircle size={18} className="spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 이미지 전체화면 보기 ---------- */
export function ImageViewer({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="image-viewer" onClick={onClose}>
      <button className="image-viewer-close" aria-label="닫기"><X size={28} /></button>
      <img src={src} alt="인수증 원본" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

/* ---------- 상태 표시 ---------- */
export function Spinner({ label }) {
  return (
    <div className="state-box">
      <LoaderCircle size={28} className="spin text-primary" />
      {label && <p>{label}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon = ClipboardList, title, description, action }) {
  return (
    <div className="state-box">
      <span className="state-icon"><Icon size={28} /></span>
      <p className="state-title">{title}</p>
      {description && <p className="state-desc">{description}</p>}
      {action}
    </div>
  );
}

/* ---------- 칩 그룹 ---------- */
export function ChipGroup({ options, value, onChange, scroll = true }) {
  return (
    <div className={`chips ${scroll ? 'chips-scroll' : 'chips-wrap'}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`chip ${value === o.value ? 'active' : ''}`}
          style={value === o.value && o.color ? { backgroundColor: o.color, borderColor: o.color } : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
