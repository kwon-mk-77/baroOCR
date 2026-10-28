import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, Sparkles, ChartColumn, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api';

const FEATURES = [
  { icon: Camera, title: '찍기만 하세요', desc: '인수증을 촬영하면 끝' },
  { icon: Sparkles, title: 'AI가 자동 입력', desc: '업체·품목·수량을 알아서' },
  { icon: ChartColumn, title: '현장별 집계', desc: '자재별 합계와 엑셀 내보내기' },
];

const KakaoSymbol = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 3C6.48 3 2 6.54 2 10.9c0 2.82 1.87 5.29 4.68 6.69l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.52.06 1.05.1 1.6.1 5.52 0 10-3.54 10-7.9S17.52 3 12 3z" />
  </svg>
);

/** 첫 화면 겸 로그인 화면 */
const LandingPage = () => {
  const [params] = useSearchParams();
  const loginError = params.get('login_error');

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
        {loginError && (
          <p className="landing-error"><TriangleAlert size={16} /> {loginError}</p>
        )}
        <a className="btn btn-kakao btn-block btn-lg" href={api.kakaoLoginUrl}>
          <KakaoSymbol /> 카카오로 시작하기
        </a>
        <p className="landing-note">처음 로그인하면 관리자 승인 후 사용할 수 있어요</p>
      </div>
    </div>
  );
};

export default LandingPage;
