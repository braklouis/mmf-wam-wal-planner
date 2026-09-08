'use client';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { EditableNumberInput } from '@/components/planner-fields';
import { compareRateStrategies, type RateScenario } from '@/lib/rate-strategy';
import { parseRateCurve } from '@/lib/rate-curve-import';
import { estimateTermRate, type RateNode } from '@/lib/term-structure';
import { number, percent, type Portfolio, type ModelBank, type Quote, type AmountUnit } from '@/lib/planner';

export function RateScenarioPanel({ scenario, onChange, portfolio, banks, quotes, amountUnit, inputErrors }: {
  scenario: RateScenario; onChange: (value: RateScenario) => void; portfolio: Portfolio; banks: ModelBank[]; quotes: Quote[]; amountUnit: AmountUnit; inputErrors: string[];
}) {
  const { t } = useI18n();
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [calculate, setCalculate] = useState(false);
  const imported = useMemo(() => { try { return { nodes: parseRateCurve(paste), error: '' }; } catch (error) { return { nodes: null, error: (error as Error).message }; } }, [paste]);
  const curve = useMemo(() => {
    if (scenario.nodes.some(row => row.days === null || row.rate === null)) return { nodes: [] as RateNode[], error: '请补齐每个预测节点的期限和利率，或删除空行。' };
    const nodes = scenario.nodes as RateNode[];
    const validation = estimateTermRate(nodes, nodes[0]?.days ?? 0);
    return validation.ok ? { nodes: [...nodes].sort((a, b) => a.days - b.days), error: '' } : { nodes: [] as RateNode[], error: validation.message };
  }, [scenario.nodes]);
  const comparison = useMemo(() => {
    if (!calculate) return null;
    try {
      if (inputErrors.length) throw new Error(inputErrors.join('\n'));
      return { data: compareRateStrategies(portfolio, banks, quotes, scenario), error: '' };
    } catch (error) { return { data: null, error: (error as Error).message }; }
  }, [calculate, portfolio, banks, quotes, scenario, inputErrors]);
  const updateNode = (index: number, patch: Partial<RateScenario['nodes'][number]>) => onChange({ ...scenario, nodes: scenario.nodes.map((row, i) => i === index ? { ...row, ...patch } : row) });
  return <section className="space-y-5 rounded-md border border-border bg-card p-5">
    <div><h2 className="text-lg font-semibold">{t('利率预测与等待策略')}</h2><p className="mt-2 text-sm text-muted-foreground">{t('比较现在锁定、短期续投和现金等待。预测曲线用于到期后的再投资，不会覆盖今日报价。')}</p></div>
    <div className="grid gap-4 md:grid-cols-3">
      <label className="grid gap-2 text-sm">{t('统一比较期限（天）')}<EditableNumberInput value={scenario.horizon} onValueChange={horizon => onChange({ ...scenario, horizon })} /></label>
      <label className="grid gap-2 text-sm">{t('现金等待天数')}<EditableNumberInput value={scenario.waitDays} onValueChange={waitDays => onChange({ ...scenario, waitDays })} /></label>
      <label className="grid gap-2 text-sm">{t('计息基准')}<NativeSelect value={scenario.basis} onChange={event => onChange({ ...scenario, basis: Number(event.target.value) as 360 | 365 })}><NativeSelectOption value={365}>ACT/365</NativeSelectOption><NativeSelectOption value={360}>ACT/360</NativeSelectOption></NativeSelect></label>
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{t('未来再投资利率曲线')}</h3><Button size="sm" variant="outline" onClick={() => setShowPaste(value => !value)}>{t('粘贴预测曲线')}</Button></div>
        <p className="text-sm text-muted-foreground">{t('横轴是再投资的产品期限，不是未来日期。每个初始产品到期时，都使用这条预测曲线。')}</p>
        {showPaste && <div className="grid gap-2 rounded-md border border-border p-3">
          <label className="grid gap-2 text-sm">{t('期限与预测利率')}<textarea className="min-h-32 rounded-md border border-border bg-card p-3 font-mono text-sm" value={paste} onChange={event => setPaste(event.target.value)} placeholder={'期限\t利率\n1M\t3.5%\n3M\t3.2%'} /></label>
          <p className="text-sm text-muted-foreground">{t('支持 Excel 粘贴或 CSV，可有表头。期限支持天数、1W、1M 等；1M 按 30 天换算。')}</p>
          {paste.trim() && imported.error && <p role="alert" className="text-sm text-destructive">{t(imported.error)}</p>}
          {imported.nodes && <p className="text-sm">{t('将替换预测节点')}：{imported.nodes.map(row => `${row.days}d / ${row.rate}%`).join(' · ')}</p>}
          <Button disabled={!imported.nodes} onClick={() => { if (imported.nodes) { onChange({ ...scenario, nodes: imported.nodes }); setPaste(''); setShowPaste(false); } }}>{t('确认导入曲线')}</Button>
        </div>}
        <Table><TableHeader><TableRow><TableHead>{t('期限（天）')}</TableHead><TableHead>{t('预测利率')} %</TableHead><TableHead><span className="sr-only">{t('删除')}</span></TableHead></TableRow></TableHeader><TableBody>{scenario.nodes.map((node, index) => <TableRow key={index}>
          <TableCell><EditableNumberInput aria-label={`${t('期限（天）')} ${index + 1}`} value={node.days} onValueChange={days => updateNode(index, { days })} /></TableCell>
          <TableCell><EditableNumberInput aria-label={`${t('预测利率')} ${index + 1}`} value={node.rate} onValueChange={rate => updateNode(index, { rate })} /></TableCell>
          <TableCell><Button size="icon-sm" variant="ghost" aria-label={`${t('删除')} ${index + 1}`} onClick={() => onChange({ ...scenario, nodes: scenario.nodes.filter((_, i) => i !== index) })}><Trash2 /></Button></TableCell>
        </TableRow>)}</TableBody></Table>
        <Button size="sm" variant="outline" onClick={() => onChange({ ...scenario, nodes: [...scenario.nodes, { days: null, rate: null }] })}><Plus />{t('添加预测节点')}</Button>
      </div>
      <div className="min-w-0 space-y-3 rounded-md border border-border p-4">
        <h3 className="font-medium">{t('预测期限结构')}</h3>
        {curve.error ? <div className="flex min-h-64 items-center justify-center p-6 text-sm text-muted-foreground">{t(curve.error)}</div> : <ChartContainer config={{ rate: { label: t('预测利率'), color: 'var(--primary)' } }} className="h-[300px] w-full aspect-auto" initialDimension={{ width: 650, height: 300 }}><LineChart data={curve.nodes} margin={{ left: 0, right: 20, top: 15, bottom: 10 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="days" type="number" domain={['dataMin', 'dataMax']} unit={t('天')} /><YAxis domain={['auto', 'auto']} tickFormatter={value => `${value}%`} width={64} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="linear" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
        </LineChart></ChartContainer>}
        <p className="text-sm text-muted-foreground">{t('节点之间采用线性插值，不向区间外推算。缺少对应期限预测的产品会单独列为未参与。')}</p>
      </div>
    </div>
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-4 text-sm leading-6">
      <p>{t('计算方式：终值 = 本金 × (1 + 今日利率 × 首段天数 / 年基准) × (1 + 预测利率 × 剩余天数 / 年基准)。利率计算时除以 100。')}</p>
      <p>{t('现金等待使用今日可投中期限为 0 天的报价，等待期间利率假设不变；到期的本金和利息一起再投资。未配置资金按零收益计，不等同于现金等待。')}</p>
      <p>{t('只优化新增资金。初始配置沿用当前期限、额度和集中度约束；未来再投资假设可按预测利率成交，不验证未来额度、机构归属和逐日合规。浮息产品和比较日后才到期的产品暂不参与。')}</p>
      <p>{t('结果是该预测情景下的最优配置，不是保证收益；各产品需采用相同币种和计息口径，暂不计费用和提前卖出价格变化。')}</p>
    </div>
    {!quotes.some(quote => quote.walDays === 0) && <p className="text-sm text-destructive">{t('今日可投尚无 0 天现金报价，当前不会生成现金等待策略；请先添加现金利率及机构归属。')}</p>}
    <Button disabled={Boolean(curve.error)} onClick={() => setCalculate(true)}>{t('比较预测策略')}</Button>
    {comparison?.error && <p role="alert" className="whitespace-pre-line text-sm text-destructive">{t(comparison.error)}</p>}
    {comparison?.data && <div className="space-y-4 border-t border-border pt-5">
      <h3 className="font-semibold">{t('新增资金策略对比')}</h3>
      <p className="text-sm text-muted-foreground">{t('两种配置使用相同可比较产品；收益均按这条预测曲线评估，输入改变后自动重算。当前报价基准以今日利率最大化，不代表最优择时。')}</p>
      <div className="grid gap-3 md:grid-cols-3">{[
        ['当前报价策略预计收益', comparison.data.baselineIncome], ['预测策略预计收益', comparison.data.projectedIncome], ['预计收益变化', comparison.data.projectedIncome - comparison.data.baselineIncome],
      ].map(([label, value]) => <div key={String(label)} className="rounded-md border border-border p-4"><p className="text-sm text-muted-foreground">{t(String(label))}</p><p className="mt-2 text-xl font-semibold">{number(Number(value), 6)} <span className="text-sm font-normal">{t(amountUnit)}</span></p></div>)}</div>
      <div className="grid gap-3 md:grid-cols-3">{['锁定至比较日', '短期续投', '现金等待'].map((label, category) => {
        const amount = comparison.data.rows.filter(row => category === 2 ? row.isWaiting : !row.isWaiting && (category === 0 ? row.remaining === 0 : row.remaining > 0)).reduce((sum, row) => sum + row.projectedAmount, 0);
        return <div className="rounded-md border border-border p-4" key={label}><p className="text-sm text-muted-foreground">{t(label)}</p><p className="mt-2 text-lg font-semibold">{number(amount, 6)} {t(amountUnit)} · {percent(amount / portfolio.transactionAmount * 100)}</p></div>;
      })}</div>
      <Table><TableHeader><TableRow>{['今日产品', '当前报价', '首段天数', '再投资利率', '累计收益率', '当前报价配置', '预测策略配置'].map(label => <TableHead key={label}>{t(label)}</TableHead>)}</TableRow></TableHeader><TableBody>{comparison.data.rows.map(row => <TableRow key={row.id}><TableCell>{row.name}{row.isWaiting && <span className="block text-xs text-muted-foreground">{t('现金等待')}</span>}</TableCell><TableCell>{percent(row.rate)}</TableCell><TableCell>{row.initialDays}</TableCell><TableCell>{row.futureRate === null ? '—' : percent(row.futureRate)}</TableCell><TableCell>{percent(row.returnRate * 100)}</TableCell><TableCell>{number(row.baselineAmount, 6)}</TableCell><TableCell>{number(row.projectedAmount, 6)}</TableCell></TableRow>)}</TableBody></Table>
      <p className="text-sm">{t('金额单位')}：{t(amountUnit)} · {t('预测策略未配置金额')}：{number(comparison.data.projected.unallocated, 6)} · {t('初始配置后 WAM / WAL')}：{number(comparison.data.projected.postWam)} / {number(comparison.data.projected.postWal)} {t('天')}</p>
      {comparison.data.excluded.length > 0 && <div className="space-y-2 text-sm"><p className="font-medium">{t('未参与比较的产品')}</p>{comparison.data.excluded.map((row, index) => <p key={index}>{row.name}：{t(row.reason)}</p>)}</div>}
    </div>}
  </section>;
}
