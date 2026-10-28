import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Download, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { PERIODS, periodRange, formatDateLabel } from '../lib/format';
import { BottomNav, ChipGroup, Spinner, EmptyState } from '../components/ui';
import SiteSwitcher from '../components/SiteSwitcher';
import ReceiptRow from '../components/ReceiptRow';

const PAGE_SIZE = 30;

const ListPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentSite, processes } = useApp();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [period, setPeriod] = useState(searchParams.get('period') || 'all');
  const [customRange, setCustomRange] = useState({ date_from: '', date_to: '' });
  const [processId, setProcessId] = useState(null);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const filters = useMemo(() => ({
    site_id: currentSite?.id,
    process_id: processId,
    q: debouncedQuery,
    ...(period === 'custom' ? customRange : periodRange(period)),
  }), [currentSite, processId, debouncedQuery, period, customRange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.receipts({ ...filters, limit: PAGE_SIZE, offset: 0 })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [filters]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await api.receipts({ ...filters, limit: PAGE_SIZE, offset: items.length });
      setItems((prev) => [...prev, ...res.items]);
      setTotal(res.total);
    } finally {
      setLoadingMore(false);
    }
  };

  // 인수일 기준으로 묶어서 표시
  const groups = useMemo(() => {
    const map = new Map();
    items.forEach((r) => {
      if (!map.has(r.received_date)) map.set(r.received_date, []);
      map.get(r.received_date).push(r);
    });
    return [...map.entries()];
  }, [items]);

  const hasFilter = Boolean(debouncedQuery || processId || period !== 'all');

  return (
    <div className="page with-nav">
      <header className="header">
        <div className="header-left"><h1 className="header-title">인수 내역</h1></div>
        <div className="header-right">
          <SiteSwitcher />
        </div>
      </header>

      <div className="filters">
        <div className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="자재, 업체, 규격, 차량번호 검색"
            enterKeyHint="search"
          />
          {query && <button className="icon-btn small" onClick={() => setQuery('')} aria-label="검색어 지우기"><X size={16} /></button>}
        </div>

        <ChipGroup value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.key, label: p.label }))} />

        {period === 'custom' && (
          <div className="date-range">
            <input type="date" className="input" value={customRange.date_from}
              onChange={(e) => setCustomRange((r) => ({ ...r, date_from: e.target.value }))} />
            <span>~</span>
            <input type="date" className="input" value={customRange.date_to}
              onChange={(e) => setCustomRange((r) => ({ ...r, date_to: e.target.value }))} />
          </div>
        )}

        <ChipGroup
          value={processId}
          onChange={setProcessId}
          options={[{ value: null, label: '모든 공정' }, ...processes.map((p) => ({ value: p.id, label: p.name, color: p.color }))]}
        />
      </div>

      <div className="content">
        <div className="list-summary">
          <span>총 <b>{total}</b>건</span>
          {total > 0 && (
            <a className="link-btn" href={api.exportUrl(filters)} download>
              <Download size={16} /> 엑셀(CSV) 받기
            </a>
          )}
        </div>

        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState
            title={hasFilter ? '조건에 맞는 인수증이 없어요' : '아직 등록된 인수증이 없어요'}
            description={hasFilter ? '검색어나 필터를 바꿔보세요.' : '촬영 버튼을 눌러 첫 인수증을 등록해보세요.'}
          />
        ) : (
          <>
            {groups.map(([date, rows]) => (
              <section key={date} className="date-group">
                <h4 className="date-group-title">
                  {formatDateLabel(date)} <span>{rows.length}건</span>
                </h4>
                <div className="card list-card">
                  {rows.map((r) => (
                    <ReceiptRow key={r.id} receipt={r} onClick={() => navigate(`/receipts/${r.id}`)} />
                  ))}
                </div>
              </section>
            ))}
            {items.length < total && (
              <button className="btn btn-gray btn-block" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? '불러오는 중...' : `더 보기 (${total - items.length}건 남음)`}
              </button>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ListPage;
