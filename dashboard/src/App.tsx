import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Typography } from 'antd';
import AppHeader from './components/AppHeader';
import AppSidebar from './components/AppSidebar';
import ChatWidget from './components/ChatWidget';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PositionsPage from './pages/PositionsPage';
import StrategiesPage from './pages/StrategiesPage';
import RiskPage from './pages/RiskPage';
import SignalsPage from './pages/SignalsPage';
import BacktestPage from './pages/BacktestPage';
import AuditLogsPage from './pages/AuditLogsPage';
import AiConfigPage from './pages/AiConfigPage';

const { Content } = Layout;

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppSidebar />
      <Layout>
        <AppHeader />
        <Content style={{ margin: 24 }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/positions" element={<PositionsPage />} />
            <Route path="/strategies" element={<StrategiesPage />} />
            <Route path="/risk" element={<RiskPage />} />
            <Route path="/signals" element={<SignalsPage />} />
            <Route path="/backtest" element={<BacktestPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/ai-config" element={<AiConfigPage />} />
          </Routes>
        </Content>
      </Layout>
      <ChatWidget />
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
