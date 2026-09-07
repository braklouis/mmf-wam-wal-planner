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
  团: '團',
  冲: '衝',
  码: '碼',
  密: '密',
  储: '儲',
  护: '護',
  迁: '遷',
  订: '訂',
  摘: '摘',
  范: '範',
  转: '轉',
  齐: '齊',
  创: '創',
  独: '獨',
  长: '長',

  锁: '鎖',
  签: '簽',
  钱: '錢',
  压: '壓',
  简: '簡',
  闭: '閉',
  态: '態',
  冻: '凍',

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
  '删除集团': 'Delete group',

  "导入失败": "Import failed",
  "请重试。": "Please retry.",
  "当前组合 WAM 不能大于 WAL。": "Portfolio WAM cannot exceed WAL.",
  "请补齐持仓收益率": "Complete holding yields",
  "版本已删除，当前工作内容保持不变。": "Version deleted. Current work is unchanged.",
  "现金缓冲金额": "Cash buffer amount",
  "现金缓冲比例": "Cash buffer ratio",
  "本机存档 · 每次保存新增版本": "Local archive · Each save creates a version",
  "此版本将永久删除，无法撤销。当前工作内容和其他版本不受影响。": "Delete this version permanently? Current work and other versions are unchanged.",
  "确认删除": "Confirm deletion",
  "现金压力测算": "Cash stress test",
  "金额／比例联动，以最后输入项为准。": "Amount and percentage are linked; the last input takes precedence.",
  "手动输入，参考目标 5%": "Manual input; reference target 5%",
  "现金缓冲可覆盖本次压力赎回。简易模式不检查机构及集团集中度。": "Cash covers the stress redemption. Simple mode does not check entity or group concentration.",
  "当前组合数据来自持仓页。": "Current portfolio data comes from Holdings.",
  "现金金额／占 AUM 比例联动，以最后输入项为准。": "Cash amount and percentage of AUM are linked; the last input takes precedence.",
  "现金缓冲按现金持仓汇总。": "Cash buffer is aggregated from cash holdings.",
  "持仓合计：": "Total holdings:",
  "AUM 已对账。": "AUM reconciled.",
  "“无机构归属”不计集中度，仅用于经确认的排除项。": "Unassigned holdings are excluded from concentration checks; use only for confirmed exclusions.",
  "在机构管理中修改上限": "Edit limits in Institutions",
  "剩余持仓 = 当前持仓 ×（1 − 赎回比例）。": "Remaining holdings = current holdings × (1 − redemption ratio).",
  "按模式归档，可重命名。清空工作区不删除存档。": "Archived by mode; names are editable. Clearing the workspace retains archives.",
  "还没有保存的版本。": "No saved versions.",
  "汇总期限模式": "Aggregate maturity mode",
  "此模式暂无保存版本。": "No versions saved for this mode.",
  "保存名称": "Save name",
  "机构与集团": "Institutions and groups",
  "集团集中度汇总［3］": "Group concentration [3]",
  "集团内机构共享额度。": "Institutions in a group share capacity.",
  "当前敞口": "Current exposure",
  "· 上限": "· Limit",
  "· 可新增": "· Available",
  "请在机构管理中填写集团归属。": "Assign groups in Institutions.",
  "按赎回比例缩减全部持仓，收益、期限及集中度比例不变。": "All holdings are reduced pro rata; yield, maturity and concentration ratios are unchanged.",
  "利率单位 %；空白无报价，0 为零利率。额度在明细中设置。": "Rates in %; blank means no quote, 0 means zero yield. Set caps in Details.",
  "［设置］": "[Setting]",
  "净赎回不适用收益前沿及目标反推。": "Frontiers and target search do not apply to net redemptions.",
  "计算中…": "Calculating…",
  "简易模式不校验现金压力与机构集中度。": "Simple mode excludes cash stress and institution concentration.",
  "编辑机构（实体）": "Edit institution (entity)",
  "新增机构（实体）": "Add institution (entity)",
  "实体全称": "Legal entity name",
  "留空使用机构名称": "Defaults to institution name",
  "所属集团": "Group",
  "未设置": "Not assigned",
  "机构上限（%）［2］": "Institution limit (%) [2]",
  "机构名称已存在。": "Institution name already exists.",
  "已保存机构（": "Saved institutions (",
  "未设置集团": "No group assigned",
  "尚未新增机构。": "No institutions added.",
  "编辑集团": "Edit group",
  "新增集团": "Add group",
  "集团名称": "Group name",
  "集团上限（%）［3］": "Group limit (%) [3]",
  "集团名称已存在。": "Group name already exists.",
  "保存集团": "Save group",
  "已保存集团（": "Saved groups (",
  "请先将所属机构移出该集团": "Remove institutions from this group first",
  "尚未新增集团。": "No groups added.",
  "开发中，暂未开放": "In development; unavailable",
  "利率期限结构，暂未开放": "Interest rate term structure, unavailable",
  "利率期限结构": "Rate term structure",
  "未开放": "Unavailable",
  "［1］SFC《单位信托及互惠基金守则》8.2(f)": "[1] SFC Code on Unit Trusts and Mutual Funds 8.2(f)",
  "「60 天」「120 天」": "“60 days” “120 days”",
  "组合 WAM 不超过60天、WAL不超过120天。填写更低上限时，按较低值计算；留空仍应用监管上限。": "Portfolio WAM ≤ 60 days and WAL ≤ 120 days. Lower entered limits apply; blank fields retain regulatory limits.",
  "「10%」「可增至 25%」": "“10%” “May increase to 25%”",
  "同一实体的金融工具及存款合计一般不超过NAV的10%。具规模的财务机构且投资总额不超过其股本及非分派资本储备的10%时，可提高至25%；具体适用值由用户填写。": "Instruments and deposits of one entity are generally limited to 10% of NAV. The limit may rise to 25% for substantial financial institutions where exposure does not exceed 10% of their share capital and non-distributable reserves. Enter the applicable limit.",
  "［3］SFC 8.2(g)(a)及注释(2)": "[3] SFC 8.2(g)(a), Note (2)",
  "同一集团内实体合计一般不超过NAV的20%。满足具规模财务机构及相关资本10%限制等条件时可提高至25%。各机构共同占用集团额度。": "Group exposure is generally limited to 20% of NAV; 25% may apply subject to substantial financial institution and capital conditions. Group members share the limit.",
  "［4］SFC 8.2(n)注释(3)": "[4] SFC 8.2(n), Note (3)",
  "「定期进行压力测试」": "“Regular stress testing”",
  "守则要求流动性压力测试。此处压力比例、5%现金参考目标及压力后额度公式是本工具的设置，不是SFC规定的固定数值，也不等同每日／每周流动资产要求。": "Liquidity stress testing is required. Stress percentages, the 5% cash reference and stressed-capacity formulas are tool assumptions, not fixed SFC thresholds or daily/weekly liquidity requirements.",
  "银行报价或用户自行设置的本次可投金额上限，不是SFC固定额度。留空表示不设报价额度，0表示不可投；机构、集团和期限限制仍独立适用。": "Quote caps are supplied by banks or users. Blank means uncapped; 0 means unavailable. Entity, group and maturity limits still apply.",
  "［口径］数据校验": "[Basis] Data validation",
  "金额非负、持仓合计与AUM一致等属于本工具的数据校验；集中度计算以AUM等于NAV为前提。": "Amounts must be non-negative and holdings must reconcile to AUM. Concentration calculations assume AUM equals NAV.",
  "口径与限制依据": "Calculation basis and limits",
  "· 原文摘录：": "· Excerpt:",
  "全部指标由持仓推导。": "All metrics are derived from holdings.",
  "仅 WAM／WAL 手填，其余由持仓推导。": "Enter portfolio WAM/WAL; all other metrics derive from holdings.",
  "汇总指标手填，不校验集中度。": "Enter aggregate metrics; concentration is not checked.",

