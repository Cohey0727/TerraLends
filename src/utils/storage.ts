import type { TerraformPlan } from '../types/terraform';

const HISTORY_KEY = 'terralends_history';
const MAX_HISTORY = 10;

export interface HistoryEntry {
  id: string;
  name: string;
  terraformVersion: string;
  timestamp: number;
  summary: {
    create: number;
    update: number;
    delete: number;
  };
  plan: TerraformPlan;
}

export function getHistory(): HistoryEntry[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToHistory(name: string, plan: TerraformPlan): HistoryEntry {
  const history = getHistory();

  const summary = {
    create: 0,
    update: 0,
    delete: 0,
  };

  if (plan.resource_changes) {
    for (const change of plan.resource_changes) {
      const actions = change.change.actions;
      if (actions.includes('create')) summary.create++;
      else if (actions.includes('delete')) summary.delete++;
      else if (actions.includes('update')) summary.update++;
    }
  }

  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    name,
    terraformVersion: plan.terraform_version,
    timestamp: Date.now(),
    summary,
    plan,
  };

  // 新しいエントリを先頭に追加、最大件数を超えたら古いものを削除
  const newHistory = [entry, ...history].slice(0, MAX_HISTORY);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {
    // ストレージがいっぱいの場合、古いエントリを削除して再試行
    console.warn('localStorage full, removing old entries', e);
    const reduced = newHistory.slice(0, 3);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(reduced));
  }

  return entry;
}

export function removeFromHistory(id: string): void {
  const history = getHistory();
  const newHistory = history.filter((entry) => entry.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function getHistoryById(id: string): HistoryEntry | null {
  const history = getHistory();
  return history.find((entry) => entry.id === id) ?? null;
}
