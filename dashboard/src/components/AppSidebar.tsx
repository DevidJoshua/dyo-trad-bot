import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  FundOutlined,
  ExperimentOutlined,
  AlertOutlined,
  SignalFilled,
  BarChartOutlined,
  AuditOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/positions', icon: <FundOutlined />, label: 'Positions' },
  { key: '/strategies', icon: <ExperimentOutlined />, label: 'Strategies' },
  { key: '/risk', icon: <AlertOutlined />, label: 'Risk Management' },
  { key: '/signals', icon: <SignalFilled />, label: 'Signals' },
  { key: '/backtest', icon: <BarChartOutlined />, label: 'Backtesting' },
  { key: '/audit-logs', icon: <AuditOutlined />, label: 'Audit Logs' },
  { key: '/ai-config', icon: <RobotOutlined />, label: 'Integrations' },
];

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sider width={220} theme="dark">
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 18,
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        TradBot
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
}
