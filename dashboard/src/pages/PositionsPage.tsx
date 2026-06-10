import React, { useEffect, useState } from 'react';
import { Card, Table, Tabs, Button, Modal, Form, InputNumber, message, Space, Typography } from 'antd';
import { orderApi } from '../services/api';

export default function PositionsPage() {
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modifyModal, setModifyModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      const [openRes, histRes] = await Promise.all([
        orderApi.getOpen(),
        orderApi.getHistory(),
      ]);
      setOpenOrders(openRes.data);
      setHistory(histRes.data);
    } catch {
      message.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleClose = async (id: number) => {
    try {
      await orderApi.close(id);
      message.success('Order closed');
      fetchData();
    } catch {
      message.error('Failed to close order');
    }
  };

  const handleModify = async (values: any) => {
    try {
      await orderApi.modify(selectedOrder.id, values);
      message.success('Order modified');
      setModifyModal(false);
      fetchData();
    } catch {
      message.error('Failed to modify order');
    }
  };

  const openColumns = [
    { title: 'Symbol', dataIndex: 'symbol' },
    { title: 'Action', dataIndex: 'action' },
    { title: 'Lot', dataIndex: 'lot' },
    { title: 'Entry', dataIndex: 'entryPrice', render: (v: number) => v?.toFixed(5) },
    { title: 'SL', dataIndex: 'stopLoss', render: (v: number) => v?.toFixed(5) || '-' },
    { title: 'TP', dataIndex: 'takeProfit', render: (v: number) => v?.toFixed(5) || '-' },
    {
      title: 'Profit', dataIndex: 'profit',
      render: (v: number) => <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>{v?.toFixed(2) || '0.00'}</span>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" danger onClick={() => handleClose(record.id)}>Close</Button>
          <Button size="small" onClick={() => { setSelectedOrder(record); form.setFieldsValue({ stopLoss: record.stopLoss, takeProfit: record.takeProfit }); setModifyModal(true); }}>Modify</Button>
        </Space>
      ),
    },
  ];

  const historyColumns = [
    { title: 'Symbol', dataIndex: 'symbol' },
    { title: 'Action', dataIndex: 'action' },
    { title: 'Lot', dataIndex: 'lot' },
    { title: 'Entry', dataIndex: 'entryPrice', render: (v: number) => v?.toFixed(5) },
    { title: 'Exit', dataIndex: 'closedAt', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    {
      title: 'Profit', dataIndex: 'profit',
      render: (v: number) => <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>{v?.toFixed(2) || '0.00'}</span>,
    },
    { title: 'Status', dataIndex: 'status' },
  ];

  return (
    <>
      <Typography.Title level={4}>Position Management</Typography.Title>
      <Card>
        <Tabs items={[
          { key: 'open', label: `Open Positions (${openOrders.length})`, children: <Table dataSource={openOrders} rowKey="id" columns={openColumns} size="small" loading={loading} /> },
          { key: 'history', label: 'Closed Positions', children: <Table dataSource={history} rowKey="id" columns={historyColumns} size="small" loading={loading} /> },
        ]} />
      </Card>

      <Modal title="Modify Order" open={modifyModal} onCancel={() => setModifyModal(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleModify}>
          <Form.Item name="stopLoss" label="Stop Loss">
            <InputNumber style={{ width: '100%' }} step={0.0001} />
          </Form.Item>
          <Form.Item name="takeProfit" label="Take Profit">
            <InputNumber style={{ width: '100%' }} step={0.0001} />
          </Form.Item>
          <Button type="primary" htmlType="submit">Update</Button>
        </Form>
      </Modal>
    </>
  );
}
