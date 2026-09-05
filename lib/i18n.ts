export const SUPPORTED_LOCALES = ['zh-CN', 'zh-HK', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_THEMES = ['light', 'dark'] as const;
export type Theme = (typeof SUPPORTED_THEMES)[number];

export const DEFAULT_LOCALE: Locale = 'zh-CN';
export const DEFAULT_THEME: Theme = 'light';
export const LOCALE_STORAGE_KEY = 'mmf-planner.locale.v1';
export const THEME_STORAGE_KEY = 'mmf-planner.theme.v1';

export const localeOptions: ReadonlyArray<{
  value: Locale;
  shortLabel: string;
  nativeLabel: string;
}> = [
  { value: 'zh-CN', shortLabel: '简', nativeLabel: '简体中文' },
  { value: 'zh-HK', shortLabel: '繁', nativeLabel: '繁體中文' },
  { value: 'en', shortLabel: 'EN', nativeLabel: 'English' },
];

export function parseLocale(value: unknown): Locale | null {
  return typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
    ? (value as Locale)
    : null;
}

export function parseTheme(value: unknown): Theme | null {
  return typeof value === 'string' &&
    (SUPPORTED_THEMES as readonly string[]).includes(value)
    ? (value as Theme)
    : null;
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function readStoredPreference<T>(
  storage: ReadableStorage | null,
  key: string,
  parse: (value: unknown) => T | null,
  fallback: T,
): T {
  if (!storage) return fallback;
  try {
    return parse(storage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredPreference(
  storage: WritableStorage | null,
  key: string,
  value: string,
) {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function htmlLang(locale: Locale) {
  return locale;
}

const traditionalCharacters: Record<string, string> = {
  万: '萬',
  与: '與',
  专: '專',
  业: '業',
  严: '嚴',
  个: '個',
  为: '為',
  么: '麼',
  义: '義',
  书: '書',
  买: '買',
  产: '產',
  仅: '僅',
  仓: '倉',
  从: '從',
  优: '優',
  会: '會',
  体: '體',
  余: '餘',
  侧: '側',
  价: '價',
  参: '參',
  发: '發',
  变: '變',
  号: '號',
  后: '後',
  吗: '嗎',
  启: '啟',
  员: '員',
  响: '響',
  围: '圍',
  图: '圖',
  国: '國',
  场: '場',
  坏: '壞',
  处: '處',
  备: '備',
  复: '復',
  头: '頭',
  实: '實',
  对: '對',
  导: '導',
  尽: '盡',
  层: '層',
  币: '幣',
  师: '師',
  应: '應',
  开: '開',
  异: '異',
  张: '張',
  当: '當',
  录: '錄',
  径: '徑',
  总: '總',
  恢: '恢',
  恶: '惡',
  户: '戶',
  执: '執',
  扩: '擴',
  择: '擇',
  换: '換',
  据: '據',
  损: '損',
  数: '數',
  断: '斷',
  无: '無',
  时: '時',
  显: '顯',
  暂: '暫',
  术: '術',
  条: '條',
  来: '來',
  标: '標',
  样: '樣',
  档: '檔',
  检: '檢',
  权: '權',
  汇: '匯',
  测: '測',
  浏: '瀏',
  涉: '涉',
  净: '淨',
  点: '點',
  现: '現',
  环: '環',
  电: '電',
  畅: '暢',
  监: '監',
  盘: '盤',
  确: '確',
  种: '種',
  稳: '穩',
  线: '線',
  组: '組',
  经: '經',
  绑: '綁',
  结: '結',
  统: '統',
  续: '續',
  缩: '縮',
  缓: '緩',
  编: '編',
  联: '聯',
  获: '獲',
  见: '見',
  规: '規',
  览: '覽',
  计: '計',
  认: '認',
  让: '讓',
  设: '設',
  证: '證',
  评: '評',
  该: '該',
  误: '誤',
  请: '請',
  调: '調',
  负: '負',
  资: '資',
  赎: '贖',
  还: '還',
  这: '這',
  进: '進',
  过: '過',
  选: '選',
  逻: '邏',
  额: '額',
  页: '頁',
  类: '類',
  风: '風',
  驱: '驅',
  验: '驗',
  黄: '黃',
  单: '單',
  项: '項',
  达: '達',
  输: '輸',
  没: '沒',
  关: '關',
  读: '讀',
  写: '寫',
  将: '將',
  删: '刪',
  际: '際',
  满: '滿',
  须: '須',
  则: '則',
  动: '動',
  务: '務',
  库: '庫',
  网: '網',
  货: '貨',
  语: '語',
  界: '界',
  兑: '兌',
  载: '載',
  划: '劃',
  刘: '劉',
  报: '報',
  并: '並',
  补: '補',
  采: '採',
  触: '觸',
  错: '錯',
  归: '歸',
  级: '級',
  继: '繼',
  间: '間',
  减: '減',
  较: '較',
  紧: '緊',
  称: '稱',
  构: '構',
  购: '購',
  荐: '薦',
  击: '擊',
  机: '機',
  记: '記',
  决: '決',
  绝: '絕',
  宽: '寬',
  里: '裡',
  连: '連',
  敛: '斂',
  内: '內',
  区: '區',
  舍: '捨',
  属: '屬',
  亿: '億',
  银: '銀',
  预: '預',
  账: '賬',
  终: '終',
  准: '準',
  质: '質',
  约: '約',
  边: '邊',
  于: '於',
  适: '適',
  释: '釋',
  随: '隨',
  隐: '隱',
};

const englishCopy: Record<string, string> = {
  赎回压力比例: 'Redemption stress percentage',
  赎回压力金额: 'Redemption stress amount',
  '比例与金额自动换算，以最后编辑的一项为准。调整 AUM 时，该项保持不变。':
    'Percentage and amount convert automatically. The last edited value stays fixed when AUM changes.',

  赎回压力: 'Redemption stress',
  先留出赎回的空间: 'Make room for redemptions',
  无法计算: 'Unable to calculate',
  现金恰好用尽: 'Cash fully used',
  现金可覆盖: 'Covered by cash',
  '压力比例以当前 AUM 为基数；仅动用现有现金，机构敞口按不减少保守测算。':
    'Stress is a percentage of current AUM. Only existing cash funds redemptions; institution exposures conservatively remain unchanged.',
  手动赎回压力: 'Redemption stress',
  实际现金缓冲: 'Actual cash buffer',
  '来自现金持仓，参考目标 5%': 'From cash holdings; reference target 5%',
  压力赎回金额: 'Stressed redemption',
  '压力后 AUM': 'Stressed AUM',
  '配置基准 AUM 减去压力赎回': 'Allocation AUM less stressed redemption',
  现金缺口: 'Cash shortfall',
  压力后剩余现金: 'Remaining cash after stress',
  '需要识别 T+0 可赎回资产': 'Identify assets redeemable on T+0',
  不包含定存及未来到期资产: 'Excludes term deposits and future maturities',
  原金额上限: 'Original amount limit',
  压力后上限: 'Stressed amount limit',
  最多新增: 'Available to add',
  已超出: 'Exceeded by',
  '金额单位：': 'Amount unit: ',
  '压力后上限用于申购优化、收益前沿和目标收益反推；不改变机构适用上限比例。':
    'Stressed limits apply to allocation, frontiers and target-yield search. Applicable institution limit percentages remain unchanged.',
  管理现金持仓: 'Manage cash holdings',
  持仓类型: 'Holding type',
  非现金资产: 'Non-cash asset',
  '现金 · 计入缓冲': 'Cash \u00b7 included in buffer',
  已触及配置金额上限: 'Allocation amount limit reached',
  压力后: 'After stress',
  压力后额度上限: 'Stressed amount limit',
  现金缓冲: 'Cash buffer',
  其他不计单一实体集中度资产:
    'Other assets excluded from institution concentration',
  '用其他资产补足（不计入现金缓冲）':
    'Balance with other assets (excluded from cash buffer)',
  '赎回压力必须为 0% 至小于 100% 的有效数字。':
    'Redemption stress must be a valid percentage from 0% to less than 100%.',
  '现金缓冲金额无效，请检查当前持仓。':
    'Invalid cash buffer. Check current holdings.',
  '无法计算：压力赎回超过现金缓冲，需要 T+0 可赎回资产及额度信息。':
    'Unable to calculate: stressed redemption exceeds cash. T+0 redeemable assets and available amounts are required.',
  '压力后 AUM 必须大于 0。': 'Stressed AUM must be greater than zero.',

  'MMF 配置台': 'MMF Planner',
  '基于收益、期限与机构敞口约束的货币市场基金配置规划器':
    'Money market fund allocation planner with yield, maturity and institution exposure constraints',
  界面语言: 'Interface language',
  切换至浅色模式: 'Switch to light mode',
  切换至深色模式: 'Switch to dark mode',
  浅色: 'Light',
  深色: 'Dark',
  本地草案: 'Local draft',
  '集中维护持仓、机构归属与集中度上限':
    'Maintain holdings, institution assignments and concentration limits',
  测算同比例赎回后的组合与机构敞口:
    'Estimate the portfolio and institution exposures after a pro rata redemption',
  '在期限与机构集中度约束内，寻找最高收益配置':
    'Maximize yield within maturity and institution concentration constraints',
  'WAM 利率敏感度 · WAL 最终到期':
    'WAM interest-rate sensitivity · WAL final maturity',
  '金额字段 = 绝对金额 · % 字段 = 占比':
    'Amount fields = absolute amounts · % fields = portfolio shares',
  配置台工作区: 'Planner workspace',
  配置测算: 'Allocation planner',
  当前持仓与机构: 'Holdings & institutions',
  '持仓、合作机构库及集中度设置在此统一维护':
    'Manage holdings, the institution library and concentration settings here',
  '组合参数、市场报价与优化结果':
    'Portfolio inputs, market quotes and optimization results',

  '01 · 组合参数': '01 · Portfolio inputs',
  当前组合与目标: 'Current portfolio & targets',
  统一金额单位: 'Amount unit',
  元: 'units',
  万元: '10K units',
  百万元: 'million units',
  亿元: '100M units',
  '交易后 AUM': 'Post-trade AUM',
  今日资金方向: "Today's cash flow",
  第一版按当前组合所有资产同比例赎回:
    'This version redeems all current holdings pro rata',
  将新增资金配置到今日可投产品:
    "Allocate new funds across today's investable products",
  选择今日资金方向: "Select today's cash-flow direction",
  净申购: 'Net subscription',
  净赎回: 'Net redemption',
  '当前 AUM（绝对金额）': 'Current AUM (absolute amount)',
  '净赎回金额（绝对金额）': 'Net redemption (absolute amount)',
  '新增待配置资金（绝对金额）': 'New funds to allocate (absolute amount)',
  '当前 AUM': 'Current AUM',
  '当前 YTM': 'Current YTM',
  '当前 WAM': 'Current WAM',
  '当前 WAL': 'Current WAL',
  'WAM 上限': 'WAM limit',
  'WAL 上限': 'WAL limit',
  'WAM 上限（合规检验）': 'WAM limit (compliance check)',
  'WAL 上限（合规检验）': 'WAL limit (compliance check)',
  可留空: 'Optional',
  天: ' days',
  '所有金额都填写绝对金额并使用同一单位。交易后 AUM = 当前 AUM − 净赎回金额。当前版本假设所有资产及机构敞口按相同比例缩减，因此 YTM、WAM、WAL 与机构占比保持不变；已有超限也不会被修复。':
    'Enter all amounts as absolute values in the same unit. Post-trade AUM = current AUM − net redemption. This version reduces every holding and institution exposure by the same proportion, so YTM, WAM, WAL and institution shares remain unchanged; any existing breach also remains unresolved.',
  '所有金额都填写绝对金额并使用同一单位。交易后 AUM = 当前 AUM + 新增待配置资金；新增资金尚未包含在当前 AUM 中。当前 WAM/WAL 是事实快照，超标时仍可录入以测算修复方案；目标留空时仍自动执行 SFC 监管上限 WAM 60 天、WAL 120 天。':
    'Enter all amounts as absolute values in the same unit. Post-trade AUM = current AUM + new funds to allocate; the new funds are not included in current AUM. Current WAM and WAL are snapshot values and may be entered even when they breach a limit so that a remediation plan can be modeled. If a target is left blank, the SFC limits of 60 days for WAM and 120 days for WAL still apply.',

  '目标交易后 YTM': 'Target post-trade YTM',
  目标交易后YTM百分比: 'Target post-trade YTM percentage',
  '例如 3.000': 'e.g. 3.000',
  反推期限与配置比例: 'Solve for limit & allocation',
  '目标按“至少达到”处理；系统反推所选':
    'The target is treated as a minimum. The planner finds the shortest ',
  '的最短上限和产品比例，另一项当前上限及 SFC 硬上限继续生效。':
    ' limit and allocation mix while retaining the current limit for the other metric and all SFC hard limits.',
  '当前组合在 SFC 的':
    'No feasible point exists for the current portfolio within the SFC ',
  '区间内没有可行点，请先放宽另一项期限约束或检查输入。':
    ' range. Relax the other maturity constraint or check the inputs.',
  上限: ' limit: ',
  '最高 YTM': 'Max YTM: ',
  '实际 WAM': 'Actual WAM: ',
  '天 · WAL': ' days · WAL',
  '天 ·': ' days ·',
  '天，': ' days, ',
  '较最紧点 +': 'vs. tightest point +',
  '约束：': 'Binding: ',
  '、': ', ',
  '。': '.',
  当前选择: 'Current selection',
  '目标 YTM': 'Target YTM',
  '坐标（': 'Point (',
  '）· 最大 YTM': ') · Max YTM',
  '点击曲线上的位置，即可采用对应的':
    'Click a point on the curve to apply its ',
  上限并重新计算: ' limit and recalculate',

  持仓工作区: 'Holdings workspace',
  当前口径: 'Current basis',
  修改组合参数: 'Edit portfolio inputs',
  持仓金额需与此口径对账: 'Holdings must reconcile to this amount',
  持仓合计: 'Holdings total',
  尚未完成对账: 'Not yet reconciled',
  '已与 AUM 对账': 'Reconciled to AUM',
  当前交易方向: 'Current transaction',
  净赎回金额: 'Net redemption',
  新增资金: 'New funds',
  新增待配置资金: 'New funds to allocate',
  交易方向在配置测算界面修改:
    'Change the transaction in the allocation planner',
  用于预览交易后的机构集中度:
    'Used to preview post-trade institution concentration',
  '01 · 当前持仓': '01 · Current holdings',
  当前持仓明细: 'Current holdings detail',
  '机构敞口从这里自动汇总；净赎回时按每项持仓同比例测算。':
    'Institution exposures are aggregated here automatically. Net redemptions are modeled pro rata across all holdings.',
  新增持仓: 'Add holding',
  '用现金及其他补足（需确认不计入集中度）':
    'Fill the gap with cash and other assets (confirm exclusion from concentration)',
  '资产 / 产品': 'Asset / product',
  集中度归属机构: 'Institution for concentration',
  当前金额: 'Current amount',
  '绝对金额/': 'Absolute amount / ',
  预计赎回: 'Estimated redemption',
  当前为同比例: 'Pro rata',
  赎回后金额: 'Post-redemption amount',
  持仓资产或产品名称: 'Holding asset or product name',
  '请输入资产或产品名称。': 'Enter an asset or product name.',
  请选择归属机构: 'Select an institution',
  '无机构归属 / 不计入本工具统计（需确认）':
    "No institution / excluded from this tool's calculation (confirmation required)",
  '自动补差专用行；明确不计入本工具的机构集中度统计。':
    "Balancing row only; explicitly excluded from this tool's institution concentration calculation.",
  '请选择机构，或明确选择不计入统计。':
    'Select an institution or explicitly exclude this holding from the calculation.',
  '请输入非负金额。': 'Enter a non-negative amount.',
  '还没有持仓。请新增持仓，并使金额合计与当前 AUM 一致。':
    'No holdings yet. Add holdings whose total equals current AUM.',
  '持仓金额合计必须等于当前 AUM。选择“无机构归属 / 不计入本工具统计”仅表示该行不占用下方单一机构额度，须由合规确认；普通机构持仓不得归入此项。窄屏可左右滑动查看完整字段。':
    "Holdings must total current AUM. Selecting ‘No institution / excluded from this tool's calculation’ only means that the row does not use a single-institution limit below and requires compliance confirmation; ordinary institution holdings must not use this option. Scroll horizontally on narrow screens to view all fields.",
  ' 当前显示的是同比例情景，不代表赎回优先级。':
    ' This is a pro rata scenario, not a redemption-priority recommendation.',
  当前持仓合计: 'Current holdings total',
  某项持仓: 'a holding',
  该项持仓: 'this holding',
  某机构: 'an institution',
  某产品: 'a product',

  '02 · 机构集中度': '02 · Institution concentration',
  机构集中度汇总: 'Institution concentration summary',
  机构表: 'Institutions',
  '家 · 备选库': ' · Library',
  家: ' institutions',
  合作机构备选库: 'Partner institution library',
  选择后可用于持仓归属和今日报价:
    "Add institutions for holding assignments and today's quotes",
  仅保存在本机: 'Stored on this device only',
  从合作机构备选库选择: 'Select from the partner institution library',
  选择备选机构: 'Select an institution',
  备选机构已全部加入: 'All library institutions have been added',
  '· 默认': '· Default ',
  加入机构表: 'Add institution',
  新增合作机构: 'Add partner institution',
  机构名称: 'Institution name',
  新增合作机构名称: 'New partner institution name',
  '例如：机构 F': 'e.g. Institution F',
  '默认上限（%）': 'Default limit (%)',
  新增合作机构默认集中度上限百分比:
    'Default concentration limit percentage for the new partner institution',
  存入备选库: 'Save to library',
  机构: 'Institution',
  当前机构敞口: 'Current institution exposure',
  '从持仓自动汇总/': 'Aggregated from holdings / ',
  '赎回后占比（不变）': 'Post-redemption share (unchanged)',
  当前占比: 'Current share',
  与当前占比相同: 'Same as current share',
  '占当前 AUM': '% of current AUM',
  适用集中度上限: 'Applicable concentration limit',
  '合规确认 · 占交易后 NAV/%': 'Compliance-confirmed · % of post-trade NAV',
  赎回后持仓: 'Post-redemption exposure',
  交易后额度上限: 'Post-trade capacity',
  预计同比例赎回: 'Estimated pro rata redemption',
  本次最多可新增: 'Maximum addition',
  '项持仓 ·': ' holdings ·',
  项持仓: ' holdings',
  项报价: ' quotes',
  和: ' and ',
  由: 'Aggregated from ',
  项持仓自动汇总: ' holdings',
  '请先修正对应持仓金额。': 'Correct the linked holding amounts first.',
  '同比例赎回后占比不变，仍超过适用上限。':
    'The share remains unchanged after a pro rata redemption and still exceeds the applicable limit.',
  计入新增资金后仍超过适用上限:
    'Still exceeds the applicable limit after including new funds',
  '当前占比超限；计入新增资金后可稀释至上限内。':
    'The current share exceeds the limit but falls within it after new funds are included.',
  '移出机构表，但保留在合作机构备选库':
    'Remove from the institution table but keep in the partner institution library',
  '请先从合作机构备选库加入需要用于持仓或报价的机构。':
    'Add the institutions required for holdings or quotes from the partner institution library first.',
  '赎回后持仓 = 当前持仓 ×（交易后 AUM ÷ 当前 AUM）；同比例赎回金额 = 当前持仓 − 赎回后持仓。机构占比不会因同比例赎回改变。':
    'Post-redemption exposure = current exposure × (post-trade AUM ÷ current AUM); pro rata redemption = current exposure − post-redemption exposure. Institution shares do not change.',
  '当前占比 = 当前机构敞口 ÷ 当前 AUM；交易后额度上限 =（当前 AUM + 新增待配置资金）× 集中度上限；本次最多可新增 = 交易后额度上限 − 当前机构敞口。':
    'Current share = current institution exposure ÷ current AUM; post-trade capacity = (current AUM + new funds to allocate) × concentration limit; maximum addition = post-trade capacity − current institution exposure.',
  '被持仓或报价引用的机构不能直接移除；持仓请先在上方改绑，关联报价请返回配置测算界面删除。':
    'An institution referenced by a holding or quote cannot be removed directly. Reassign the holding above or return to the allocation planner and delete the linked quote first.',
  ' 当前为净赎回模式，需先切换至净申购后查看报价。':
    ' Switch to Net subscription to view quotes; the planner is currently in Net redemption mode.',
  返回配置测算查看报价: 'Return to allocation planner to view quotes',
  '同一机构的全部产品合并占用额度。单一实体一般上限为 10%；仅当该实体为符合条件的实质金融机构，并经合规确认满足 8.2(g)(i) 条件时才可提高至 25%。本工具假设 AUM 等于集中度计算使用的 NAV。':
    'All products from the same institution share one limit. The general single-entity limit is 10%; it may be raised to 25% only for a qualifying substantial financial institution confirmed by compliance as meeting section 8.2(g)(i). This tool assumes AUM equals the NAV used for concentration calculations.',

  赎回规则: 'Redemption rules',
  市场报价: 'Market quotes',
  按现有组合同比例赎回: 'Redeem the current portfolio pro rata',
  今日可投产品与报价: "Today's investable products & quotes",
  不使用今日报价: "Today's quotes are not used",
  新产品: 'New product',
  现金及其他不计单一实体集中度资产:
    'Cash and other assets excluded from single-entity concentration',
  添加报价: 'Add quote',
  当前版本不选择具体赎回产品:
    'This version does not select individual holdings to redeem',
  '系统按“净赎回金额 ÷ 当前 AUM”的比例，同步缩减现有组合中的所有资产和机构敞口。因此 YTM、WAM、WAL 与机构占比保持不变。':
    'The planner reduces every asset and institution exposure in the current portfolio by net redemption ÷ current AUM. YTM, WAM, WAL and institution shares therefore remain unchanged.',
  '“当前持仓”界面会逐项列出预计赎回额和剩余金额；当前仍不判断赎回优先级。后续可在这张底表上增加产品级收益、期限和可赎回额度，再优化具体来源。':
    'The Holdings view lists the estimated redemption and remaining amount for each holding. Redemption priority is not modeled yet. Product-level yield, maturity and redeemable capacity can later be added to this ledger to optimize the source of redemptions.',
  产品: 'Product',
  'WAM/天': 'WAM / days',
  'WAL/天': 'WAL / days',
  '利率/%': 'Rate / %',
  本次可投上限: 'Investment cap',
  产品名称: 'Product name',
  '同 WAL': 'Same as WAL',
  利率: 'Rate',
  报价额度: 'Quote capacity',
  'WAL 填剩余最终到期天数。WAM 留空时自动按 WAL 处理；仅在已确认浮息工具可按下一次利率重定价计量时，填写更短的 WAM 天数。报价额度与 AUM 使用同一绝对金额单位。':
    'Enter the remaining days to final maturity for WAL. If WAM is blank, WAL is used automatically. Enter a shorter WAM only after confirming that a floating-rate instrument may be measured to its next interest-rate reset. Quote capacity and AUM must use the same absolute amount unit.',
  '当前持仓或机构集中度数据需修正，完成后才能继续计算。':
    'Correct the holdings or institution concentration data before calculating.',
  '存在超出监管硬上限或无效输入，请先修正上方提示。':
    'Correct the invalid inputs or regulatory hard-limit breaches shown above.',
  前往当前持仓处理: 'Go to holdings',
  '按现有组合同比例扣减；不使用市场报价':
    'Reduce the current portfolio pro rata; market quotes are not used',
  '连续金额优化；未配置资金按零期限、零收益现金处理':
    'Continuous-amount optimization; unallocated funds are treated as zero-maturity, zero-yield cash',
  恢复示例: 'Restore example',
  大规模赎回示例: 'Large redemption example',
  大规模申购示例: 'Large subscription example',
  '净赎回（暂不可用）': 'Net redemption (unavailable)',
  '赎回示例（暂不可用）': 'Redemption example (unavailable)',
  '12家银行模拟示例': '12-bank simulated example',
  '机构敞口从当前持仓自动汇总。': 'Institution exposures are aggregated from current holdings.',
  '使用页面当前填写的组合、当前持仓、机构上限和报价，计算申购配置。净赎回暂不可用。': 'Calculate subscription allocations using the current portfolio, holdings, institution limits and quotes. Net redemption is currently unavailable.',
  测算赎回后组合: 'Calculate post-redemption portfolio',
  计算最优配置: 'Calculate optimal allocation',
  '计算当前 MMF 配置': 'Calculate current MMF allocation',
  '使用页面当前填写的组合、当前持仓、机构上限、交易方向和报价，计算申购配置或同比例赎回影响。':
    'Use the portfolio, holdings, institution limits, transaction and quotes currently entered on the page to calculate a subscription allocation or the impact of a pro rata redemption.',

  决策面板: 'Decision panel',
  赎回后组合快照: 'Post-redemption portfolio snapshot',
  收益前沿与推荐配置: 'Yield frontier & recommended allocation',
  '按现有组合同比例缩减；结果以最近一次测算为准':
    'Reduce the current portfolio pro rata; results reflect the latest calculation',
  '前沿随输入实时更新；配置结果以最近一次计算为准':
    'The frontier updates with the inputs; allocation results reflect the latest calculation',
  '监管/输入需修正': 'Regulatory/input correction required',
  待重新计算: 'Recalculation required',
  约束通过: 'Constraints satisfied',
  输入需调整: 'Inputs need adjustment',
  赎回影响: 'Redemption impact',
  同比例赎回不改变期限与收益指标:
    'A pro rata redemption does not change maturity or yield metrics',
  '本模式没有新的买入配置，因此不展示收益前沿或目标 YTM 反推。交易后结果仅由赎回金额和当前组合快照决定。':
    'This mode makes no new purchases, so no yield frontier or target-YTM reverse calculation is shown. The post-trade result depends only on the redemption amount and current portfolio snapshot.',
  收益前沿: 'Yield frontier',
  '多一天期限，换来多少收益': 'How much yield does one more day add?',
  选择期限指标: 'Select a maturity metric',
  曲线: ' curve',
  '请先修正“当前持仓”中的持仓或机构数据，随后再生成收益前沿。':
    'Correct the holding or institution data in Holdings before generating the yield frontier.',
  测算结果: 'Calculation result',
  最优解: 'Optimal solution',
  同比例赎回结果: 'Pro rata redemption result',
  推荐配置: 'Recommended allocation',
  '赎回测算已暂时隐藏。请先修正标红字段，再重新测算。':
    'The redemption calculation is hidden until the fields marked in red are corrected and recalculated.',
  '推荐配置已暂时隐藏。请先修正标红字段，再重新计算。':
    'The recommended allocation is hidden until the fields marked in red are corrected and recalculated.',
  本次赎回比例: 'Redemption ratio',
  '净赎回金额 ÷ 当前 AUM': 'Net redemption ÷ current AUM',
  '交易后 YTM': 'Post-trade YTM',
  '交易前 AUM': 'Pre-trade AUM',
  '当前加权 YTM': 'Current weighted YTM',
  '自动计算': 'Calculated automatically',
  '机构标识重复，请修正机构数据。': 'Duplicate institution IDs; correct the institution data.',
  '持仓标识重复，请修正持仓数据。': 'Duplicate holding IDs; correct the holdings data.',
  '报价标识重复，请修正报价数据。': 'Duplicate quote IDs; correct the quotes data.',
  '输入已修改，请重新计算以查看最新配置。': 'Inputs have changed. Recalculate to view the updated allocation.',
  '持仓 YTM': 'Holding YTM',
  '持仓填写当前估值收益率和剩余天数；WAM 留空采用 WAL，现金期限为 0。': 'Enter current valuation yields and remaining days. Blank WAM uses WAL; cash has zero term.',
  '必填': 'Required',
  '编辑持仓': 'Edit holdings',
  '当前机构': 'Current institutions',
  '超过一般上限需确认': 'Above the general limit; confirmation required',
  '选择已有机构': 'Select a saved institution',
  '选择后直接加入': 'Select to add immediately',
  '已保存机构均已加入': 'All saved institutions have been added',
  '新增机构': 'Add institution',
  '新增后即可用于持仓和报价，并自动保存在本机供下次选择。': 'Add to holdings and quotes immediately, and save on this device for reuse.',
  '从当前测算移除；已保存的机构仍可再次选择': 'Remove from this calculation; saved institutions can be selected again',
  '请先新增机构或选择已有机构。': 'Add a new institution or select a saved one first.',
  '当前持仓': 'Current holdings',
  '今日可投': 'Available today',
  '前往配置测算': 'Go to allocation planner',
  '前往今日可投查看报价': 'View available products and quotes',
  '被持仓或报价引用的机构不能直接移除；持仓请先在上方改绑，关联报价请到今日可投界面删除。': 'Institutions referenced by holdings or quotes cannot be removed. Reassign holdings above and remove linked quotes under Available today.',
  '请补齐持仓收益率与有效期限': 'Complete holding yields and valid remaining terms',
  '当前 AUM、加权 YTM、WAM、WAL 自动汇总自持仓。请在持仓中编辑金额、收益率和剩余期限；这里只需填写新增资金与上限。': 'Current AUM, weighted YTM, WAM and WAL are derived from holdings. Edit amounts, yields and remaining terms in holdings; enter only new funds and limits here.',
  '交易前 YTM': 'Pre-trade YTM',
  '交易前 WAM': 'Pre-trade WAM',
  '交易前 WAL': 'Pre-trade WAL',
  '交易后 WAM': 'Post-trade WAM',
  '交易后 WAL': 'Post-trade WAL',
  '同比例赎回，与当前组合一致':
    'Unchanged from the current portfolio under a pro rata redemption',
  仍有: 'Unallocated: ',
  '未配置，期限或额度约束已限制继续投资。':
    ' because maturity or capacity constraints prevent further investment.',
  推荐金额与新增资金占比: 'Recommended amounts & share of new funds',
  '· 占新增资金': '· Share of new funds: ',
  保留现金: 'Retain as cash',
  '零期限 · 零收益': 'Zero maturity · zero yield',
  '当前约束下没有正收益配置。':
    'No positive-yield allocation is feasible under the current constraints.',
  按比例缩减当前持仓: 'Reduce current holdings pro rata',
  '下列金额来自当前持仓底表，合计等于本次净赎回金额；这是同比例情景，不代表赎回优先级。':
    'The amounts below come from the holdings ledger and total the net redemption. This is a pro rata scenario, not a redemption-priority recommendation.',
  '明细按当前金额单位四舍五入展示，计算与合计使用未舍入数值。':
    'Details are rounded to the current amount unit for display; calculations and totals use unrounded values.',
  不计入单一实体集中度: 'Excluded from single-entity concentration',
  机构待修正: 'Institution needs correction',
  赎回: 'Redeemed ',
  剩余: 'Remaining ',
  机构同比例赎回明细: 'Institution-level pro rata redemption',
  交易后机构占比: 'Post-trade institution shares',
  当前: 'Current',
  压力: 'Stress',
  '· 剩余': '· Remaining ',
  新增: 'Added ',
  已触及上限: 'At limit',
  当前输入没有可行解: 'No feasible solution for the current inputs',

  '当前 AUM 必须是有效数字。': 'Current AUM must be a valid number.',
  '净赎回时，当前 AUM 必须大于 0。':
    'Current AUM must be greater than 0 for a net redemption.',
  '当前 AUM 不得小于 0。': 'Current AUM cannot be negative.',
  '净赎回金额必须小于当前 AUM；全部赎回后无法计算组合指标。':
    'Net redemption must be less than current AUM; portfolio metrics cannot be calculated after a full redemption.',
  '同比例赎回不会改变 WAM；当前值仍高于交易后上限。':
    'A pro rata redemption does not change WAM; the current value still exceeds the post-trade limit.',
  '同比例赎回不会改变 WAL；当前值仍高于交易后上限。':
    'A pro rata redemption does not change WAL; the current value still exceeds the post-trade limit.',
  '请输入有效的目标 YTM。': 'Enter a valid target YTM.',
  '集中度上限必须是有效数字。':
    'The concentration limit must be a valid number.',
  '集中度上限不得低于 0%。': 'The concentration limit cannot be below 0%.',
  '对单一实体的最高例外上限为 25%':
    'The maximum exception limit for a single entity is 25%',
  '超过一般 10% 上限：仅适用于经合规确认符合 SFC 8.2(g)(i) 条件的实质金融机构。':
    'Above the general 10% limit: allowed only for a substantial financial institution confirmed by compliance as meeting SFC section 8.2(g)(i).',
  '持仓名称不能为空。': 'Holding name is required.',
  '当前 AUM 必须为非负数字。': 'Current AUM must be a non-negative number.',
  '可配置金额必须为非负数字。':
    'The amount available for allocation must be non-negative.',
  '交易后 AUM 必须为大于 0 的有效数字。':
    'Post-trade AUM must be a valid number greater than 0.',
  '当前 YTM 必须是有效数字。': 'Current YTM must be a valid number.',
  '机构名称不能为空。': 'Institution name is required.',
  '产品名称不能为空。': 'Product name is required.',
  '输入金额或期限的数值尺度超出可计算范围。':
    'The amount or maturity scale is outside the supported calculation range.',
  '即使新增资金全部留作现金，也无法满足 WAM 上限。':
    'The WAM limit cannot be met even if all new funds remain in cash.',
  '即使新增资金全部留作现金，也无法满足 WAL 上限。':
    'The WAL limit cannot be met even if all new funds remain in cash.',
  '求解过程没有收敛，请检查输入数据。':
    'The solver did not converge. Check the inputs.',
  '配置总额超过可配置金额。':
    'Total allocation exceeds the amount available for allocation.',
  '交易后 WAM 超过所选上限。': 'Post-trade WAM exceeds the selected limit.',
  '交易后 WAL 超过所选上限。': 'Post-trade WAL exceeds the selected limit.',
  '求解结果包含不可用数值。': 'The solution contains invalid numeric values.',
  '求解结果未通过硬约束复核。':
    'The solution failed the hard-constraint check.',
  '净赎回时，当前 AUM 必须为大于 0 的数字。':
    'Current AUM must be greater than 0 for a net redemption.',
  '净赎回金额必须为非负数字。': 'Net redemption must be non-negative.',
  '交易后 AUM 必须大于 0。': 'Post-trade AUM must be greater than 0.',
  '交易后剩余 AUM 过小，已超出可可靠计算持仓与集中度的数值精度。':
    'Remaining post-trade AUM is too small for holdings and concentration to be calculated reliably at the available numeric precision.',
  '逐项赎回金额未能稳定对账，请检查当前持仓金额。':
    'Holding-level redemption amounts could not be reconciled reliably. Check current holding amounts.',
  '交易后机构敞口合计超过交易后 AUM。':
    'Total post-trade institution exposure exceeds post-trade AUM.',
  '赎回结果未通过交易后硬约束复核。':
    'The redemption result failed the post-trade hard-constraint check.',
  '目标 YTM 必须是有效数字。': 'Target YTM must be a valid number.',
  '当前输入没有可行解。': 'No feasible solution for the current inputs.',
  '目标非常接近边界，当前精度下无法稳定生成配置，请略微降低目标 YTM。':
    'The target is too close to the boundary to produce a stable allocation at the current precision. Lower target YTM slightly.',
};

type DynamicEnglishPattern = {
  pattern: RegExp;
  replace: (...matches: string[]) => string;
};

const fixedEnglish = (source: string) => englishCopy[source] ?? source;
const holdingName = (source: string) =>
  source === '某项持仓' ? 'a holding' : source;
const institutionName = (source: string) =>
  source === '某机构' ? 'an institution' : source;
const productName = (source: string) =>
  source === '某产品' ? 'a product' : source;
const englishUnit = (source: string) => englishCopy[source] ?? source;
const counted = (raw: string, singular: string, plural: string) =>
  `${raw} ${Number(raw) === 1 ? singular : plural}`;

const dynamicEnglishPatterns: DynamicEnglishPattern[] = [
  {
    pattern: /^持仓数据需修正（(\d+)）$/,
    replace: (count) => `Holdings need correction (${count})`,
  },
  {
    pattern: /^已录入 (.+) \/ AUM (.+) (元|万元|百万元|亿元)$/,
    replace: (total, aum, unit) =>
      `Recorded ${total} / AUM ${aum} ${englishUnit(unit)}`,
  },
  {
    pattern:
      /^目标 ≥ (.+)；最低 (WAM|WAL) 上限 (.+) 天；本解 (.+)。推荐金额与比例已同步更新。$/,
    replace: (target, metric, limit, result) =>
      `Target ≥ ${target}; minimum ${metric} limit ${limit} days; this solution yields ${result}. Recommended amounts and allocation shares have been updated.`,
  },
  {
    pattern: /^(赎回|新增) (.+) (元|万元|百万元|亿元)$/,
    replace: (action, amount, unit) =>
      `${action === '赎回' ? 'Redeemed' : 'Added'} ${amount} ${englishUnit(unit)}`,
  },
  {
    pattern: /^新增资金 (.+%)$/,
    replace: (yieldValue) => `New-fund yield ${yieldValue}`,
  },
  {
    pattern: /^计算所用上限 (.+) 天$/,
    replace: (limit) => `Applied limit ${limit} days`,
  },
  {
    pattern: /^余量 (.+) (元|万元|百万元|亿元)$/,
    replace: (amount, unit) =>
      `Remaining capacity ${amount} ${englishUnit(unit)}`,
  },
  {
    pattern: /^(.+) (元|万元|百万元|亿元)$/,
    replace: (amount, unit) => `${amount} ${englishUnit(unit)}`,
  },
  {
    pattern: /^(.+) 天$/,
    replace: (days) => `${days} days`,
  },

  {
    pattern: /^(.+)的集中度归属机构$/,
    replace: (name) => `Institution assignment for ${holdingName(name)}`,
  },
  {
    pattern: /^(.+)当前金额，单位(元|万元|百万元|亿元)$/,
    replace: (name, unit) =>
      `Current amount for ${holdingName(name)}, in ${englishUnit(unit)}`,
  },
  {
    pattern: /^删除(.+)$/,
    replace: (name) => `Delete ${name === '该项持仓' ? 'this holding' : name}`,
  },
  {
    pattern: /^(.+)经合规确认的适用集中度上限$/,
    replace: (name) =>
      `Compliance-confirmed applicable concentration limit for ${name}`,
  },
  {
    pattern: /^将(.+)移出机构表$/,
    replace: (name) => `Remove ${name} from the institution table`,
  },
  {
    pattern: /^(.+)计入WAM的天数$/,
    replace: (name) => `WAM days for ${name}`,
  },
  {
    pattern: /^(.+)计入WAL的天数$/,
    replace: (name) => `WAL days for ${name}`,
  },
  {
    pattern: /^「(.+)」报价额度$/,
    replace: (name) => `Quote capacity: “${name}”`,
  },
  {
    pattern: /^(.+)(利率|报价额度)$/,
    replace: (name, field) =>
      `${field === '利率' ? 'Rate' : 'Quote capacity'} for ${name}`,
  },
  {
    pattern: /^(.+)机构$/,
    replace: (name) => `Institution for ${name}`,
  },

  {
    pattern:
      /^该机构仍被(\d+) 项持仓和(\d+) 项报价使用；请先改绑或删除关联记录$/,
    replace: (holdings, quotes) =>
      `This institution is still used by ${counted(holdings, 'holding', 'holdings')} and ${counted(quotes, 'quote', 'quotes')}. Reassign or delete those records first.`,
  },
  {
    pattern: /^该机构仍被(\d+) 项持仓使用；请先改绑或删除关联记录$/,
    replace: (holdings) =>
      `This institution is still used by ${counted(holdings, 'holding', 'holdings')}. Reassign or delete those records first.`,
  },
  {
    pattern: /^该机构仍被(\d+) 项报价使用；请先改绑或删除关联记录$/,
    replace: (quotes) =>
      `This institution is still used by ${counted(quotes, 'quote', 'quotes')}. Reassign or delete those records first.`,
  },

  {
    pattern: /^上限输入错误：(.+)$/,
    replace: (detail) => `Invalid limit: ${toEnglish(detail)}`,
  },
  {
    pattern: /^(.+)：(.+)$/,
    replace: (name, detail) => `${institutionName(name)}: ${toEnglish(detail)}`,
  },

  {
    pattern: /^(.+?) ?不能为空。$/,
    replace: (field) => `${fixedEnglish(field)} is required.`,
  },
  {
    pattern: /^(.+?) ?必须是有效数字。$/,
    replace: (field) => `${fixedEnglish(field)} must be a valid number.`,
  },
  {
    pattern: /^(.+?)不得小于 0。$/,
    replace: (field) => `${fixedEnglish(field)} cannot be negative.`,
  },
  {
    pattern: /^(.+?)不得小于 0 天。$/,
    replace: (field) => `${fixedEnglish(field)} cannot be less than 0 days.`,
  },

  {
    pattern: /^SFC 要求 MMF 组合 (WAM|WAL) 不得超过 (.+) 天。$/,
    replace: (metric, maximum) =>
      `SFC requires an MMF portfolio's ${metric} not to exceed ${maximum} days.`,
  },
  {
    pattern:
      /^当前组合 (WAM|WAL) 已超过 SFC (.+) 天上限；同比例赎回不会改变该指标。$/,
    replace: (metric, maximum) =>
      `The portfolio's ${metric} exceeds the SFC limit of ${maximum} days; a pro rata redemption does not change this metric.`,
  },
  {
    pattern:
      /^当前组合 (WAM|WAL) 已超过 SFC (.+) 天上限；该事实仍可录入，以测算回到合规区间的方案。$/,
    replace: (metric, maximum) =>
      `The portfolio's ${metric} exceeds the SFC limit of ${maximum} days. Keep the snapshot value to model a return to compliance.`,
  },
  {
    pattern: /^按比例赎回不会改变 (WAM|WAL)；当前 (.+) 天仍超过 (.+) 天上限。$/,
    replace: (metric, current, limit) =>
      `A pro rata redemption does not change ${metric}; the current ${current} days still exceeds the ${limit}-day limit.`,
  },

  {
    pattern: /^(.+)的当前金额必须是非负数字。$/,
    replace: (name) =>
      `${holdingName(name)} must have a non-negative current amount.`,
  },
  {
    pattern: /^(.+)尚未选择集中度归属机构。$/,
    replace: (name) =>
      `No concentration institution has been selected for ${holdingName(name)}.`,
  },
  {
    pattern: /^(.+)对应的机构已不存在。$/,
    replace: (name) =>
      `The institution linked to ${holdingName(name)} no longer exists.`,
  },
  {
    pattern:
      /^当前持仓合计（(.+)）比当前 AUM（(.+)）超出 (.+)；请调低或删除对应持仓。$/,
    replace: (total, aum, difference) =>
      `Current holdings total (${total}) exceeds current AUM (${aum}) by ${difference}. Reduce or remove holdings.`,
  },
  {
    pattern:
      /^当前持仓合计（(.+)）比当前 AUM（(.+)）少 (.+)；请补录持仓或计入现金及其他。$/,
    replace: (total, aum, difference) =>
      `Current holdings total (${total}) is ${difference} below current AUM (${aum}). Add the missing holding or include it in cash and other assets.`,
  },
  {
    pattern: /^已录入机构的当前持仓合计（(.+)）不得超过当前 AUM（(.+)）。$/,
    replace: (total, aum) =>
      `Recorded institution holdings (${total}) cannot exceed current AUM (${aum}).`,
  },

  {
    pattern: /^(.+)的当前持有金额无效。$/,
    replace: (name) =>
      `${institutionName(name)} has an invalid current exposure.`,
  },
  {
    pattern: /^(.+)现有敞口已超过交易后上限，新增配置无法修复。$/,
    replace: (name) =>
      `${institutionName(name)} already exceeds its post-trade limit; new allocations cannot resolve the breach.`,
  },
  {
    pattern:
      /^(.+)当前占比超过适用上限；同比例赎回后占比不变，无法修复该超限。$/,
    replace: (name) =>
      `${institutionName(name)} exceeds its applicable limit. Its share is unchanged after a pro rata redemption, so the breach cannot be resolved.`,
  },
  {
    pattern: /^(.+)没有对应的机构。$/,
    replace: (name) =>
      `No linked institution was found for ${name === '某项持仓' ? 'a holding' : productName(name)}.`,
  },
  {
    pattern: /^(.+)没有对应的集中度归属机构。$/,
    replace: (name) =>
      `No concentration institution was found for ${holdingName(name)}.`,
  },
  {
    pattern: /^(.+)计入 WAM 的天数无效。$/,
    replace: (name) => `${productName(name)} has invalid WAM days.`,
  },
  {
    pattern: /^(.+)计入 WAL 的天数无效。$/,
    replace: (name) => `${productName(name)} has invalid WAL days.`,
  },
  {
    pattern: /^(.+)的 WAM 天数不能大于 WAL 天数。$/,
    replace: (name) =>
      `${productName(name)} cannot have more WAM days than WAL days.`,
  },
  {
    pattern: /^(.+)的利率无效。$/,
    replace: (name) => `${productName(name)} has an invalid rate.`,
  },
  {
    pattern: /^(.+)的报价额度无效。$/,
    replace: (name) => `${productName(name)} has an invalid quote capacity.`,
  },
  {
    pattern: /^(.+)的配置金额无效。$/,
    replace: (name) => `${productName(name)} has an invalid allocation amount.`,
  },
  {
    pattern: /^(.+)超过报价额度。$/,
    replace: (name) => `${productName(name)} exceeds its quote capacity.`,
  },
  {
    pattern: /^(.+)超过集中度上限。$/,
    replace: (name) =>
      `${institutionName(name)} exceeds its concentration limit.`,
  },

  {
    pattern: /^(WAM|WAL) (.+) 天上限$/,
    replace: (metric, limit) => `${metric} limit: ${limit} days`,
  },
  {
    pattern: /^(.+)集中度 (.+%)$/,
    replace: (name, limit) => `${name} concentration: ${limit}`,
  },

  {
    pattern:
      /^在 SFC (WAM|WAL) ≤ (.+) 天及另一项当前约束下，最高只能达到 (.+)。$/,
    replace: (metric, ceiling, maximumYtm) =>
      `Under the SFC ${metric} limit of ${ceiling} days and the current constraint on the other metric, the maximum achievable YTM is ${maximumYtm}.`,
  },
];

function toTraditional(input: string) {
  return Array.from(
    input,
    (character) => traditionalCharacters[character] ?? character,
  ).join('');
}

function toEnglish(input: string) {
  const exact = englishCopy[input];
  if (exact) return exact;
  for (const { pattern, replace } of dynamicEnglishPatterns) {
    const match = input.match(pattern);
    if (match) return replace(...match.slice(1));
  }
  return input;
}

export function translateText(locale: Locale, source: string) {
  if (locale === 'zh-CN' || !source) return source;
  return locale === 'zh-HK' ? toTraditional(source) : toEnglish(source);
}
