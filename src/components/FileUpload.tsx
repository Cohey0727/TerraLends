import { useState, useCallback, useRef } from 'react';
import type { TerraformPlan } from '../types/terraform';
import type { HistoryEntry } from '../utils/storage';
import { getHistory, removeFromHistory, clearHistory } from '../utils/storage';

interface FileUploadProps {
  onPlanLoaded: (plan: TerraformPlan, name: string) => void;
  onHistorySelect?: (id: string) => void;
}

const COMMAND = 'terraform plan -out=plan.out && terraform show -json plan.out > plan.json';

export function FileUpload({ onPlanLoaded, onHistorySelect }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(getHistory);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyCommand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(COMMAND).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.name.endsWith('.json')) {
        setError('JSONファイルを選択してください');
        return;
      }

      try {
        const text = await file.text();
        const plan = JSON.parse(text) as TerraformPlan;

        // 基本的なバリデーション
        if (!plan.terraform_version) {
          setError('有効なTerraform planファイルではありません');
          return;
        }

        onPlanLoaded(plan, file.name);
      } catch {
        setError('JSONのパースに失敗しました');
      }
    },
    [onPlanLoaded]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleHistoryClick = useCallback(
    (entry: HistoryEntry) => {
      if (onHistorySelect) {
        onHistorySelect(entry.id);
      }
    },
    [onHistorySelect]
  );

  const handleHistoryDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeFromHistory(id);
    setHistory(getHistory());
  }, []);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>
          TerraLends
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Terraform plan を視覚化
        </p>
      </div>

      {/* ドロップゾーン */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#6366f1' : '#d1d5db'}`,
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#eef2ff' : '#f9fafb',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <div style={{ fontSize: '40px', marginBottom: '16px' }}>
          {isDragging ? '📂' : '📄'}
        </div>

        <p style={{ fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
          {isDragging ? 'ドロップしてアップロード' : 'plan.json をドラッグ&ドロップ'}
        </p>
        <p style={{ fontSize: '13px', color: '#9ca3af' }}>
          または クリックしてファイルを選択
        </p>
      </div>

      {/* コマンドコピー */}
      <div
        onClick={handleCopyCommand}
        style={{
          marginTop: '16px',
          padding: '12px 16px',
          backgroundColor: '#1f2937',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#374151')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1f2937')}
      >
        <code style={{ fontSize: '12px', color: '#e5e7eb', fontFamily: 'monospace' }}>
          {COMMAND}
        </code>
        <span
          style={{
            fontSize: '12px',
            color: copied ? '#22c55e' : '#9ca3af',
            marginLeft: '12px',
            flexShrink: 0,
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </span>
      </div>

      {error && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* 履歴 */}
      {history.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>履歴</h2>
            <button
              onClick={handleClearHistory}
              style={{
                fontSize: '12px',
                color: '#9ca3af',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              すべて削除
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((entry) => (
              <div
                key={entry.id}
                onClick={() => handleHistoryClick(entry)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              >
                <div>
                  <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '14px' }}>
                    {entry.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                    {formatDate(entry.timestamp)} · Terraform {entry.terraformVersion}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                    {entry.summary.create > 0 && (
                      <span style={{ color: '#22c55e' }}>+{entry.summary.create}</span>
                    )}
                    {entry.summary.update > 0 && (
                      <span style={{ color: '#eab308' }}>~{entry.summary.update}</span>
                    )}
                    {entry.summary.delete > 0 && (
                      <span style={{ color: '#ef4444' }}>-{entry.summary.delete}</span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleHistoryDelete(e, entry.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      color: '#9ca3af',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '4px',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 注意事項 */}
      <div
        style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#92400e',
        }}
      >
        <strong>⚠️ 注意:</strong> plan.json には機密情報（パスワード、APIキーなど）が含まれる可能性があります。
        このツールはブラウザ内でのみ動作し、データはサーバーに送信されません。
      </div>
    </div>
  );
}
