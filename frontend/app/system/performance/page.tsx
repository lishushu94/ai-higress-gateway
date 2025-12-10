'use client';

import { useI18n } from '@/lib/i18n-context';
import { PerformanceDashboardClient } from './components/performance-dashboard-client';

export default function PerformancePage() {
  const { t } = useI18n();
  
  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('performance.title')}</h1>
        <p className="text-muted-foreground">
          {t('performance.subtitle')}
        </p>
      </div>
      
      <PerformanceDashboardClient />
    </div>
  );
}
