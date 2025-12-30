import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ResourceNode as ResourceNodeType } from '../types/terraform';

type ResourceNodeData = {
  label: string;
  resource: ResourceNodeType;
  moduleName: string;
};

type ResourceNodeNode = Node<ResourceNodeData, 'resourceNode'>;

const actionColors: Record<string, { bg: string; border: string; text: string }> = {
  create: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  update: { bg: '#fef9c3', border: '#eab308', text: '#854d0e' },
  delete: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  read: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  'no-op': { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' },
};

const actionLabels: Record<string, string> = {
  create: '+ Create',
  update: '~ Update',
  delete: '- Delete',
  read: '? Read',
  'no-op': '= No-op',
};

export function ResourceNode({ data, selected }: NodeProps<ResourceNodeNode>) {
  const { resource } = data;
  const colors = actionColors[resource.action] || actionColors['no-op'];

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: colors.bg,
        border: `2px solid ${selected ? '#6366f1' : colors.border}`,
        minWidth: '240px',
        boxShadow: selected ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.border }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: colors.text,
            backgroundColor: colors.border + '30',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {actionLabels[resource.action]}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: '#6b7280',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {resource.provider.split('/').pop()}
        </span>
      </div>

      <div
        style={{
          fontWeight: 600,
          fontSize: '13px',
          color: '#1f2937',
          marginBottom: '2px',
          wordBreak: 'break-word',
        }}
      >
        {resource.type}
      </div>

      <div
        style={{
          fontSize: '12px',
          color: '#6b7280',
          wordBreak: 'break-word',
        }}
      >
        {resource.name}
      </div>

      {resource.module && (
        <div
          style={{
            fontSize: '10px',
            color: '#9ca3af',
            marginTop: '4px',
            fontStyle: 'italic',
          }}
        >
          {resource.module}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: colors.border }} />
    </div>
  );
}
