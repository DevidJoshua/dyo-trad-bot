import React, { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Button, Typography, message, Spin } from 'antd';
import { riskApi } from '../services/api';

export default function RiskPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await riskApi.get();
        if (res.data) form.setFieldsValue(res.data);
      } catch {
        message.error('Failed to load risk config');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [form]);

  const onFinish = async (values: any) => {
    setSaving(true);
    try {
      await riskApi.update(values);
      message.success('Risk configuration updated');
    } catch {
      message.error('Failed to update risk config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <>
      <Typography.Title level={4}>Risk Management</Typography.Title>
      <Card style={{ maxWidth: 500 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="riskPerTrade" label="Risk Per Trade (%)" rules={[{ required: true }]}>
            <InputNumber min={0.1} max={10} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxDailyLoss" label="Max Daily Loss (%)" rules={[{ required: true }]}>
            <InputNumber min={0.1} max={50} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxDrawdown" label="Max Drawdown (%)" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxOpenPositions" label="Max Open Positions" rules={[{ required: true }]}>
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>Save Configuration</Button>
        </Form>
      </Card>
    </>
  );
}
