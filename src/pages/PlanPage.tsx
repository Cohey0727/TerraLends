import { useState, useCallback, useMemo } from 'react';
import { GraphView } from '../components/GraphView';
import { ResourceList } from '../components/ResourceList';
import { DetailPanel } from '../components/DetailPanel';
import { parseTerraformPlan } from '../utils/parsePlan';
import { getHistoryById } from '../utils/storage';
import type { ResourceNode } from '../types/terraform';

interface PlanPageProps {
  id: string;
  onBack: () => void;
}

export function PlanPage({ id, onBack }: PlanPageProps) {
  const [selectedResource, setSelectedResource] = useState<ResourceNode | null>(null);

  // IDからプランを取得
  const { plan, planName } = useMemo(() => {
    const entry = getHistoryById(id);
    if (entry) {
      return {
        plan: parseTerraformPlan(entry.plan),
        planName: entry.name,
      };
    }
    return { plan: null, planName: '' };
  }, [id]);

  const handleResourceSelect = useCallback((resource: ResourceNode | null) => {
    setSelectedResource(resource);
  }, []);

  // プランが見つからない場合
  if (!plan) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-left">
            <button onClick={onBack} className="back-button">
              ← 戻る
            </button>
          </div>
        </header>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 60px)',
          color: '#6b7280',
        }}>
          プランが見つかりません
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="header-left">
          <button onClick={onBack} className="back-button">
            ← 戻る
          </button>
          <h1 className="header-title">{planName}</h1>
          <span className="header-version">Terraform {plan.terraformVersion}</span>
        </div>
        <div className="header-right">
          <span className="header-summary">
            <span className="summary-create">+{plan.summary.create}</span>
            <span className="summary-update">~{plan.summary.update}</span>
            <span className="summary-delete">-{plan.summary.delete}</span>
          </span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="app-main">
        {/* 左サイドバー: リソースリスト */}
        <aside className="sidebar">
          <ResourceList
            plan={plan}
            onResourceSelect={handleResourceSelect}
            selectedId={selectedResource?.id ?? null}
          />
        </aside>

        {/* 中央: グラフビュー */}
        <main className="graph-container">
          <GraphView
            plan={plan}
            onNodeSelect={handleResourceSelect}
            selectedId={selectedResource?.id ?? null}
          />
        </main>

        {/* 右サイドバー: 詳細パネル */}
        {selectedResource && (
          <DetailPanel resource={selectedResource} onClose={() => setSelectedResource(null)} />
        )}
      </div>
    </div>
  );
}
