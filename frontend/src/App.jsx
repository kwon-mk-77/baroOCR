import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import IntroPage from './pages/IntroPage';
import CameraPage from './pages/CameraPage';
import EditPage from './pages/EditPage';
import ListPage from './pages/ListPage';
import DetailPage from './pages/DetailPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/menu" element={<IntroPage />} />
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/edit" element={<EditPage />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
