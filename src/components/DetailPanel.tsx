import { useMemo } from 'react';
import type { ResourceNode, ActionType } from '../types/terraform';

interface DetailPanelProps {
  resource: ResourceNode;
  onClose: () => void;
}

const actionLabels: Record<ActionType, { label: string; color: string; bg: string }> = {
  create: { label: 'Create', color: '#166534', bg: '#dcfce7' },
  update: { label: 'Update', color: '#854d0e', bg: '#fef9c3' },
  delete: { label: 'Delete', color: '#991b1b', bg: '#fee2e2' },
  read: { label: 'Read', color: '#1e40af', bg: '#dbeafe' },
  'no-op': { label: 'No Change', color: '#4b5563', bg: '#f3f4f6' },
};

export function DetailPanel({ resource, onClose }: DetailPanelProps) {
  const actionStyle = actionLabels[resource.action];

  // before/afterの差分を計算
  const changes = useMemo(() => {
    const before = resource.before || {};
    const after = resource.after || {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    const result: Array<{
      key: string;
      before: unknown;
      after: unknown;
      type: 'add' | 'remove' | 'change' | 'same';
    }> = [];

    for (const key of allKeys) {
      const beforeVal = before[key];
      const afterVal = after[key];

      if (!(key in before)) {
        result.push({ key, before: undefined, after: afterVal, type: 'add' });
      } else if (!(key in after)) {
        result.push({ key, before: beforeVal, after: undefined, type: 'remove' });
      } else if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        result.push({ key, before: beforeVal, after: afterVal, type: 'change' });
      } else {
        result.push({ key, before: beforeVal, after: afterVal, type: 'same' });
      }
    }

    // 変更があるものを先に表示
    result.sort((a, b) => {
      const order = { add: 0, remove: 1, change: 2, same: 3 };
      return order[a.type] - order[b.type];
    });

    return result;
  }, [resource.before, resource.after]);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div
      style={{
        width: '400px',
        height: '100%',
        backgroundColor: '#fff',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: actionStyle.bg,
              color: actionStyle.color,
              borderRadius: '4px',
            }}
          >
            {actionStyle.label}
          </span>

          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              fontSize: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', wordBreak: 'break-all' }}>
          {resource.type}
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '2px', wordBreak: 'break-all' }}>
          {resource.name}
        </div>

        {resource.module && (
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            Module: {resource.module}
          </div>
        )}

        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
          Provider: {resource.provider}
        </div>
      </div>

      {/* 属性一覧 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '12px' }}>
          ATTRIBUTES
        </div>

        {changes.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
            属性情報がありません
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {changes.map(({ key, before, after, type }) => (
              <div
                key={key}
                style={{
                  padding: '10px 12px',
                  backgroundColor:
                    type === 'add'
                      ? '#f0fdf4'
                      : type === 'remove'
                        ? '#fef2f2'
                        : type === 'change'
                          ? '#fffbeb'
                          : '#f9fafb',
                  border: '1px solid',
                  borderColor:
                    type === 'add'
                      ? '#bbf7d0'
                      : type === 'remove'
                        ? '#fecaca'
                        : type === 'change'
                          ? '#fde68a'
                          : '#e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '6px',
                  }}
                >
                  {type !== 'same' && (
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        borderRadius: '3px',
                        backgroundColor:
                          type === 'add' ? '#22c55e' : type === 'remove' ? '#ef4444' : '#eab308',
                        color: '#fff',
                      }}
                    >
                      {type === 'add' ? '+' : type === 'remove' ? '-' : '~'}
                    </span>
                  )}
                  <span style={{ fontWeight: 600, color: '#374151' }}>{key}</span>
                </div>

                {type === 'change' && (
                  <>
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ color: '#9ca3af', marginRight: '8px' }}>before:</span>
                      <code
                        style={{
                          backgroundColor: '#fee2e2',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          color: '#991b1b',
                          wordBreak: 'break-all',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {formatValue(before)}
                      </code>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af', marginRight: '8px' }}>after:</span>
                      <code
                        style={{
                          backgroundColor: '#dcfce7',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          color: '#166534',
                          wordBreak: 'break-all',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {formatValue(after)}
                      </code>
                    </div>
                  </>
                )}

                {type === 'add' && (
                  <code
                    style={{
                      color: '#166534',
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {formatValue(after)}
                  </code>
                )}

                {type === 'remove' && (
                  <code
                    style={{
                      color: '#991b1b',
                      textDecoration: 'line-through',
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {formatValue(before)}
                  </code>
                )}

                {type === 'same' && (
                  <code
                    style={{
                      color: '#6b7280',
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {formatValue(after)}
                  </code>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 依存関係 */}
      {resource.dependencies.length > 0 && (
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
            DEPENDENCIES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {resource.dependencies.map((dep) => (
              <span
                key={dep}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  backgroundColor: '#e5e7eb',
                  color: '#4b5563',
                  borderRadius: '4px',
                }}
              >
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
