import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Bell, ListTodo, FileText, ChevronRight } from 'lucide-react';

const IntroPage = () => {
  const navigate = useNavigate();
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    const fetchTodayReceipts = async () => {
      try {
        const url = `/api/receipts`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          
          // Filter for today's receipts
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const count = data.filter(r => {
            if (!r.createdAt) return false;
            const itemDate = new Date(r.createdAt);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === today.getTime();
          }).length;
          
          setTodayCount(count);
        }
      } catch (error) {
        console.error("Failed to fetch receipts:", error);
      }
    };
    fetchTodayReceipts();
  }, []);

  return (
    <div className="page" style={{ padding: 0 }}>
      {/* Toss Header */}
      <div className="header">
        <h1 className="text-2xl font-bold">바로인수</h1>
        <div className="flex gap-4">
          <Bell className="header-icon" size={24} />
        </div>
      </div>

      <div className="card-container mt-2">
        {/* Main Status Card */}
        <div className="card" onClick={() => navigate('/list')} style={{ cursor: 'pointer' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">오늘 처리한 인수증</h2>
            <ChevronRight className="text-secondary" size={20} />
          </div>
          
          <div className="flex items-center gap-4">
            <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#E8F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText color="var(--primary-color)" size={24} />
            </div>
            <div>
              <p className="text-secondary" style={{ fontSize: '0.9rem' }}>총 누적 건수</p>
              <p className="font-bold text-2xl">{todayCount}<span style={{ fontSize: '1rem', fontWeight: 500 }}>건</span></p>
            </div>
          </div>
        </div>

        {/* Sub Card */}
        <div className="card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ListTodo color="var(--text-primary)" size={20} />
              </div>
              <div>
                <p className="font-semibold">이달의 납품 현황 보기</p>
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>자재별 통계 요약</p>
              </div>
            </div>
            <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => navigate('/list')}>
              보기
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Toss Style Large Bottom Button) */}
      <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 440, zIndex: 50 }}>
        <button 
          className="btn btn-primary btn-block" 
          onClick={() => navigate('/camera')}
          style={{ padding: '18px', borderRadius: '16px', fontSize: '1.1rem', boxShadow: '0 8px 24px rgba(49, 130, 246, 0.3)' }}
        >
          <Camera size={24} style={{ marginRight: 8 }} />
          새 인수증 촬영하기
        </button>
      </div>
    </div>
  );
};

export default IntroPage;
