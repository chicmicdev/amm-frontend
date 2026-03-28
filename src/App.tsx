import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import SwapPage from './pages/SwapPage';
import PoolPage from './pages/PoolPage';
import PositionsPage from './pages/PositionsPage';
import StakingPage from './pages/StakingPage';
import DashboardPage from './pages/DashboardPage';
import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/stake" replace />} />
            <Route path="/stake" element={<StakingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/pool" element={<PoolPage />} />
            <Route path="/positions" element={<PositionsPage />} />
            <Route path="*" element={<Navigate to="/stake" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
