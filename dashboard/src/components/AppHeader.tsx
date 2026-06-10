import React from 'react';
import { Layout, Typography, Button, Space } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

export default function AppHeader() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Typography.Title level={4} style={{ margin: 0 }}>
        TradBot Admin
      </Typography.Title>
      <Space>
        <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
          Logout
        </Button>
      </Space>
    </Header>
  );
}
