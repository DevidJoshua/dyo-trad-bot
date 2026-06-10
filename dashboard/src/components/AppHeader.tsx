import React, { useEffect, useState } from 'react';
import { Layout, Typography, Button, Space, Switch, Tag, message } from 'antd';
import { LogoutOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const { Header } = Layout;

export default function AppHeader() {
  const navigate = useNavigate();
  const [aiPilotOn, setAiPilotOn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/admin/ai-pilot/status');
        setAiPilotOn(res.data.enabled);
      } catch {
        // not critical
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleToggle = async (checked: boolean) => {
    try {
      const res = await api.post('/admin/ai-pilot/toggle', { enabled: checked });
      setAiPilotOn(res.data.enabled);
      message[checked ? 'success' : 'warning'](`AI Pilot ${checked ? 'activated' : 'deactivated'}`);
    } catch {
      message.error('Failed to toggle AI Pilot');
    }
  };

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
      <Space size="middle">
        <Space>
          <RobotOutlined style={{ fontSize: 16, color: aiPilotOn ? '#52c41a' : '#999' }} />
          <Typography.Text strong style={{ fontSize: 13 }}>
            AI Pilot
          </Typography.Text>
          <Switch
            checked={aiPilotOn}
            onChange={handleToggle}
            loading={loading}
            checkedChildren="ON"
            unCheckedChildren="OFF"
          />
          {aiPilotOn && <Tag color="green" style={{ marginLeft: 4 }}>ACTIVE</Tag>}
        </Space>
        <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
          Logout
        </Button>
      </Space>
    </Header>
  );
}
