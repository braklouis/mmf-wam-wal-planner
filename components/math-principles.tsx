'use client';

import { MathFormula } from '@/components/math-formula';
import { useState } from 'react';
import { Sigma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useI18n } from '@/components/i18n-provider';
import { calculatePlan, number, quoteWamDays, redemptionStress, SFC_MAX_WAM_DAYS, SFC_MAX_WAL_DAYS, type Portfolio, type ModelBank, type Quote, type Holding, type AmountUnit, type ModelResult } from '@/lib/planner';
import type { SolverTrace } from '@/lib/simplex';

type Inputs = { portfolio: Portfolio; banks: ModelBank[]; quotes: Quote[]; holdings: Holding[]; amountUnit: AmountUnit };
type Report = Inputs & { trace: SolverTrace; result: ModelResult; time: string };

export function MathPrinciples(props: Inputs) {
  const { t, locale } = useI18n();
  const text = (cn: string, en: string) => locale === 'en' ? en : t(cn);
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  function generate() {
    const trace: SolverTrace = { objective: [], matrix: [], limits: [], labels: [], steps: [] };
    const result = calculatePlan(props.portfolio, props.banks, props.quotes, props.holdings, trace);
    setReport({ ...props, trace, result, time: new Date().toLocaleTimeString() });
  }
  const stale = report && (report.portfolio !== props.portfolio || report.banks !== props.banks || report.quotes !== props.quotes || report.holdings !== props.holdings || report.amountUnit !== props.amountUnit);
  const p = report?.portfolio;
  const stress = p ? redemptionStress(p) : null;
  const tex = (n: number) => Number.isFinite(n) ? String(Number(n.toPrecision(10))) : String.raw`\text{—}`;
  const f = (n: number) => number(n, 8);
  const section = 'space-y-3 border-b border-border py-5';
  return <>
    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => { generate(); setOpen(true); }}><Sigma />{text('数学原理', 'Mathematics')}</Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{text('数学原理', 'Mathematics')}</SheetTitle>
          <SheetDescription>{text('按当前输入独立重算，展示真实约束和求解记录；不修改配置结果。', 'Recalculates current inputs to show actual constraints and solver steps without changing the allocation result.')}</SheetDescription>
        </SheetHeader>
        {report && p && <div className="px-5 pb-6 text-sm">
          <p className="text-muted-foreground">{report.time} · {t(report.amountUnit)}</p>
          {stale && <output className="my-3 block text-amber-700">{text('输入已变化，以下为上次展开时的快照。', 'Inputs changed; this report shows the previous snapshot.')}</output>}
          <Button variant="outline" onClick={generate}>{text('更新计算记录', 'Refresh calculation')}</Button>
          <section className={section}>
            <h3 className="font-semibold">{text('1 · 输入与口径', '1 · Inputs and conventions')}</h3>
            <p>{text(p.inputMode === 'simple' ? '简易模式：汇总输入，不校验集中度。' : p.inputMode === 'aggregate' ? '汇总期限模式：WAM/WAL 手填，其余由持仓推导。' : '持仓模式：指标由持仓推导。', p.inputMode === 'simple' ? 'Simple: manual aggregates; concentration excluded.' : p.inputMode === 'aggregate' ? 'Aggregate terms: manual WAM/WAL; other metrics from holdings.' : 'Holdings: metrics derived from positions.')}</p>
            <MathFormula formula={String.raw`A=\sum_i h_i,\qquad Y_0=\frac{\sum_i h_i y_i}{A}`} />
            <MathFormula formula={String.raw`\mathrm{WAM}_0=\frac{\sum_i h_i w_i}{A},\qquad\mathrm{WAL}_0=\frac{\sum_i h_i l_i}{A}`} />
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <span>A = {f(p.aum)}</span><span>Y₀ = {f(p.ytm)}%</span>
              <span>WAM₀ = {f(p.wam)}</span><span>WAL₀ = {f(p.wal)}</span>
              <span>{p.tradeMode === 'subscription' ? 'S' : 'D'} = {f(p.transactionAmount)}</span><span>C = {f(p.cashBufferAmount ?? 0)}</span>
              <span>WAM ≤ {f(Math.min(p.maxWam ?? SFC_MAX_WAM_DAYS, SFC_MAX_WAM_DAYS))}</span>
              <span>WAL ≤ {f(Math.min(p.maxWal ?? SFC_MAX_WAL_DAYS, SFC_MAX_WAL_DAYS))}</span>
            </div>
            <p className="text-xs text-muted-foreground">{text('金额沿用所选单位，期限单位为天，收益率采用百分点。', 'Amounts use the selected unit; terms are days; yields use percentage points.')}</p>
            <details><summary>{text('持仓输入', 'Holding inputs')} ({report.holdings.length})</summary>
              {report.holdings.map(h => <p key={h.id} className="mt-2 font-mono text-xs">{h.name}: {f(h.amount)} · YTM {f(h.ytm ?? Number.NaN)}% · WAM {f(h.wamDays ?? h.walDays ?? Number.NaN)} · WAL {f(h.walDays ?? Number.NaN)}</p>)}
            </details>
            <details><summary>{text('机构敞口与限额', 'Institution exposures and limits')}</summary>{report.banks.map(b => <p key={b.id} className="mt-2 font-mono text-xs">{b.name}: E={f(b.currentExposure)} · limit={f(b.limitPct)}%</p>)}</details>
            <details><summary>{text('报价变量', 'Quote variables')} ({report.quotes.length})</summary>
              {report.quotes.map((q,i) => <p key={q.id} className="mt-2 font-mono text-xs">z{i+1}: {q.name} · {report.banks.find(b => b.id === q.bankId)?.name} · r={f(q.rate)}% · WAM={f(quoteWamDays(q))} · WAL={f(q.walDays)} · cap={q.cap === null ? '∞' : f(q.cap)}</p>)}
            </details>
          </section>
          <section className={section}>
            <h3 className="font-semibold">{text('2 · 公式与约束', '2 · Formulas and constraints')}</h3>
            <div className="divide-y divide-border rounded-md border border-border px-4">
              {p.tradeMode === 'subscription' ? <>
                <div className="py-3"><p className="text-xs font-medium text-muted-foreground">{text('目标 · 最大化组合收益', 'Objective · Maximize portfolio yield')}</p>
                  <MathFormula formula={String.raw`\max_{\boldsymbol{x}}\;Y=\frac{A Y_0+\sum_{i=1}^{n}x_i r_i}{P}`} />
                  <MathFormula formula={String.raw`P=A+S,\qquad z_i=\frac{x_i}{P}`} />
                  <MathFormula formula={String.raw`P=${tex(p.aum)}+${tex(p.transactionAmount)}=${tex(p.aum+p.transactionAmount)}`} />
                </div>
                <div className="py-3"><p className="text-xs font-medium text-muted-foreground">{text('期限约束', 'Term constraints')}</p>
                  <MathFormula formula={String.raw`\begin{aligned}\mathrm{WAM}&=\frac{A\,\mathrm{WAM}_0+\sum_i x_i w_i}{P}\leq ${tex(Math.min(p.maxWam ?? SFC_MAX_WAM_DAYS,SFC_MAX_WAM_DAYS))}\\[6pt]\mathrm{WAL}&=\frac{A\,\mathrm{WAL}_0+\sum_i x_i l_i}{P}\leq ${tex(Math.min(p.maxWal ?? SFC_MAX_WAL_DAYS,SFC_MAX_WAL_DAYS))}\end{aligned}`} />
                </div>
                <div className="py-3"><p className="text-xs font-medium text-muted-foreground">{text('资金与报价额度', 'Funding and quote caps')}</p>
                  <MathFormula formula={String.raw`x_i\geq 0,\qquad\sum_i x_i\leq S,\qquad x_i\leq\mathrm{cap}_i`} />
                </div>
                {p.inputMode !== 'simple' && <><div className="py-3"><p className="text-xs font-medium text-muted-foreground">{text('现金压力', 'Cash stress')}</p>
                  <MathFormula formula={String.raw`R=A\frac{s}{100}\;\;\text{or}\;\;R=R_{\mathrm{input}},\qquad R\leq C`} />
                  <MathFormula formula={String.raw`P_{\mathrm{stress}}=P-R=${tex(stress!.baseAum)}-${tex(stress!.redemption)}=${tex(stress!.stressedAum)}>0`} />
                </div>
                <div className="py-3"><p className="text-xs font-medium text-muted-foreground">{text('机构、实体与集团集中度', 'Institution, entity and group concentration')}</p>
                  <MathFormula formula={String.raw`E_j+\sum_{i\in\mathcal{I}_j}x_i\leq P_{\mathrm{stress}}\frac{L_j}{100}`} />
                </div>
                </>}
              </> : <div className="py-3"><p className="text-xs font-medium text-muted-foreground">{text('同比例赎回', 'Pro rata redemption')}</p>
                <MathFormula formula={String.raw`P=A-D=${tex(p.aum)}-${tex(p.transactionAmount)}=${tex(p.aum-p.transactionAmount)}>0`} />
                <MathFormula formula={String.raw`h_{i,\mathrm{after}}=h_i\left(1-\frac{D}{A}\right)`} />
                <MathFormula formula={String.raw`Y_{\mathrm{after}}=Y_0,\quad\mathrm{WAM}_{\mathrm{after}}=\mathrm{WAM}_0,\quad\mathrm{WAL}_{\mathrm{after}}=\mathrm{WAL}_0`} />
              </div>}
            </div>
            <p className="text-xs text-muted-foreground">{text('集中度按机构、同一实体及集团分别约束，简易模式跳过。未配置资金按零收益、零期限现金处理；压力仅调整集中度分母，不改变收益与期限分母。', 'Concentration applies separately to institutions, entities and groups, except in simple mode. Unallocated funds have zero yield and term. Stress changes the concentration denominator only.')}</p>
            <details><summary>{text('实际 LP 约束矩阵', 'Actual LP constraint matrix')} ({report.trace.matrix.length})</summary>
              <p className="my-2 text-xs">{text('变量为 zᵢ；下列系数与右端项直接来自本次求解器输入。', 'Variables are zᵢ; coefficients and limits come directly from this solver run.')}</p>
              <div className="overflow-x-auto"><pre className="text-xs leading-6">{report.trace.matrix.map((row,i) => `${i+1}. ${report.trace.labels[i]}: [${row.map(f).join(', ')}] · z ≤ ${f(report.trace.limits[i])}`).join('\n')}</pre></div>
            </details>
          </section>
          <section className={section}>
            <h3 className="font-semibold">{text('3 · 实际迭代', '3 · Actual iterations')}</h3>
            <p>{text('申购采用单纯形法：从松弛变量初始解出发，逐次换基，直到没有改善方向。最多 2000 次；显示数值已四舍五入。', 'Subscriptions use simplex: start with slack variables and pivot until no improving direction remains. Limit: 2,000 iterations. Displayed values are rounded.')}</p>
            {report.trace.steps.length ? <div className="max-h-72 overflow-auto"><table className="w-full text-xs"><thead><tr><th>#</th><th>{text('入基', 'Enter')}</th><th>{text('出基', 'Leave')}</th><th>Σ zᵢrᵢ</th></tr></thead><tbody>{report.trace.steps.map(step => {
              const variable = (index: number) => index < report.quotes.length ? `z${index+1}` : `s${index-report.quotes.length+1}`;
              return <tr key={step.iteration}><td>{step.iteration}</td><td>{variable(step.entering)}</td><td>{variable(step.leaving)}</td><td>{f(step.objective)}</td></tr>;
            })}</tbody></table></div> : <p>{text('本次没有换基记录：可能在校验阶段停止、初始解已最优，或使用同比例赎回。', 'No pivots: validation may have stopped the run, the initial solution may be optimal, or the run uses pro rata redemption.')}</p>}
            <p className="text-xs text-muted-foreground">{text('z 为报价变量，s 为上方矩阵对应行的松弛变量。记录仅保存在当前打开的面板中。', 'z denotes a quote variable; s denotes slack for the corresponding matrix row. Records remain in panel memory only.')}</p>
          </section>
          <section className={section}>
            <h3 className="font-semibold">{text('4 · 本次结果', '4 · Run result')}</h3>
            {report.result.ok ? <>
              <p className="font-mono">YTM {f(report.result.postYtm)}% · WAM {f(report.result.postWam)} · WAL {f(report.result.postWal)}</p>
              {report.result.tradeMode === 'subscription' && <><p>{text('未配置金额', 'Unallocated')}: {f(report.result.unallocated)}</p>{report.result.allocations.map(q => <p key={q.id}>{q.name}: {f(q.amount)}</p>)}</>}
              <p>{text('已建模约束通过', 'Modeled constraints satisfied')}</p>
              {report.result.tradeMode === 'subscription' && <details><summary>{text('逐行约束余量（右端项 − 实际值）', 'Constraint slack (limit − actual)')}</summary><pre className="overflow-x-auto mt-2 text-xs leading-6">{report.trace.matrix.map((row, i) => {
                const outcome = report.result;
                if (!outcome.ok || outcome.tradeMode !== 'subscription') return '';
                const lhs = row.reduce((sum, coefficient, j) => sum + coefficient * (outcome.allocations.find(q => q.id === report.quotes[j].id)?.amount ?? 0) / outcome.postAum, 0);
                return `${i+1}. ${report.trace.labels[i]}: ${f(report.trace.limits[i])} − ${f(lhs)} = ${f(report.trace.limits[i] - lhs)}`;
              }).join('\n')}</pre></details>}
            </> : report.result.messages.map((message,i) => <p key={i} className="text-destructive">{t(message)}</p>)}
          </section>
          <details className="py-4"><summary>{text('收益前沿与反推算法说明', 'Frontier and reverse-search algorithms')}</summary><p className="mt-3">{text('前沿逐点调整所选期限上限并求最大 YTM；平台起点最多二分 48 次。目标 YTM 反推最多二分 52 次，并对显示期限向上取整后重新求解。这是算法说明，上面的实际记录只对应本次配置求解。', 'The frontier varies the selected term cap and maximizes YTM at each point; plateau search uses up to 48 bisections. Target-YTM search uses up to 52 bisections, then rounds the displayed cap upward and solves again. This describes the algorithm; the actual log above covers this allocation run only.')}</p></details>
        </div>}
      </SheetContent>
    </Sheet>
  </>;
}
