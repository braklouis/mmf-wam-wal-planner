/** Parse pasted spreadsheet cells or CSV without losing quoted separators or blank columns. */
export function parseDelimitedTable(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const delimiter = source.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false, closed = false;
  const pushCell = () => { row.push(cell.trim()); cell = ''; closed = false; };
  const pushRow = () => { pushCell(); if (row.some(Boolean)) rows.push(row); row = []; };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === delimiter) pushCell();
    else if (char === '\n' || char === '\r') { if (char === '\r' && source[i + 1] === '\n') i++; pushRow(); }
    else if (char === '"' && !cell.trim() && !closed) { cell = ''; quoted = true; }
    else if (closed && char.trim()) throw new Error('引号后的内容无效，请检查分隔符。');
    else cell += char;
  }
  if (quoted) throw new Error('引号未闭合，请检查表格。');
  pushRow();
  return rows;
}

export function parseImportNumber(text: string, percent = false): number {
  const normalized = text.trim().replace(/％/g, '%');
  const value = percent ? normalized.replace(/%$/, '') : normalized;
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value)) throw new Error('数字格式无效');
  const result = Number(value.replace(/,/g, ''));
  if (!Number.isFinite(result)) throw new Error('数字超出范围');
  return result;
}
