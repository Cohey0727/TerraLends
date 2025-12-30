import { useMemo, useState } from 'react';
import type { ParsedPlan, ResourceNode, ActionType } from '../types/terraform';

interface ResourceListProps {
  plan: ParsedPlan;
  onResourceSelect: (resource: ResourceNode | null) => void;
  selectedId: string | null;
}

const actionColors: Record<ActionType, { bg: string; text: string; label: string }> = {
  create: { bg: '#dcfce7', text: '#166534', label: '+' },
  update: { bg: '#fef9c3', text: '#854d0e', label: '~' },
  delete: { bg: '#fee2e2', text: '#991b1b', label: '-' },
  read: { bg: '#dbeafe', text: '#1e40af', label: '?' },
  'no-op': { bg: '#f3f4f6', text: '#4b5563', label: '=' },
};

type FilterType = 'all' | ActionType;

export function ResourceList({ plan, onResourceSelect, selectedId }: ResourceListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const filteredResources = useMemo(() => {
    return plan.resources.filter((resource) => {
      // アクションフィルタ
      if (filter !== 'all' && resource.action !== filter) {
        return false;
      }
      // 検索フィルタ
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          resource.type.toLowerCase().includes(searchLower) ||
          resource.name.toLowerCase().includes(searchLower) ||
          resource.address.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [plan.resources, filter, search]);

  // アクション別にグループ化
  const groupedResources = useMemo(() => {
    const groups: Record<ActionType, ResourceNode[]> = {
      create: [],
      update: [],
      delete: [],
      read: [],
      'no-op': [],
    };

    for (const resource of filteredResources) {
      groups[resource.action].push(resource);
    }

    return groups;
  }, [filteredResources]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#fff',
        borderRight: '1px solid #e5e7eb',
      }}
    >
      {/* サマリー */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <SummaryBadge count={plan.summary.create} action="create" />
          <SummaryBadge count={plan.summary.update} action="update" />
          <SummaryBadge count={plan.summary.delete} action="delete" />
        </div>

        {/* 検索 */}
        <input
          type="text"
          placeholder="リソースを検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '13px',
            outline: 'none',
          }}
        />

        {/* フィルタ */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </FilterButton>
          <FilterButton active={filter === 'create'} onClick={() => setFilter('create')}>
            Create
          </FilterButton>
          <FilterButton active={filter === 'update'} onClick={() => setFilter('update')}>
            Update
          </FilterButton>
          <FilterButton active={filter === 'delete'} onClick={() => setFilter('delete')}>
            Delete
          </FilterButton>
        </div>
      </div>

      {/* リソースリスト */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {(['delete', 'create', 'update', 'read'] as ActionType[]).map((action) => {
          const resources = groupedResources[action];
          if (resources.length === 0) return null;

          return (
            <div key={action} style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  padding: '4px 8px',
                  marginBottom: '4px',
                }}
              >
                {action} ({resources.length})
              </div>

              {resources.map((resource) => (
                <ResourceItem
                  key={resource.id}
                  resource={resource}
                  selected={resource.id === selectedId}
                  onClick={() => onResourceSelect(resource)}
                />
              ))}
            </div>
          );
        })}

        {filteredResources.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '32px',
              color: '#9ca3af',
              fontSize: '13px',
            }}
          >
            リソースが見つかりません
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryBadge({ count, action }: { count: number; action: ActionType }) {
  const colors = actionColors[action];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: colors.bg,
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 600,
        color: colors.text,
      }}
    >
      <span>{colors.label}</span>
      <span>{count}</span>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        fontSize: '12px',
        border: '1px solid',
        borderColor: active ? '#6366f1' : '#e5e7eb',
        backgroundColor: active ? '#eef2ff' : '#fff',
        color: active ? '#4f46e5' : '#6b7280',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: active ? 500 : 400,
      }}
    >
      {children}
    </button>
  );
}

function ResourceItem({
  resource,
  selected,
  onClick,
}: {
  resource: ResourceNode;
  selected: boolean;
  onClick: () => void;
}) {
  const colors = actionColors[resource.action];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '8px',
        marginBottom: '2px',
        borderRadius: '6px',
        cursor: 'pointer',
        backgroundColor: selected ? '#eef2ff' : 'transparent',
        border: selected ? '1px solid #c7d2fe' : '1px solid transparent',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.backgroundColor = '#f9fafb';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span
        style={{
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
          color: colors.text,
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {colors.label}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#1f2937',
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
              fontSize: '11px',
              color: '#9ca3af',
              marginTop: '2px',
            }}
          >
            {resource.module}
          </div>
        )}
      </div>
    </div>
  );
}
