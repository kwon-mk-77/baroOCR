import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import IntroPage from './pages/IntroPage';
import CameraPage from './pages/CameraPage';
import EditPage from './pages/EditPage';
import ListPage from './pages/ListPage';
import DetailPage from './pages/DetailPage';

// 로그인 여부를 판단하여 접근을 제한하는 Auth Guard
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 초기 세션 획득
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 인증 상태 변화 리스너 등록
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.text}>로그인 확인 중...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          {/* 퍼블릭 랜딩 페이지 */}
          <Route path="/" element={<LandingPage />} />
          
          {/* 로그인 화면 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 인증이 필요한 비공개 서비스 라우트들 */}
          <Route path="/menu" element={
            <ProtectedRoute>
              <IntroPage />
            </ProtectedRoute>
          } />
          <Route path="/camera" element={
            <ProtectedRoute>
              <CameraPage />
            </ProtectedRoute>
          } />
          <Route path="/edit" element={
            <ProtectedRoute>
              <EditPage />
            </ProtectedRoute>
          } />
          <Route path="/list" element={
            <ProtectedRoute>
              <ListPage />
            </ProtectedRoute>
          } />
          <Route path="/detail/:id" element={
            <ProtectedRoute>
              <DetailPage />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

const loadingStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100%',
    backgroundColor: '#F3F4F6',
  },
  text: {
    fontSize: '16px',
    color: '#4B5563',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  }
};

export default App;
