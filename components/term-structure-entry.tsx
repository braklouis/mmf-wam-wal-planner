'use client';
import { useI18n } from '@/components/i18n-provider';
import { ChartNoAxesCombined } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TermStructureEntry({ active, onClick }: { active: boolean; onClick: () => void }) {
  const { t } = useI18n();
  return <Button type="button" variant="ghost" size="sm" onClick={onClick} aria-pressed={active}
    className={active ? 'bg-card text-foreground shadow-sm hover:bg-card' : 'text-muted-foreground hover:text-foreground'}>
    <ChartNoAxesCombined />{t('利率期限结构')}<span className="text-xs font-normal">{t('暂时开放')}</span>
  </Button>;
}
