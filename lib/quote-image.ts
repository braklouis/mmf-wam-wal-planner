import type { Worker } from 'tesseract.js';
import type { OCRWord } from './quote-ocr';

const TERMS = new Set(['CASA', 'O/N', '1W', '2W', '1M', '2M', '3M', '4M', '5M', '6M', '8M', '9M']);
const BANK_HEADERS = new Set(['BANK', '银行', '銀行', '机构', '機構']);

/** Remove pale spreadsheet fills/gridlines, then enlarge small screenshot text. */
function prepare(source: ImageBitmap, threshold: number, scale: number, rect = { x0: 0, y0: 0, x1: source.width, y1: source.height }) {
  const x = Math.max(0, Math.floor(rect.x0));
  const y = Math.max(0, Math.floor(rect.y0));
  const width = Math.min(source.width - x, Math.ceil(rect.x1) - x);
  const height = Math.min(source.height - y, Math.ceil(rect.y1) - y);
  const input = document.createElement('canvas');
  input.width = width; input.height = height;
  const context = input.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('浏览器无法处理图片，请更换浏览器后重试。');
  context.fillStyle = 'white'; context.fillRect(0, 0, width, height);
  context.drawImage(source, x, y, width, height, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const value = pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114 < threshold ? 0 : 255;
    pixels.data[i] = value; pixels.data[i + 1] = value; pixels.data[i + 2] = value;
  }
  context.putImageData(pixels, 0, 0);
  const output = document.createElement('canvas');
  output.width = Math.round(width * scale); output.height = Math.round(height * scale);
  const enlarged = output.getContext('2d');
  if (!enlarged) throw new Error('浏览器无法处理图片。');
  enlarged.imageSmoothingEnabled = true; enlarged.imageSmoothingQuality = 'high';
  enlarged.drawImage(input, 0, 0, output.width, output.height);
  return output;
}

export type QuoteOcrStage = { phase: 'prepare' | 'recognize' | 'headers' | 'cells'; completed?: number; total?: number };

