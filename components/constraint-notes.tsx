type Note = 'term' | 'entity' | 'group' | 'stress' | 'quote' | 'input';
const notes: Record<Note, { reference: string; original?: string; explanation: string }> = {
  term: { reference: '［1］SFC《单位信托及互惠基金守则》8.2(f)', original: '「60 天」「120 天」', explanation: '组合 WAM 不超过60天、WAL不超过120天。填写更低上限时，按较低值计算；留空仍应用监管上限。' },
  entity: { reference: '［2］SFC 8.2(g)、8.2(g)(i)', original: '「10%」「可增至 25%」', explanation: '同一实体的金融工具及存款合计一般不超过NAV的10%。具规模的财务机构且投资总额不超过其股本及非分派资本储备的10%时，可提高至25%；具体适用值由用户填写。' },
  group: { reference: '［3］SFC 8.2(g)(a)及注释(2)', original: '「20%」', explanation: '同一集团内实体合计一般不超过NAV的20%。满足具规模财务机构及相关资本10%限制等条件时可提高至25%。各机构共同占用集团额度。' },
  stress: { reference: '［4］SFC 8.2(n)注释(3)', original: '「定期進行壓力測試」', explanation: '守则要求流动性压力测试。此处压力比例、5%现金参考目标及压力后额度公式是本工具的设置，不是SFC规定的固定数值，也不等同每日／每周流动资产要求。' },
  quote: { reference: '［设置］报价额度', explanation: '银行报价或用户自行设置的本次可投金额上限，不是SFC固定额度。留空表示不设报价额度，0表示不可投；机构、集团和期限限制仍独立适用。' },
  input: { reference: '［口径］数据校验', explanation: '金额非负、持仓合计与AUM一致等属于本工具的数据校验；集中度计算以AUM等于NAV为前提。' },
};
export function ConstraintNotes({ items }: { items: Note[] }) {
  return <div className="space-y-2 border-t border-border/60 px-5 py-3 text-xs leading-5 text-muted-foreground" aria-label="限制依据与说明">
    {items.map(item => <p key={item}><span className="font-medium">{notes[item].reference}</span>{notes[item].original && <> · 原文摘录：{notes[item].original}</>}<br />{notes[item].explanation}</p>)}
  </div>;
}
