import type { Portfolio, ModelBank, Quote, ModelResult } from './planner-types.ts';

export type ReviewInput = { portfolio: Portfolio; banks: ModelBank[]; quotes: Quote[]; result: ModelResult };
export type ReviewCheck = { label: string; actual: number; limit: number; passed: boolean };
export type DeepReview = { checks: ReviewCheck[]; feasible: boolean; optimal: boolean; upperYield: number | null; gap: number | null; attempts: number };
const tolerance = (a: number, b: number) => 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));

// Separate implementation: no planner solver, constraint builder or aggregate helpers.
export function deepReview({ portfolio: p, banks, quotes, result }: ReviewInput): DeepReview {
  const checks: ReviewCheck[] = [];
  const check = (label: string, actual: number, limit: number, equal = false) => {
    checks.push({ label, actual, limit, passed: Number.isFinite(actual) && Number.isFinite(limit) && (equal ? Math.abs(actual-limit) : actual-limit) <= tolerance(actual,limit) });
  };
  const incomplete = (): DeepReview => ({ checks, feasible: false, optimal: false, upperYield: null, gap: null, attempts: 0 });
  if (!result.ok || result.tradeMode !== 'subscription' || p.tradeMode !== 'subscription') return incomplete();
  const P = p.aum+p.transactionAmount;
  if (!Number.isFinite(P) || P <= 0) return incomplete();
  check('AUM',result.postAum,P,true);
  check('S',result.transactionAmount,p.transactionAmount,true);
  check('Quote IDs',new Set(quotes.map(q=>q.id)).size,quotes.length,true);
  check('Allocation IDs',new Set(result.allocations.map(q=>q.id)).size,result.allocations.length,true);
  for (const a of result.allocations) check(`ID · ${a.name}`,quotes.some(q=>q.id===a.id)?0:1,0);
  const x=quotes.map(q=>result.allocations.find(a=>a.id===q.id)?.amount??0);
  const z=x.map(a=>a/P);
  const sum=(values:number[])=>values.reduce((a,b)=>a+b,0);
  const dot=(a:number[],b:number[])=>sum(a.map((v,i)=>v*b[i]));
  const w=quotes.map(q=>q.wamDays??q.walDays), l=quotes.map(q=>q.walDays), c=quotes.map(q=>q.rate);
  const y=p.aum/P*p.ytm+dot(z,c), wam=p.aum/P*p.wam+dot(z,w), wal=p.aum/P*p.wal+dot(z,l);
  check('YTM',result.postYtm,y,true);check('WAM',result.postWam,wam,true);check('WAL',result.postWal,wal,true);
  check('Cash',result.unallocated,p.transactionAmount-sum(x),true);check('Cash ≥ 0',-result.unallocated,0);
  const A:number[][]=[],b:number[]=[];
  const row=(label:string,coeff:number[],limit:number)=>{A.push(coeff);b.push(limit);check(label,dot(coeff,z),limit);};
  row('Σ x ≤ S',quotes.map(()=>1),p.transactionAmount/P);
  row('WAM ≤ max',w,Math.min(p.maxWam??60,60)-p.aum/P*p.wam);
  row('WAL ≤ max',l,Math.min(p.maxWal??120,120)-p.aum/P*p.wal);
  quotes.forEach((q,i)=>{
    row(`${q.name} ≥ 0`,quotes.map((_,j)=>i===j?-1:0),0);
    if(q.cap!==null) row(`${q.name} ≤ cap`,quotes.map((_,j)=>i===j?1:0),q.cap/P);
  });
  if(p.inputMode!=='simple'){
    const R=p.redemptionStressAmount??p.aum*(p.redemptionStressPct??0)/100;
    check('R ≤ cash',R,p.cashBufferAmount??0);check('R ≥ 0',-R,0);check('R < A',R,p.aum-Number.EPSILON);
    const stressed=P-R;
    const groups=new Map<string,{name:string;ids:string[];exposure:number;limit:number}>();
    for(const bank of banks){
      const coeff=quotes.map(q=>q.bankId===bank.id?1:0);
      row(bank.name,coeff,(stressed*bank.limitPct/100-bank.currentExposure)/P);
      for(const kind of ['entity','group'] as const){
        const name=kind==='entity'?(bank.entityName?.trim()||bank.name):bank.groupName?.trim();if(!name)continue;
        const key=kind+':'+name.trim().toLowerCase();
        const limit=kind==='entity'?bank.limitPct:bank.groupLimitPct??20;
        const g=groups.get(key)??{name,ids:[],exposure:0,limit};g.ids.push(bank.id);g.exposure+=bank.currentExposure;g.limit=Math.min(g.limit,limit);groups.set(key,g);
      }
      const out=result.banks.find(item=>item.id===bank.id);
      check(`${bank.name} · exposure`,out?.finalExposure??NaN,bank.currentExposure+dot(coeff,x),true);
    }
    for(const g of groups.values())row(g.name,quotes.map(q=>g.ids.includes(q.bankId)?1:0),(stressed*g.limit/100-g.exposure)/P);
  }
  const feasible=checks.every(item=>item.passed);
  if(!feasible)return incomplete();
  const n=quotes.length;
  if(n===0)return{checks,feasible,optimal:true,upperYield:y,gap:0,attempts:0};
  // Recover a dual bound from active rows using independent Gaussian elimination.
  // Any nonnegative multipliers yield an upper bound after residual correction,
  // because each z_i lies in [0, S/P]. Never infer optimality from feasibility.
  const active=A.map((row,i)=>({i,slack:Math.abs(b[i]-dot(row,z))})).filter(v=>v.slack<=1e-7*Math.max(1,Math.abs(b[v.i]))).map(v=>v.i);
  // Solve only equalities for positive allocations. Zero-allocation quotes
  // remain in the full residual check below; none are discarded from the LP.
  const support=z.flatMap((value,i)=>value>0?[i]:[]);
  const candidates=active.filter(i=>support.some(j=>A[i][j]!==0));
  const dimension=support.length;
  let attempts=0,upper=p.transactionAmount/P*Math.max(0,...c);
  const budget=5000;
  if(dimension>0 && dimension<=128 && candidates.length>=dimension){
    const selected:number[]=[];
    function search(start:number):void{
      if(attempts>=budget || upper-dot(c,z)<=1e-9)return;
      if(selected.length===dimension){
        attempts++;
        const system=support.map(i=>[...selected.map(j=>A[j][i]),c[i]]);
        for(let k=0;k<dimension;k++){
          let pivot=k;for(let r=k+1;r<dimension;r++)if(Math.abs(system[r][k])>Math.abs(system[pivot][k]))pivot=r;
          if(Math.abs(system[pivot][k])<1e-12)return;
          [system[k],system[pivot]]=[system[pivot],system[k]];
          const divisor=system[k][k];for(let j=k;j<=dimension;j++)system[k][j]/=divisor;
          for(let r=0;r<dimension;r++)if(r!==k){const factor=system[r][k];for(let j=k;j<=dimension;j++)system[r][j]-=factor*system[k][j];}
        }
        const dual=system.map(row=>Math.max(0,row[dimension]));
        if(dual.some(v=>!Number.isFinite(v)))return;
        const residual=c.map((v,i)=>Math.max(0,v-sum(selected.map((j,k)=>A[j][i]*dual[k]))));
        const bound=sum(selected.map((j,k)=>b[j]*dual[k]))+p.transactionAmount/P*sum(residual);
        if(Number.isFinite(bound))upper=Math.min(upper,bound);
        return;
      }
      for(let k=start;k<=candidates.length-(dimension-selected.length);k++){selected.push(candidates[k]);search(k+1);selected.pop();if(attempts>=budget||upper-dot(c,z)<=1e-9)break;}
    }
    search(0);
  }
  const gap=Number.isFinite(upper)?upper-dot(c,z):null;
  return{checks,feasible,optimal:gap!==null&&gap>=-1e-8&&gap<=1e-7,upperYield:gap===null?null:p.aum/P*p.ytm+upper,gap,attempts};
}
