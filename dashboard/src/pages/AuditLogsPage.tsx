import React, { useEffect, useState } from 'react';
import { Card, Table, Typography } from 'antd';
import { auditApi } from '../services/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await auditApi.getLogs();
        setLogs(res.data);
      } catch {
        console.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const columns = [
    { title: 'Action', dataIndex: 'action' },
    { title: 'Entity', dataIndex: 'entity' },
    { title: 'Entity ID', dataIndex: 'entityId' },
    { title: 'Details', dataIndex: 'details', ellipsis: true },
    { title: 'Timestamp', dataIndex: 'createdAt', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <>
      <Typography.Title level={4}>Audit Logs</Typography.Title>
      <Card>
        <Table dataSource={logs} rowKey="id" columns={columns} loading={loading} />
      </Card>
    </>
  );
}
