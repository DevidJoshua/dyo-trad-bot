import React, { useState } from 'react';
import {
  Card, Form, Select, DatePicker, InputNumber, Button, Typography,
  Descriptions, message, Spin,
} from 'antd';
import { backtestApi } from '../services/api';

const { RangePicker } = DatePicker;

export default function BacktestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    setLoading(true);
    setResult(null);
    try {
      const [startDate, endDate] = values.dateRange;
      const res = await backtestApi.run({
        strategyName: values.strategyName,
        symbol: values.symbol,
        timeframe: values.timeframe,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        config: values.config || {},
      });
      setResult(res.data);
      message.success('Backtest completed');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Typography.Title level={4}>Backtesting Framework</Typography.Title>
      <Card style={{ maxWidth: 600, marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="strategyName" label="Strategy" rules={[{ required: true }]}>
            <Select options={[
              { value: 'RSI_REVERSAL', label: 'RSI Reversal' },
              { value: 'MA_CROSS', label: 'MA Cross' },
              { value: 'BREAKOUT', label: 'Breakout' },
            ]} />
          </Form.Item>
          <Form.Item name="symbol" label="Symbol" rules={[{ required: true }]}>
            <Select options={[
              'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'XAUUSD',
            ].map(s => ({ value: s, label: s }))} />
          </Form.Item>
          <Form.Item name="timeframe" label="Timeframe" rules={[{ required: true }]}>
            <Select options={['M1','M5','M15','H1','H4','D1'].map(t => ({ value: t, label: t }))} />
          </Form.Item>
          <Form.Item name="dateRange" label="Date Range" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Run Backtest</Button>
        </Form>
      </Card>

      {loading && <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}

      {result && (
        <Card title="Backtest Results">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Strategy">{result.strategyName}</Descriptions.Item>
            <Descriptions.Item label="Symbol">{result.symbol}</Descriptions.Item>
            <Descriptions.Item label="Timeframe">{result.timeframe}</Descriptions.Item>
            <Descriptions.Item label="Total Trades">{result.totalTrades}</Descriptions.Item>
            <Descriptions.Item label="Win Rate">{result.winRate}%</Descriptions.Item>
            <Descriptions.Item label="Profit Factor">{result.profitFactor}</Descriptions.Item>
            <Descriptions.Item label="Total Profit">
              <span style={{ color: result.totalProfit >= 0 ? '#3f8600' : '#cf1322' }}>
                {result.totalProfit?.toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Max Drawdown">{result.maxDrawdown?.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="Sharpe Ratio">{result.sharpeRatio}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </>
  );
}
