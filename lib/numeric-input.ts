/** Accept decimal drafts and unambiguous thousands separators; never treat a comma as a decimal point. */
export function normalizeNumericInput(raw: string): string | null {
  const value = raw.trim().replace(/，/g, ',');
  if (/^-?(?:\d+\.?\d*|\.\d*)?$/.test(value)) return value;
  if (/^-?\d{1,3}(?:,\d{3})+(?:\.\d*)?$/.test(value)) return value.replace(/,/g, '');
  return null;
}
