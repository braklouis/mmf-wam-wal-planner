'use client';

import katex from 'katex';
import 'katex/dist/katex.min.css';

/** Only application-generated TeX is accepted; KaTeX trust remains disabled. */
export function MathFormula({ formula }: { formula: string }) {
  const html = katex.renderToString(formula, { displayMode: true, throwOnError: false, trust: false, output: 'htmlAndMathml' });
  return <div className="overflow-x-auto py-2 text-sm [&_.katex-display]:my-2 [&_.katex-display]:text-left" dangerouslySetInnerHTML={{ __html: html }} />;
}
