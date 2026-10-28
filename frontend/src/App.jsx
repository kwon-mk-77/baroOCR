import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Spinner, EmptyState } from './components/ui';
import { prefs } from './lib/prefs';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import CameraPage from './pages/CameraPage';
import NewReceiptPage from './pages/NewReceiptPage';
import ListPage from './pages/ListPage';
import DetailPage from './pages/DetailPage';
import EditReceiptPage from './pages/EditReceiptPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';

// 예전 주소(/detail/:id) 호환
const LegacyDetailRedirect = () => <Navigate to={`/receipts/${useParams().id}`} replace />;

function AppRoutes() {
  const { ready, loadError, reload } = useApp();

  if (!ready) return <Spinner label="불러오는 중..." />;
  if (loadError) {
    return (
      <EmptyState
        title="서버에 연결할 수 없습니다"
        description={loadError}
        action={<button className="btn btn-primary mt-3" onClick={reload}>다시 시도</button>}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={prefs.get('onboarded') ? <Navigate to="/home" replace /> : <LandingPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/camera" element={<CameraPage />} />
      <Route path="/new" element={<NewReceiptPage />} />
      <Route path="/list" element={<ListPage />} />
      <Route path="/receipts/:id" element={<DetailPage />} />
      <Route path="/receipts/:id/edit" element={<EditReceiptPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/menu" element={<Navigate to="/home" replace />} />
      <Route path="/detail/:id" element={<LegacyDetailRedirect />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="app-container">
          <AppRoutes />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
