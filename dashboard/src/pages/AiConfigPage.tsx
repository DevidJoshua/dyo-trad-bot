import React, { useEffect, useState } from 'react';
import {
  Card, Form, Select, Input, Switch, Button, Typography,
  Tag, Descriptions, message, Spin, Tabs, Space, Table, Radio,
} from 'antd';
import api from '../services/api';

const { TextArea } = Input;
const { Text } = Typography;

export default function AiConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [telegram, setTelegram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [form] = Form.useForm();
  const [tgForm] = Form.useForm();

  const fetchData = async () => {
    try {
      const [cfgRes, knRes, anRes, tgRes] = await Promise.all([
        api.get('/admin/ai/config'),
        api.get('/admin/ai/knowledge'),
        api.get('/admin/ai/analytics'),
        api.get('/admin/telegram/config'),
      ]);
      setConfig(cfgRes.data);
      setKnowledge(knRes.data);
      setAnalytics(anRes.data);
      setTelegram(tgRes.data);

      if (cfgRes.data) {
        setSelectedProvider(cfgRes.data.provider || 'openai');
        form.setFieldsValue({
          ...cfgRes.data,
          suggestedQuestions: cfgRes.data.suggestedQuestions
            ? JSON.parse(cfgRes.data.suggestedQuestions)
            : [],
        });
      }

      if (tgRes.data) {
        tgForm.setFieldsValue(tgRes.data);
      }
    } catch {
      message.error('Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onFinish = async (values: any) => {
    setSaving(true);
    try {
      const res = await api.put('/admin/ai/config', values);
      message.success('AI configuration saved');
      setConfig(res.data);
      setSelectedProvider(values.provider);
    } catch {
      message.error('Failed to save AI config');
    } finally {
      setSaving(false);
    }
  };

  const onTelegramFinish = async (values: any) => {
    setTgSaving(true);
    try {
      const res = await api.put('/admin/telegram/config', values);
      message.success('Telegram configuration saved');
      setTelegram(res.data);
    } catch {
      message.error('Failed to save Telegram config');
    } finally {
      setTgSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      const res = await api.post('/admin/telegram/test');
      if (res.data.success) {
        message.success('Test message sent! Check your Telegram.');
      } else {
        message.error('Failed to send test message. Check your config.');
      }
    } catch {
      message.error('Test message failed');
    }
  };

  const handleRebuild = async () => {
    try {
      await api.post('/admin/ai/knowledge/rebuild', { entries: [] });
      message.success('Knowledge base rebuilt from seed');
      fetchData();
    } catch {
      message.error('Failed to rebuild knowledge');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const providerOptions = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic Claude' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'ollama', label: 'Ollama (Local)' },
    { value: 'custom', label: 'Custom (OpenAI-compatible Gateway)' },
  ];

  return (
    <>
      <Typography.Title level={4}>Integrations & AI Configuration</Typography.Title>

      <Tabs
        items={[
          {
            key: 'ai-config',
            label: 'AI Provider',
            children: (
              <Card>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={onFinish}
                  style={{ maxWidth: 600 }}
                  initialValues={{ provider: 'openai', model: 'gpt-4o-mini', enabled: true }}
                  onValuesChange={(changed) => {
                    if (changed.provider) setSelectedProvider(changed.provider);
                  }}
                >
                  <Form.Item name="enabled" label="Enable Chatbot" valuePropName="checked">
                    <Switch />
                  </Form.Item>

                  <Form.Item name="chatMode" label="Chat Mode">
                    <Radio.Group>
                      <Radio value="chat">Chat (conversational)</Radio>
                      <Radio value="response">Response (single Q&amp;A)</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item name="provider" label="AI Provider" rules={[{ required: true }]}>
                    <Select options={providerOptions} />
                  </Form.Item>

                  <Form.Item name="apiKey" label="API Key">
                    <Input.Password
                      placeholder={config?.apiKey === '••••••••' ? 'Enter new key to change' : 'Enter API key'}
                    />
                    {config?.apiKey === '••••••••' && (
                      <Text type="secondary" style={{ fontSize: 12 }}>Key is set. Leave empty to keep existing.</Text>
                    )}
                  </Form.Item>

                  {selectedProvider === 'custom' && (
                    <Form.Item
                      name="apiEndpoint"
                      label="API Endpoint URL"
                      rules={[{ required: true, message: 'Endpoint URL is required for custom provider' }]}
                      extra="Example: https://api.sniffox.ai or any OpenAI-compatible endpoint"
                    >
                      <Input placeholder="https://api.sniffox.ai/v1/chat/completions" />
                    </Form.Item>
                  )}

                  <Form.Item name="model" label="Model" rules={[{ required: true }]}>
                    <Input placeholder="gpt-4o-mini" />
                  </Form.Item>

                  <Form.Item name="systemPrompt" label="System Prompt">
                    <TextArea rows={4} />
                  </Form.Item>

                  <Form.Item name="welcomeMessage" label="Welcome Message">
                    <Input />
                  </Form.Item>

                  <Form.Item name="suggestedQuestions" label="Suggested Questions">
                    <Select mode="tags" placeholder="Type and press enter" />
                  </Form.Item>

                  <Button type="primary" htmlType="submit" loading={saving}>
                    Save AI Configuration
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'telegram',
            label: 'Telegram',
            children: (
              <Card>
                <Form
                  form={tgForm}
                  layout="vertical"
                  onFinish={onTelegramFinish}
                  style={{ maxWidth: 600 }}
                >
                  <Form.Item name="enabled" label="Enable Telegram Notifications" valuePropName="checked">
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name="botToken"
                    label="Bot Token"
                    extra="Get from @BotFather on Telegram"
                  >
                    <Input.Password
                      placeholder={telegram?.botToken === '••••••••' ? 'Enter new token to change' : 'Enter bot token'}
                    />
                    {telegram?.botToken === '••••••••' && (
                      <Text type="secondary" style={{ fontSize: 12 }}>Token is set. Leave empty to keep existing.</Text>
                    )}
                  </Form.Item>

                  <Form.Item
                    name="chatId"
                    label="Chat ID"
                    extra="Send a message to your bot, then visit https://api.telegram.org/bot&lt;token&gt;/getUpdates to find your chat ID"
                  >
                    <Input placeholder="-1001234567890" />
                  </Form.Item>

                  <Space>
                    <Button type="primary" htmlType="submit" loading={tgSaving}>
                      Save Telegram Config
                    </Button>
                    <Button onClick={handleTestTelegram}>
                      Send Test Message
                    </Button>
                  </Space>
                </Form>
              </Card>
            ),
          },
          {
            key: 'knowledge',
            label: `Knowledge Base (${knowledge.length})`,
            children: (
              <Card>
                <Space style={{ marginBottom: 16 }}>
                  <Button onClick={handleRebuild}>Rebuild from Seed</Button>
                </Space>
                <Table
                  dataSource={knowledge}
                  rowKey="id"
                  size="small"
                  columns={[
                    { title: 'Category', dataIndex: 'category', render: (v: string) => <Tag>{v}</Tag> },
                    { title: 'Title', dataIndex: 'title' },
                    { title: 'Content', dataIndex: 'content', ellipsis: true },
                    { title: 'Tags', dataIndex: 'tags', ellipsis: true },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'analytics',
            label: 'Analytics',
            children: (
              <Card>
                {analytics && (
                  <>
                    <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
                      <Descriptions.Item label="Total Sessions">{analytics.totalSessions}</Descriptions.Item>
                      <Descriptions.Item label="Total Messages">{analytics.totalMessages}</Descriptions.Item>
                    </Descriptions>
                    <Typography.Title level={5}>Recent Sessions</Typography.Title>
                    <Table
                      dataSource={analytics.recentSessions || []}
                      rowKey="id"
                      size="small"
                      columns={[
                        { title: 'Session ID', dataIndex: 'sessionId', ellipsis: true },
                        { title: 'Messages', dataIndex: ['_count', 'messages'] },
                        { title: 'Last Activity', dataIndex: 'updatedAt', render: (v: string) => new Date(v).toLocaleString() },
                      ]}
                    />
                  </>
                )}
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
