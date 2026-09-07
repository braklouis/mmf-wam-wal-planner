'use client';
// Vite's ?worker transform supplies the default constructor.
// oxlint-disable-next-line import/default
import ReviewWorker from '@/lib/deep-review.worker.ts?worker';
import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useI18n } from '@/components/i18n-provider';
import { number } from '@/lib/planner';
import type { DeepReview, ReviewInput } from '@/lib/deep-review';

export function DeepReviewButton({ dirty, ...input }: ReviewInput & { dirty: boolean }) {
  const { t, locale } = useI18n();
  const text=(cn:string,en:string)=>locale==='en'?en:t(cn);
  const worker=useRef<Worker|null>(null);
  const [open,setOpen]=useState(false);
  const [state,setState]=useState<{source:ReviewInput;report?:DeepReview;error?:boolean}|null>(null);
  useEffect(()=>()=>worker.current?.terminate(),[]);
  const stale=state && (dirty||state.source.portfolio!==input.portfolio||state.source.banks!==input.banks||state.source.quotes!==input.quotes||state.source.result!==input.result);
  function run(){
    setOpen(true);worker.current?.terminate();setState({source:input});
    try{
      const task=new ReviewWorker();worker.current=task;
      task.onmessage=(event:MessageEvent<{report?:DeepReview;error?:boolean}>)=>{if(worker.current!==task)return;setState({source:input,...event.data});task.terminate();worker.current=null;};
      task.onerror=()=>{if(worker.current!==task)return;setState({source:input,error:true});task.terminate();worker.current=null;};
      task.postMessage(input);
    }catch{setState({source:input,error:true});}
  }
  const report=state?.report;
  return <>
    <Button size="lg" variant="outline" disabled={dirty||!input.result.ok} onClick={run} title={text('先计算当前配置，再独立复核', 'Calculate the current allocation before reviewing')}><ShieldCheck />{text('深度复核','Deep review')}</Button>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl overflow-y-auto"><SheetHeader>
      <SheetTitle>{text('深度复核','Deep review')}</SheetTitle>
      <SheetDescription>{text('独立重算与数值最优性验证，仅针对本次输入快照。','Independent recalculation and numerical optimality verification for this input snapshot.')}</SheetDescription>
    </SheetHeader><div className="px-5 pb-6 space-y-4 text-sm">
      {stale?<p className="text-amber-700">{text('输入或结果已变化，本次复核已过期。','Inputs or results changed; this review is stale.')}</p>:null}
      {!state?.error&&!report?<output>{text('正在独立复核…','Reviewing independently…')}</output>:null}
      {state?.error?<div className="space-y-3"><p>{text('复核程序未能运行，这不代表配置违反约束。','The review could not run; this does not indicate a constraint violation.')}</p><Button variant="outline" disabled={dirty||!input.result.ok} onClick={run}>{text('重试','Retry')}</Button></div>:null}
      {report&&<>
        <p className="font-semibold">{text(report.feasible?'约束复核通过':'发现差异或无法验证',report.feasible?'Constraints verified':'Discrepancy found or unable to verify')}</p>
        <p>{text(report.optimal?'最优性：数值验证通过':'最优性：未能完成证明',report.optimal?'Optimality: numerically verified':'Optimality: not established')}</p>
        <p className="text-xs text-muted-foreground">{text('独立构建约束，通过对偶上界检查收益差距。使用双精度数值容差，不是任意精度证明；按获配产品寻找证书，再核验全部报价；最多检查 5000 个候选基，获配产品超过 128 个时仅检查基础收益上界。','Constraints are independently constructed; a dual upper bound checks the yield gap. Uses double-precision tolerances, not an arbitrary-precision proof. Searches using allocated products and checks every quote. Up to 5,000 candidate bases; above 128 allocated products only the basic yield bound is checked.')}</p>
        {report.gap!==null&&<p>YTM {text('上界','upper bound')}: {number(report.upperYield!,8)}% · {text('差距（百分点）','gap (percentage points)')}: {number(report.gap,10)}</p>}
        <p>{text('候选基检查次数','Candidate bases checked')}: {report.attempts}</p>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th>{text('校验','Check')}</th><th>{text('实际值','Actual')}</th><th>{text('上限／预期','Limit / expected')}</th><th>{text('状态','Status')}</th></tr></thead><tbody>{report.checks.map((check,i)=><tr key={i}><td className="py-2">{check.label}</td><td>{number(check.actual,9)}</td><td>{number(check.limit,9)}</td><td className={check.passed?'':'text-destructive'}>{check.passed?'✓':'×'}</td></tr>)}</tbody></table></div>
        <p className="text-xs text-muted-foreground">{text('约束矩阵使用交易后 AUM 归一化金额。复核不验证报价真实性或未建模规则。','Constraint amounts are normalized by post-trade AUM. Review does not verify quote accuracy or unmodeled rules.')}</p>
      </>}
    </div></SheetContent></Sheet>
  </>;
}
