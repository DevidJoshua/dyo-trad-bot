import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Spin } from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { accountApi, orderApi } from '../services/api';

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, ordRes] = await Promise.all([
          accountApi.getAll(),
          orderApi.getOpen(),
        ]);
        setAccounts(accRes.data);
        setOpenOrders(ordRes.data);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const totalProfit = openOrders.reduce((s: number, o: any) => s + (o.profit || 0), 0);
  const totalEquity = accounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);

  return (
    <>
      <Typography.Title level={4}>Dashboard</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Equity" value={totalEquity} prefix={<DollarOutlined />} precision={2} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Open Positions" value={openOrders.length} prefix={<SwapOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Unrealized PnL"
              value={totalProfit}
              precision={2}
              prefix={totalProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
              valueStyle={{ color: totalProfit >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Active Accounts" value={accounts.length} />
          </Card>
        </Col>
      </Row>

      <Card title="Open Positions" style={{ marginBottom: 24 }}>
        <Table
          dataSource={openOrders}
          rowKey="id"
          size="small"
          columns={[
            { title: 'Symbol', dataIndex: 'symbol', key: 'symbol' },
            { title: 'Action', dataIndex: 'action', key: 'action' },
            { title: 'Lot', dataIndex: 'lot', key: 'lot' },
            { title: 'Entry', dataIndex: 'entryPrice', key: 'entryPrice' },
            { title: 'SL', dataIndex: 'stopLoss', key: 'stopLoss' },
            { title: 'TP', dataIndex: 'takeProfit', key: 'takeProfit' },
            {
              title: 'Profit',
              dataIndex: 'profit',
              key: 'profit',
              render: (v: number) => (
                <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>
                  {v?.toFixed(2) || '0.00'}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
