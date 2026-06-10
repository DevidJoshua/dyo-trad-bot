import React, { useEffect, useState } from 'react';
import { Card, Table, Switch, Modal, Form, InputNumber, Button, message, Typography } from 'antd';
import { strategyApi } from '../services/api';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [configModal, setConfigModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchStrategies = async () => {
    try {
      const res = await strategyApi.getAll();
      setStrategies(res.data);
    } catch {
      message.error('Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStrategies(); }, []);

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await strategyApi.update(id, { isActive });
      message.success(`Strategy ${isActive ? 'enabled' : 'disabled'}`);
      fetchStrategies();
    } catch {
      message.error('Failed to update strategy');
    }
  };

  const handleConfig = async (values: any) => {
    try {
      await strategyApi.update(selectedStrategy.id, { configuration: values });
      message.success('Configuration updated');
      setConfigModal(false);
      fetchStrategies();
    } catch {
      message.error('Failed to update configuration');
    }
  };

  const openConfig = (strategy: any) => {
    setSelectedStrategy(strategy);
    const config = strategy.configuration ? JSON.parse(strategy.configuration) : {};
    form.setFieldsValue(config);
    setConfigModal(true);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Description', dataIndex: 'description' },
    {
      title: 'Active', dataIndex: 'isActive',
      render: (_: boolean, record: any) => (
        <Switch checked={record.isActive} onChange={(checked) => handleToggle(record.id, checked)} />
      ),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, record: any) => (
        <Button size="small" onClick={() => openConfig(record)}>Configure</Button>
      ),
    },
  ];

  return (
    <>
      <Typography.Title level={4}>Strategy Management</Typography.Title>
      <Card>
        <Table dataSource={strategies} rowKey="id" columns={columns} loading={loading} />
      </Card>

      <Modal title={`Configure: ${selectedStrategy?.name}`} open={configModal} onCancel={() => setConfigModal(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleConfig}>
          <Form.Item name="period" label="RSI Period">
            <InputNumber min={2} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="oversoldLevel" label="Oversold Level">
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="overboughtLevel" label="Overbought Level">
            <InputNumber min={50} max={99} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="fastPeriod" label="Fast MA Period">
            <InputNumber min={2} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="slowPeriod" label="Slow MA Period">
            <InputNumber min={2} max={200} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="lookbackPeriod" label="Breakout Lookback">
            <InputNumber min={5} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit">Save</Button>
        </Form>
      </Modal>
    </>
  );
}
