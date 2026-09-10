export type OCRWord = {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

const BANK_HEADERS = new Set(['BANK', '银行', '銀行', '机构', '機構']);
const TERMS = new Set(['CASA', 'O/N', '1W', '2W', '1M', '2M', '3M', '4M', '5M', '6M', '8M', '9M']);

type Row = { words: OCRWord[]; centerY: number; height: number };

function clean(text: string) {
  return text.replace(/^\uFEFF/, '').trim();
}

function center(word: OCRWord) {
  return { x: (word.bbox.x0 + word.bbox.x1) / 2, y: (word.bbox.y0 + word.bbox.y1) / 2 };
}

function rowsFromWords(words: OCRWord[]) {
  const rows: Row[] = [];
  for (const word of [...words].sort((a, b) => center(a).y - center(b).y || center(a).x - center(b).x)) {
    const point = center(word);
    const height = Math.max(1, word.bbox.y1 - word.bbox.y0);
    const row = rows.find(candidate => Math.abs(candidate.centerY - point.y) <= Math.max(3, Math.max(candidate.height, height) * 0.6));
    if (row) {
      row.words.push(word);
      row.centerY = row.words.reduce((sum, item) => sum + center(item).y, 0) / row.words.length;
      row.height = Math.max(row.height, height);
    } else rows.push({ words: [word], centerY: point.y, height });
  }
  return rows.map(row => ({ ...row, words: row.words.sort((a, b) => center(a).x - center(b).x) }));
}

function isRateWord(text: string) {
  return /\d/.test(text) || /[%％]/.test(text);
}

function isValidHeader(words: OCRWord[]) {
  const headerIndex = words.findIndex(word => BANK_HEADERS.has(clean(word.text).toUpperCase()));
  if (headerIndex !== 0) return false;
  const headers = words.slice(headerIndex).map(word => clean(word.text));
  const normalized = headers.map(text => text.toUpperCase());
  return headers.length >= 2
    && normalized.slice(1).every(term => TERMS.has(term))
    && new Set(normalized).size === normalized.length;
}

/** Converts OCR words into the tab-separated format consumed by parseQuoteTable. */
export function ocrWordsToQuoteTable(words: OCRWord[]) {
  if (!words.length) throw new Error('OCR 报价结果为空，无法识别报价表头。');
  const rows = rowsFromWords(words.filter(word => clean(word.text)));
  // A title can contain the word "Bank" without being the table header. Require
  // a complete, supported header before selecting a row as the header.
  const headerRow = rows.find(row => isValidHeader(row.words));
  if (!headerRow) throw new Error('无法识别报价表头：首列必须为 Bank、银行、銀行、机构或機構。');

  const headerWords = headerRow.words;
  const headerIndex = 0;
  const headers = headerWords.slice(headerIndex).map(word => clean(word.text));
  const normalized = headers.map(text => text.toUpperCase());
  if (headers.length < 2 || normalized.slice(1).some(term => !TERMS.has(term)) || new Set(normalized).size !== normalized.length) {
    throw new Error('无法识别报价表头：期限必须为支持的 CASA、O/N、1W、2W、1M 至 6M、8M 或 9M。');
  }

  const columnCenters = headerWords.slice(headerIndex).map(center).map(point => point.x);
  const boundaries = columnCenters.slice(0, -1).map((value, index) => (value + columnCenters[index + 1]) / 2);
  const columnFor = (x: number) => {
    const index = boundaries.findIndex(boundary => x < boundary);
    return index < 0 ? boundaries.length : index;
  };
  const output = [headers.join('\t')];
  for (const row of rows) {
    if (row.centerY <= headerRow.centerY) continue;
    const sorted = row.words;
    // Only a numeric token to the right of the bank column can be a quote.
    // This keeps numeric institution names such as PING2 in the bank cell.
    const firstRate = sorted.find(word => columnFor(center(word).x) > 0 && isRateWord(clean(word.text)));
    const bankWords = firstRate
      ? sorted.filter(word => center(word).x < center(firstRate).x)
      : sorted.filter(word => columnFor(center(word).x) === 0);
    const cells = Array.from({ length: headers.length }, () => [] as string[]);
    cells[0] = bankWords.map(word => clean(word.text));
    for (const word of sorted) {
      if (bankWords.includes(word)) continue;
      const index = columnFor(center(word).x);
      if (index < headers.length) cells[index].push(clean(word.text));
    }
    if (cells.some(cell => cell.length)) output.push(cells.map(cell => cell.join(' ')).join('\t'));
  }
  if (output.length === 1) throw new Error('OCR 报价结果中没有可用报价行。');
  return output.join('\n');
}
