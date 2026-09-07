'use client';
import { useI18n } from '@/components/i18n-provider';
import { ChartNoAxesCombined } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Reserved entry only: no route, input form, storage or solver integration. */
export function TermStructureEntry() {
  const { t } = useI18n();
  return <Button type="button" variant="ghost" size="sm" disabled title={t("开发中，暂未开放")} aria-label={t("利率期限结构，暂未开放")}>
    <ChartNoAxesCombined />{t("利率期限结构")}<span className="text-[10px] font-normal">{t("未开放")}</span>
  </Button>;
}
