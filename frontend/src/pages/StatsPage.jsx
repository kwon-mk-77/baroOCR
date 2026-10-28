import React, { useEffect, useState } from 'react';
import { ChartColumn } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { periodRange, formatQty, formatShortDate } from '../lib/format';
import { BottomNav, ChipGroup, Spinner, EmptyState } from '../components/ui';
import SiteSwitcher from '../components/SiteSwitcher';

const STAT_PERIODS = [
  { value: 'month', label: '이번 달' },
  { value: 'lastMonth', label: '지난 달' },
  { value: 'year', label: '올해' },
  { value: 'all', label: '전체' },
];

function BarList({ rows, max, colorOf }) {
  return (
    <ul className="bar-list">
      {rows.map((r) => (
        <li key={r.name}>
          <div className="bar-list-label">
            <span>{r.name}</span>
            <b>{r.count}건</b>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(4, (r.count / max) * 100)}%`, backgroundColor: colorOf?.(r) }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DailyChart({ daily }) {
  if (daily.length < 2) return null;
  const max = Math.max(...daily.map((d) => d.count));
  const recent = daily.slice(-31);
  return (
    <section className="card">
      <h3 className="section-title">일별 인수 건수</h3>
      <div className="daily-chart" role="img" aria-label="일별 인수 건수 막대그래프">
        {recent.map((d) => (
          <div key={d.date} className="daily-col" title={`${d.date}: ${d.count}건`}>
            <div className="daily-bar" style={{ height: `${(d.count / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="daily-axis">
        <span>{formatShortDate(recent[0].date)}</span>
        <span>{formatShortDate(recent[recent.length - 1].date)}</span>
      </div>
    </section>
  );
}

const StatsPage = () => {
  const { currentSite } = useApp();
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!currentSite) return undefined;
    let cancelled = false;
    setStats(null);
    api.stats({ site_id: currentSite.id, ...periodRange(period) })
      .then((s) => !cancelled && setStats(s))
      .catch(() => !cancelled && setStats({ receipt_count: 0 }));
    return () => { cancelled = true; };
  }, [currentSite, period]);

  return (
    <div className="page with-nav">
      <header className="header">
        <div className="header-left"><h1 className="header-title">통계</h1></div>
        <div className="header-right"><SiteSwitcher /></div>
      </header>

      <div className="filters">
        <ChipGroup value={period} onChange={setPeriod} options={STAT_PERIODS} />
      </div>

      <div className="content">
        {!stats ? (
          <Spinner />
        ) : stats.receipt_count === 0 ? (
          <EmptyState icon={ChartColumn} title="이 기간에는 인수 내역이 없어요" />
        ) : (
          <>
            <section className="stat-grid three">
              <div className="stat-tile"><span className="stat-label">인수증</span><span className="stat-value">{stats.receipt_count}<small>건</small></span></div>
              <div className="stat-tile"><span className="stat-label">자재 종류</span><span className="stat-value">{stats.material_count}<small>종</small></span></div>
              <div className="stat-tile"><span className="stat-label">거래 업체</span><span className="stat-value">{stats.vendor_count}<small>곳</small></span></div>
            </section>

            <DailyChart daily={stats.daily} />

            <section className="card">
              <h3 className="section-title">자재별 입고량</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr><th>자재</th><th className="num">수량</th><th className="num">중량</th><th className="num">건수</th></tr>
                  </thead>
                  <tbody>
                    {stats.by_material.map((m) => (
                      <tr key={`${m.name}|${m.unit}|${m.weight_unit}`}>
                        <td>{m.name}</td>
                        <td className="num">{formatQty(m.quantity, m.unit) || '-'}</td>
                        <td className="num">{formatQty(m.weight, m.weight_unit) || '-'}</td>
                        <td className="num">{m.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h3 className="section-title">공정별</h3>
              <BarList rows={stats.by_process} max={stats.by_process[0]?.count || 1} colorOf={(r) => r.color} />
            </section>

            <section className="card">
              <h3 className="section-title">업체별 (상위 20)</h3>
              <BarList rows={stats.by_vendor} max={stats.by_vendor[0]?.count || 1} />
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default StatsPage;
