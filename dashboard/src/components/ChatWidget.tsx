import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Card, Typography, Space, Spin, Tag, Tooltip, theme } from 'antd';
import {
  RobotOutlined,
  CloseOutlined,
  SendOutlined,
  MinusOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;
const { TextArea } = Input;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Show my open positions',
  'What strategies are active?',
  'How is my account performing?',
  'What are my risk settings?',
  'Tell me about your experience',
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>(SUGGESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { token } = theme.useToken();

  useEffect(() => {
    const saved = localStorage.getItem('chat_session_id');
    if (saved) setSessionId(saved);
  }, []);

  useEffect(() => {
    if (sessionId) localStorage.setItem('chat_session_id', sessionId);
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setSuggestions([]);

    try {
      const res = await axios.post('/api/chat', {
        sessionId: sessionId || undefined,
        message: text,
      });

      if (!sessionId && res.data.sessionId) {
        setSessionId(res.data.sessionId);
      }

      const assistantMsg: Message = { role: 'assistant', content: res.data.reply };
      setMessages(prev => [...prev, assistantMsg]);

      if (res.data.suggestions?.length) {
        setSuggestions(res.data.suggestions);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        role: 'assistant',
        content: err.response?.data?.message || 'Sorry, I am unable to respond right now. Please check the AI configuration.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!open) {
    return (
      <Tooltip title="AI Assistant">
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<RobotOutlined />}
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        />
      </Tooltip>
    );
  }

  const width = minimized ? 60 : 380;

  return (
    <Card
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width,
        maxHeight: 520,
        zIndex: 1000,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        borderRadius: 12,
        transition: 'width 0.2s',
        display: 'flex',
        flexDirection: 'column',
      }}
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          background: token.colorPrimary,
          borderRadius: '12px 12px 0 0',
          color: '#fff',
        }}
      >
        <Space>
          <RobotOutlined />
          <Text strong style={{ color: '#fff' }}>AI Assistant</Text>
        </Space>
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<MinusOutlined />}
            onClick={() => setMinimized(!minimized)}
            style={{ color: '#fff' }}
          />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => setOpen(false)}
            style={{ color: '#fff' }}
          />
        </Space>
      </div>

      {!minimized && (
        <>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              minHeight: 300,
              maxHeight: 360,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>
                <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  Hello! I am your AI trading assistant. Ask me anything!
                </Text>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <Tag color={msg.role === 'user' ? 'blue' : 'green'} style={{ marginBottom: 2 }}>
                  {msg.role === 'user' ? 'You' : 'AI'}
                </Tag>
                <div
                  style={{
                    background: msg.role === 'user' ? token.colorPrimary : '#f5f5f5',
                    color: msg.role === 'user' ? '#fff' : '#000',
                    padding: '8px 12px',
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start' }}>
                <Tag color="green" style={{ marginBottom: 2 }}>AI</Tag>
                <Spin size="small" style={{ marginLeft: 8 }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {suggestions.length > 0 && (
            <div
              style={{
                padding: '8px 12px',
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
              }}
            >
              {suggestions.map((s, i) => (
                <Button
                  key={i}
                  size="small"
                  type="dashed"
                  onClick={() => handleSuggestion(s)}
                  style={{ fontSize: 12 }}
                >
                  {s}
                </Button>
              ))}
            </div>
          )}

          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              gap: 8,
            }}
          >
            <TextArea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              style={{ flex: 1, borderRadius: 8 }}
              disabled={loading}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => sendMessage(input)}
              loading={loading}
              disabled={!input.trim()}
            />
          </div>
        </>
      )}
    </Card>
  );
}
