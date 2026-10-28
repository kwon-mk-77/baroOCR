import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Sparkles, ChartColumn } from 'lucide-react';
import { prefs } from '../lib/prefs';

const FEATURES = [
  { icon: Camera, title: '찍기만 하세요', desc: '인수증을 촬영하면 끝' },
  { icon: Sparkles, title: 'AI가 자동 입력', desc: '업체·품목·수량을 알아서' },
  { icon: ChartColumn, title: '현장별 집계', desc: '자재별 합계와 엑셀 내보내기' },
];

const LandingPage = () => {
  const navigate = useNavigate();

  const start = () => {
    prefs.set('onboarded', true);
    navigate('/home', { replace: true });
  };

  return (
    <div className="landing">
      <div className="landing-hero">
        <h1>바로인수</h1>
        <p>건설현장의 수많은 인수증<br />관리 자동화로 간편하게</p>
      </div>

      <ul className="landing-features">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <li key={title}>
            <span className="landing-feature-icon"><Icon size={22} /></span>
            <div>
              <p className="landing-feature-title">{title}</p>
              <p className="landing-feature-desc">{desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="landing-cta">
        <button className="btn btn-white btn-block btn-lg" onClick={start}>시작하기</button>
      </div>
    </div>
  );
};

export default LandingPage;
