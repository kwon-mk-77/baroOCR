import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="page" style={{ padding: 0, height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#3182F6', color: '#fff' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '24px', letterSpacing: '-1px' }}>바로인수</h1>
        <p style={{ fontSize: '1.3rem', lineHeight: '1.5', opacity: 0.95, fontWeight: 500 }}>
          건설현장의 수많은 인수증<br/>
          관리 자동화로 간편하게
        </p>
      </div>
      
      <div style={{ padding: '20px 20px 40px 20px' }}>
        <button 
          className="btn"
          onClick={() => navigate('/menu')}
          style={{ width: '100%', padding: '18px', borderRadius: '16px', fontSize: '1.2rem', fontWeight: 700, backgroundColor: '#fff', color: '#3182F6', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
        >
          시작하기
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