export async function recognizeQuoteImage(file: File, worker: Worker, isCurrent: () => boolean, onStage: (stage: QuoteOcrStage) => void, englishNames = true) {
  const source = await createImageBitmap(file);
  try {
    if (source.width * source.height > 16_000_000) throw new Error('图片尺寸过大，请裁剪至报价表区域后重试。');
    const scale = Math.min(3, Math.sqrt(12_000_000 / (source.width * source.height)));
    onStage({ phase: 'prepare' });
    const image = prepare(source, 160, scale);
    await worker.setParameters({ tessedit_pageseg_mode: '3' as import('tesseract.js').PSM });
    onStage({ phase: 'recognize' });
    const { data } = await worker.recognize(image, {}, { blocks: true });
    if (!isCurrent()) throw new Error('已取消识别');
    const words: OCRWord[] = (data.blocks ?? []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines.flatMap(line => line.words)));
    const bank = words.find(word => BANK_HEADERS.has(word.text.trim().toUpperCase()));
    const warnings: string[] = [];
    if (bank) {
      const centerY = (bank.bbox.y0 + bank.bbox.y1) / 2;
      const height = bank.bbox.y1 - bank.bbox.y0;
      const headers = words.filter(word => word.bbox.x0 > bank.bbox.x1 && Math.abs((word.bbox.y0 + word.bbox.y1) / 2 - centerY) < height * 0.7);
      onStage({ phase: 'headers', completed: 0, total: headers.length });
      let completedHeaders = 0;
      await worker.setParameters({ tessedit_pageseg_mode: '7' as import('tesseract.js').PSM, tessedit_char_whitelist: '0123456789WMOCASN/' });
      for (const word of headers) {
        if (!isCurrent()) throw new Error('已取消识别');
        const rect = { x0: word.bbox.x0 / scale - 2, x1: word.bbox.x1 / scale + 2, y0: word.bbox.y0 / scale - 2, y1: word.bbox.y1 / scale + 2 };
        // Re-read the actual glyphs; never infer a missing term from column order.
        for (const threshold of [130, 100, 160]) {
          const crop = prepare(source, threshold, 8, rect);
          const { data: header } = await worker.recognize(crop);
          const term = header.text.replace(/\s/g, '').toUpperCase();
          if (TERMS.has(term)) { word.text = term; break; }
        }
        onStage({ phase: 'headers', completed: ++completedHeaders, total: headers.length });
      }
    }
    if (bank) {
      const headerY = (bank.bbox.y0 + bank.bbox.y1) / 2;
      const firstTerm = words.filter(word => word.bbox.x0 > bank.bbox.x1 && Math.abs((word.bbox.y0 + word.bbox.y1) / 2 - headerY) < (bank.bbox.y1 - bank.bbox.y0) * 0.7).sort((a, b) => a.bbox.x0 - b.bbox.x0)[0];
      const bankBoundary = firstTerm ? (bank.bbox.x1 + firstTerm.bbox.x0) / 2 : bank.bbox.x1;
      const body = words.filter(word => word.bbox.y0 > bank.bbox.y1);
      const reviewItems = body.filter(word => !((word.bbox.x0 + word.bbox.x1) / 2 < bankBoundary && (!englishNames || word.text.trim().toUpperCase() === 'MAX')));
      onStage({ phase: 'cells', completed: 0, total: reviewItems.length });
      for (let index = 0; index < reviewItems.length; index++) {
        if (!isCurrent()) throw new Error('已取消识别');
        const word = reviewItems[index];
        const isBank = (word.bbox.x0 + word.bbox.x1) / 2 < bankBoundary;

        await worker.setParameters({ tessedit_char_whitelist: isBank ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/' : '0123456789.%+-' });
        const rect = { x0: word.bbox.x0 / scale - 2, x1: word.bbox.x1 / scale + 2, y0: word.bbox.y0 / scale - 2, y1: word.bbox.y1 / scale + 2 };
        const original = word.text;
        const candidates: string[] = [];
        for (const threshold of [130, 160]) {
          const { data: cell } = await worker.recognize(prepare(source, threshold, 8, rect));
          const value = cell.text.replace(/\s/g, '');
          if (value && (isBank || /^[+-]?\d+(?:\.\d+)?%?$/.test(value))) candidates.push(value);
        }
        const matching = candidates.length === 2 && candidates[0] === candidates[1];
        if (matching) word.text = candidates[0];
        // Disagreements remain visible even when both enlarged reads agree.
        if (!matching || word.text.toUpperCase() !== original.toUpperCase()) {
          const y = (word.bbox.y0 + word.bbox.y1) / 2;
          const rowBank = body.filter(item => (item.bbox.x0 + item.bbox.x1) / 2 < bankBoundary).sort((a, b) => Math.abs((a.bbox.y0 + a.bbox.y1) / 2 - y) - Math.abs((b.bbox.y0 + b.bbox.y1) / 2 - y))[0];
          const terms = words.filter(item => Math.abs((item.bbox.y0 + item.bbox.y1) / 2 - headerY) < (bank.bbox.y1 - bank.bbox.y0) * 0.7 && item.bbox.x0 > bank.bbox.x1);
          const x = (word.bbox.x0 + word.bbox.x1) / 2;
          const term = terms.sort((a, b) => Math.abs((a.bbox.x0 + a.bbox.x1) / 2 - x) - Math.abs((b.bbox.x0 + b.bbox.x1) / 2 - x))[0];
          const location = isBank ? '机构名称' : `${rowBank?.text ?? '未知机构'} · ${term?.text ?? '未知期限'}`;
          warnings.push(`${location}：初读 ${original}，复核 ${matching ? word.text : candidates.join(' / ') || '未读清'}${matching ? '' : '（暂保留初读值）'}`);
        }
        onStage({ phase: 'cells', completed: index + 1, total: reviewItems.length });
      }
    }
    return { words, warnings };
  } finally { source.close(); }
}
