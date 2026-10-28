import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Keyboard, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { periodRange, formatDateLabel } from '../lib/format';
import { BottomNav, Spinner, EmptyState } from '../components/ui';
import SiteSwitcher from '../components/SiteSwitcher';
import ReceiptRow from '../components/ReceiptRow';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentSite } = useApp();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    if (!currentSite) return;
    let cancelled = false;
    const siteId = currentSite.id;
    setRecent(null);

    Promise.all([
      api.receipts({ site_id: siteId, ...periodRange('today'), limit: 1 }),
      api.stats({ site_id: siteId, ...periodRange('month') }),
      api.receipts({ site_id: siteId, limit: 5 }),
    ])
      .then(([today, month, latest]) => {
        if (cancelled) return;
        setSummary({ today: today.total, month: month.receipt_count, vendors: month.vendor_count });
        setRecent(latest.items);
      })
      .catch(() => !cancelled && setRecent([]));

    return () => { cancelled = true; };
  }, [currentSite]);

  return (
    <div className="page with-nav">
      <header className="header">
        <div className="header-left">
          <h1 className="brand">바로인수</h1>
        </div>
        <div className="header-right"><SiteSwitcher /></div>
      </header>

      <div className="content">
        <section className="stat-grid">
          <button type="button" className="stat-tile primary" onClick={() => navigate('/list?period=today')}>
            <span className="stat-label">오늘 인수</span>
            <span className="stat-value">{summary ? summary.today : '-'}<small>건</small></span>
          </button>
          <button type="button" className="stat-tile" onClick={() => navigate('/list?period=month')}>
            <span className="stat-label">이번 달</span>
            <span className="stat-value">{summary ? summary.month : '-'}<small>건</small></span>
          </button>
        </section>

        <section className="action-card">
          <button type="button" className="action-main" onClick={() => navigate('/camera')}>
            <span className="action-icon"><Camera size={26} /></span>
            <div>
              <p className="action-title">인수증 촬영하기</p>
              <p className="action-desc">AI가 내용을 자동으로 입력해요</p>
            </div>
            <ChevronRight size={22} />
          </button>
          <button type="button" className="action-sub" onClick={() => navigate('/new')}>
            <Keyboard size={16} /> 사진 없이 직접 입력
          </button>
        </section>

        <section className="card list-card">
          <div className="section-head">
            <h3 className="section-title">최근 인수증</h3>
            <button type="button" className="link-btn" onClick={() => navigate('/list')}>
              전체보기 <ChevronRight size={16} />
            </button>
          </div>
          {recent === null ? (
            <Spinner />
          ) : recent.length === 0 ? (
            <EmptyState title="아직 등록된 인수증이 없어요" description="아래 촬영 버튼으로 첫 인수증을 등록해보세요." />
          ) : (
            recent.map((r) => (
              <ReceiptRow key={r.id} receipt={r} showDate={formatDateLabel(r.received_date)} onClick={() => navigate(`/receipts/${r.id}`)} />
            ))
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomePage;
