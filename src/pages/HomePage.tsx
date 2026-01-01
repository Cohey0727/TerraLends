import { useCallback } from 'react';
import { FileUpload } from '../components/FileUpload';
import { addToHistory } from '../utils/storage';
import type { TerraformPlan } from '../types/terraform';

interface HomePageProps {
  onNavigate: (id: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const handlePlanLoaded = useCallback((rawPlan: TerraformPlan, name: string) => {
    const entry = addToHistory(name, rawPlan);
    onNavigate(entry.id);
  }, [onNavigate]);

  const handleHistorySelect = useCallback((id: string) => {
    onNavigate(id);
  }, [onNavigate]);

  return (
    <FileUpload
      onPlanLoaded={handlePlanLoaded}
      onHistorySelect={handleHistorySelect}
    />
  );
}
