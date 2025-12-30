import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { GraphView } from './components/GraphView';
import { ResourceList } from './components/ResourceList';
import { DetailPanel } from './components/DetailPanel';
import { parseTerraformPlan } from './utils/parsePlan';
import { useRouter } from './utils/router';
import { getHistoryById, addToHistory } from './utils/storage';
import type { TerraformPlan, ResourceNode } from './types/terraform';
import './App.css';

function App() {
  const { route, navigate } = useRouter();
  const [selectedResource, setSelectedResource] = useState<ResourceNode | null>(null);

  // ルートに基づいてプランを取得
  const { plan, planName } = useMemo(() => {
    if (route.page === 'state') {
      const entry = getHistoryById(route.id);
      if (entry) {
        return {
          plan: parseTerraformPlan(entry.plan),
          planName: entry.name,
        };
      }
    }
    return { plan: null, planName: '' };
  }, [route]);

  // ルート変更時に選択をリセット
  useEffect(() => {
    setSelectedResource(null);
  }, [route]);

  const handlePlanLoaded = useCallback((rawPlan: TerraformPlan, name: string) => {
    const entry = addToHistory(name, rawPlan);
    navigate({ page: 'state', id: entry.id });
  }, [navigate]);

  const handleHistorySelect = useCallback((id: string) => {
    navigate({ page: 'state', id });
  }, [navigate]);

  const handleResourceSelect = useCallback((resource: ResourceNode | null) => {
    setSelectedResource(resource);
  }, []);

  const handleBack = useCallback(() => {
    navigate({ page: 'home' });
  }, [navigate]);

  // ホーム画面（アップロード）
  if (route.page === 'home' || !plan) {
    return (
      <FileUpload
        onPlanLoaded={handlePlanLoaded}
        onHistorySelect={handleHistorySelect}
      />
    );
  }

  // ビジュアライザ画面
  return (
    <div className="app-container">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="header-left">
          <button onClick={handleBack} className="back-button">
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

export default App;
