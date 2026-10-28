import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, MapPin, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BottomSheet } from './ui';

export default function SiteSwitcher() {
  const { sites, currentSite, setSiteId } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <button type="button" className="site-switcher" onClick={() => setOpen(true)}>
        <MapPin size={16} />
        <span>{currentSite?.name || '현장 선택'}</span>
        <ChevronDown size={16} />
      </button>

      <BottomSheet open={open} title="현장 선택" onClose={() => setOpen(false)}>
        <ul className="option-list">
          {sites.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`option ${s.id === currentSite?.id ? 'active' : ''}`}
                onClick={() => { setSiteId(s.id); setOpen(false); }}
              >
                <div>
                  <p className="option-title">{s.name}</p>
                  <p className="option-sub">{s.address || `인수증 ${s.receipt_count}건`}</p>
                </div>
                {s.id === currentSite?.id && <Check size={20} />}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-gray btn-block mt-3" onClick={() => { setOpen(false); navigate('/settings'); }}>
          <Settings size={18} /> 현장 추가 / 관리
        </button>
      </BottomSheet>
    </>
  );
}