"版本管理": "Versions",
"工作版本": "Workspace versions",
"保存当前为新版本": "Save current as new version",
"保存多个工作版本，按时间查看和恢复": "Save, name and restore workspace versions",
"默认以保存时间命名，可以重命名。恢复不会删除任何已保存版本，清空工作区也不会删除版本。": "Versions are named by save time and can be renamed. Restoring or clearing the workspace does not delete saved versions.",
"还没有保存的版本，点击“保存当前为新版本”开始。": "No saved versions. Choose Save current as new version to begin.",
"版本名称": "Version name",
"确认命名": "Save name",
"重命名": "Rename",
"恢复此版本": "Restore this version",
"仅保存在当前浏览器，每次保存新增一个版本。": "Stored in this browser only. Each save creates a new version.",
"恢复所选版本？": "Restore selected version?",
"将用此版本替换当前全部内容，未保存的修改会丢失。": "This version will replace the current workspace. Unsaved changes will be lost.",
"已保存为新版本，之前的版本已保留。": "Saved as a new version. Previous versions are kept.",
"找不到此版本，请重新选择。": "Version not found. Please select again.",
"版本名称已更新。": "Version renamed.",
"重命名失败，请检查名称或本机存储。": "Rename failed. Check the name or browser storage.",
"版本列表读取失败，原存档未更改。": "Could not read saved versions. Existing saves are unchanged.",
"保存": "Save",
"恢复保存": "Restore saved",
"上次保存": "Last saved",
"尚未保存": "Not saved yet",
"仅保存在当前浏览器，保存会更新本机存档。": "Saved in this browser only. Saving replaces the local snapshot.",
"恢复上次保存？": "Restore the last save?",
"将用本机存档替换当前全部内容，未保存的修改会丢失。": "Replace the current workspace with the local save. Unsaved changes will be lost.",
"确认恢复": "Restore",
"当前内容已保存到本机": "Workspace saved locally",
"已恢复保存的全部内容": "Saved workspace restored",
"本机还没有保存记录。": "No saved workspace in this browser.",
"保存失败：本机存储不可用或空间不足，原存档未覆盖。": "Save failed: browser storage is unavailable or full. The previous save was not replaced.",
"恢复失败：存档损坏或版本不兼容，当前内容未更改。": "Restore failed: the save is damaged or incompatible. Current content is unchanged.",
"将清空当前持仓、机构、报价、组合参数和测算结果，无法撤销。本机保存的机构库和工作存档将保留。": "This clears current holdings, institutions, quotes, portfolio inputs and results. This cannot be undone. The saved institution library and workspace snapshot will be kept.",
"粘贴报价表": "Paste quote table",
"报价表内容": "Quote table content",
"导入报价": "Import quotes",
"家银行": "banks",
"条报价": "quotes",
"导入将替换今日报价，矩阵显示本次导入机构；保留当前组合参数、持仓和机构库。空白不生成报价，额度为无限制。": "Import replaces today\u2019s quotes and shows imported institutions in the matrix. Portfolio inputs, holdings and the institution library are preserved. Blank cells create no quotes; caps are unlimited.",
"报价视图": "Quote view",
"银行 × 期限": "Bank \u00d7 tenor",
"明细与额度": "Details & caps",
"请先选择机构": "Select institutions first",
"在矩阵中直接填写利率（%），留空表示无报价，0 表示零利率。额度默认无限制，可在“明细与额度”中修改。两种视图使用同一份报价。": "Enter rates (%) in the matrix. Blank means no quote; 0 means a zero rate. New quotes have no cap. Edit caps in Details & caps. Both views share the same quotes.",
"月份期限按表头天数测算（1M = 30天）；可在明细中调整实际 WAM/WAL。非标准期限自动追加列，同机构同期限的多条报价分别保留。": "Monthly tenors use the displayed day counts (1M = 30 days). Adjust actual WAM/WAL in Details. Non-standard tenors get extra columns; multiple quotes for the same bank and tenor are kept separately.",
"机构管理": "Institutions",
"管理机构": "Manage institutions",
"已有机构管理": "Institution library",
"04 · 机构管理": "04 \u00b7 Institutions",
"集中管理常用机构，供持仓与报价选择": "Manage saved institutions for holdings and quotes",
"编辑机构": "Edit institution",
"删除机构": "Delete institution",
"编辑": "Edit",
"删除": "Delete",
"保存修改": "Save changes",
"已保存机构": "Saved institutions",
"收录当前机构": "Import current institutions",
"返回机构集中度汇总": "Return to institution concentration",
"请先到机构管理新增机构": "Add an institution in Institutions first",
"还没有保存的机构，请在上方新增。": "No saved institutions yet. Add one above.",
"机构名称已存在，请使用其他名称。": "This institution name already exists. Please use another name.",
"保存到机构库后，可在机构集中度汇总中选择加入。": "Save to the library, then select it in the institution concentration summary.",
"已保存到机构库，可在机构集中度汇总中选择加入。": "Saved to the library. You can now select it in the institution concentration summary.",
"已从机构库删除；当前持仓、报价和测算机构保持不变。": "Deleted from the library. Current holdings, quotes and planning institutions are unchanged.",
"已收录当前机构，重复名称会自动跳过。": "Current institutions imported. Duplicate names were skipped.",
"机构库用于下次选择。编辑名称、默认上限或删除机构，不会更改已加入测算的机构、持仓和报价。": "The library is used for future selections. Editing names or default limits, or deleting entries, does not change institutions, holdings or quotes already in the plan.",
"清空所有": "Clear all",
"确认清空所有？": "Clear all data?",
"确认清空": "Confirm clear",
"取消": "Cancel",
"将清空当前持仓、机构、报价、组合参数和测算结果，无法撤销。本机保存的机构库将保留。": "This clears current holdings, institutions, quotes, portfolio inputs and results. This cannot be undone. Your saved institution library will be kept.",
"简易模式": "Simple mode",
"持仓模式": "Holdings mode",
"输入模式": "Input mode",
"无限制": "Unlimited",
"报价机构": "Quote institutions",
"简易模式：手动输入组合指标，不应用持仓对账、现金压力及机构集中度约束。期限上限和报价额度仍然有效。": "Simple mode: enter portfolio metrics manually. Holdings reconciliation, cash stress and institution concentration constraints do not apply. Maturity limits and quote caps still apply.",
"简易模式不计算机构集中度；以下机构仅用于报价归属。": "Simple mode does not calculate institution concentration. These institutions identify quote issuers only.",
"简易模式结果未校验机构集中度及现金压力。": "Simple mode results do not check institution concentration or cash stress.",
"报价额度留空表示无限制，填 0 表示不可投。WAL 填剩余最终到期天数。WAM 留空时自动按 WAL 处理；仅在已确认浮息工具可按下一次利率重定价计量时，填写更短的 WAM 天数。报价额度与 AUM 使用同一绝对金额单位。": "Leave the quote cap blank for no limit; enter 0 to disable investment. WAL is days to final maturity. Blank WAM uses WAL; use shorter WAM only for confirmed floating-rate instruments measured to the next rate reset. Quote caps and AUM use the same amount unit.",
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
  十亿元: 'Billion',
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
  已建模约束通过: 'Modeled constraints satisfied',
  测算范围: 'Model scope',
  '仅校验已建模约束，不代表全面合规审查。': 'Checks cover modeled constraints only, not a full compliance review.',
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
    pattern: /^已录入 (.+) \/ AUM (.+) (元|万元|百万元|亿元|十亿元)$/,
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
    pattern: /^(赎回|新增) (.+) (元|万元|百万元|亿元|十亿元)$/,
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
    pattern: /^余量 (.+) (元|万元|百万元|亿元|十亿元)$/,
    replace: (amount, unit) =>
      `Remaining capacity ${amount} ${englishUnit(unit)}`,
  },
  {
    pattern: /^(.+) (元|万元|百万元|亿元|十亿元)$/,
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
    pattern: /^(.+)当前金额，单位(元|万元|百万元|亿元|十亿元)$/,
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
  source = source.replace(/\bBillion\b/g, '十亿元');
  if (locale === 'zh-CN' || !source) return source;
  return locale === 'zh-HK' ? toTraditional(source) : toEnglish(source);
}
