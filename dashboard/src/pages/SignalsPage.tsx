import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography } from 'antd';
import { signalApi } from '../services/api';

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await signalApi.getAll();
        setSignals(res.data);
      } catch {
        console.error('Failed to load signals');
      } finally {
        setLoading(false);
      }
    };
    fetchSignals();
  }, []);

  const columns = [
    { title: 'Symbol', dataIndex: 'symbol' },
    {
      title: 'Signal', dataIndex: 'signal',
      render: (v: string) => (
        <Tag color={v === 'BUY' ? 'green' : 'red'}>{v}</Tag>
      ),
    },
    { title: 'Confidence', dataIndex: 'confidence', render: (v: number) => v ? `${v}%` : '-' },
    { title: 'Strategy', dataIndex: ['strategy', 'name'] },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <>
      <Typography.Title level={4}>Trade Signals</Typography.Title>
      <Card>
        <Table dataSource={signals} rowKey="id" columns={columns} loading={loading} />
      </Card>
    </>
  );
}
