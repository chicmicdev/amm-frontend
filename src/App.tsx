import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import SwapPage from './pages/SwapPage';
import PoolPage from './pages/PoolPage';
import PositionsPage from './pages/PositionsPage';
import StakingPage from './pages/StakingPage';
import LandingPage from './pages/LandingPage';
import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Standalone landing page — no Layout/Header */}
          <Route path="/" element={<LandingPage />} />

          {/* App routes — use shared Layout with Header */}
          <Route element={<Layout />}>
            <Route path="/stake" element={<StakingPage />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/pool" element={<PoolPage />} />
            <Route path="/positions" element={<PositionsPage />} />
          </Route>

          {/* Wildcard → landing page (no Layout/Header) */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
