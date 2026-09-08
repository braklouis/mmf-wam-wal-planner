'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { detectHoldingColumns, holdingImportFields, parseHoldingRows, type HoldingColumnMap } from '@/lib/holding-import';
import { parseDelimitedTable } from '@/lib/table-import';
import type { AmountUnit } from '@/lib/planner';

const units: Record<AmountUnit, number> = { '元': 1, '万元': 1e4, '百万元': 1e6, '亿元': 1e8, Billion: 1e9 };
const labels = { name: '资产', amount: '金额', ytm: 'YTM' };
export function HoldingImport({ amountUnit, existingCount, onImport }: {
  amountUnit: AmountUnit;
  existingCount: number;
  onImport: (rows: { name: string; amount: number; ytm: number }[], replace: boolean) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [columns, setColumns] = useState<HoldingColumnMap | null>(null);
  const [sourceUnit, setSourceUnit] = useState<AmountUnit>(amountUnit);
  const [replace, setReplace] = useState(false);
  const table = useMemo(() => { try { return { rows: parseDelimitedTable(text), error: '' }; } catch (error) { return { rows: [], error: (error as Error).message }; } }, [text]);
  const mapping = columns ?? (hasHeader ? detectHoldingColumns(table.rows[0] ?? []) : { name: 0, amount: 1, ytm: 2 });
  const preview = (() => {
    try { if (table.error) throw new Error(table.error); return { rows: parseHoldingRows(table.rows, mapping, hasHeader, units[sourceUnit] / units[amountUnit]), error: '' }; }
    catch (error) { return { rows: null, error: (error as Error).message }; }
  })();
  const width = table.rows.reduce((max, row) => Math.max(max, row.length), 0);
  return <div className="grid gap-4 border-b border-border/60 p-5">
    <label className="grid gap-2 text-sm">{t('持仓表内容')}<textarea className="min-h-40 rounded-md border border-border bg-card p-3 font-mono text-sm" placeholder={'资产\t金额\tYTM\n示例资产\t1,000\t3.5%'} value={text} onChange={event => { setText(event.target.value); setColumns(null); }} /></label>
    <p className="text-sm text-muted-foreground">{t('可粘贴 Excel 单元格或 CSV 文本。支持调整列顺序和自选表头；未选择的列不导入。YTM 的 3.5 和 3.5% 均表示 3.5%。')}</p>
    <div className="flex flex-wrap gap-4">
      <label className="grid gap-2 text-sm">{t('表头')}<NativeSelect value={hasHeader ? 'yes' : 'no'} onChange={event => { setHasHeader(event.target.value === 'yes'); setColumns(null); }}><NativeSelectOption value="yes">{t('首行为表头')}</NativeSelectOption><NativeSelectOption value="no">{t('无表头')}</NativeSelectOption></NativeSelect></label>
      <label className="grid gap-2 text-sm">{t('原表金额单位')}<NativeSelect value={sourceUnit} onChange={event => setSourceUnit(event.target.value as AmountUnit)}>{Object.keys(units).map(unit => <NativeSelectOption key={unit} value={unit}>{t(unit)}</NativeSelectOption>)}</NativeSelect></label>
      <label className="grid gap-2 text-sm">{t('导入方式')}<NativeSelect value={replace ? 'replace' : 'append'} onChange={event => setReplace(event.target.value === 'replace')}><NativeSelectOption value="append">{t('追加到现有持仓')}</NativeSelectOption><NativeSelectOption value="replace">{t('替换全部持仓')}</NativeSelectOption></NativeSelect></label>
    </div>
    {text.trim() && <div className="flex flex-wrap gap-4">{holdingImportFields.map(field => <label key={field} className="grid gap-2 text-sm">{t(labels[field])}<NativeSelect value={mapping[field]} onChange={event => setColumns({ ...mapping, [field]: Number(event.target.value) })}><NativeSelectOption value={-1}>{t('请选择列')}</NativeSelectOption>{Array.from({ length: width }, (_, index) => <NativeSelectOption key={index} value={index}>{index + 1} · {table.rows[0]?.[index] || '—'}</NativeSelectOption>)}</NativeSelect></label>)}</div>}
    <p className="text-sm text-muted-foreground">{t('集中度归属机构需在导入后手动选择；不自动识别现金，缺失期限需补齐。预览和导入金额均换算为当前页面单位：')} {t(amountUnit)}</p>
    {replace && existingCount > 0 && <output className="text-sm text-destructive">{t('将替换全部现有持仓，原归属机构和期限也会清除。')} ({existingCount})</output>}
    {text.trim() && preview.error && <p role="alert" className="text-sm text-destructive">{t(preview.error)}</p>}
    {preview.rows && <>
      <p className="text-sm">{t('待导入持仓')}：{preview.rows.length} · {t('金额合计')}：{preview.rows.reduce((sum, row) => sum + row.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 8 })} {t(amountUnit)}</p>
      <div className="max-h-72 overflow-auto"><Table><TableHeader><TableRow><TableHead>{t('资产')}</TableHead><TableHead>{t('金额')} ({t(amountUnit)})</TableHead><TableHead>YTM %</TableHead></TableRow></TableHeader><TableBody>{preview.rows.map((row, index) => <TableRow key={index}><TableCell>{row.name}</TableCell><TableCell>{row.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}</TableCell><TableCell>{row.ytm}</TableCell></TableRow>)}</TableBody></Table></div>
    </>}
    <Button className="justify-self-start" disabled={!preview.rows} onClick={() => { if (preview.rows) onImport(preview.rows, replace); }}>{t(replace ? '确认替换并导入' : '确认追加并导入')}</Button>
  </div>;
}
