'use client';

import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import type { Worker } from 'tesseract.js';
import { Button } from '@/components/ui/button';
import { recognizeQuoteImage } from '@/lib/quote-image';
import { ocrWordsToQuoteTable } from '@/lib/quote-ocr';

export function QuoteImageImport({ onText, t }: { onText: (text: string) => void; t: (text: string) => string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [language, setLanguage] = useState('eng');
  const workerRef = useRef<Worker | null>(null);
  const generation = useRef(0);
  const running = useRef(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { generation.current++; void workerRef.current?.terminate(); }, []);

  function select(image: File) {
    if (running.current) return;
    setError(''); setStatus(''); setWarnings([]);
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/bmp'].includes(image.type) || image.size > 10 * 1024 * 1024) {
      setError('请选择不超过 10 MB 的 PNG、JPEG、WebP 或 BMP 图片。'); return;
    }
    setFile(image); setPreview(URL.createObjectURL(image));
  }
  function paste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const image = Array.from(event.clipboardData.items).find(item => item.type.startsWith('image/'))?.getAsFile();
    if (image) { event.preventDefault(); select(image); }
  }
  function cancel() {
    generation.current++; running.current = false;
    void workerRef.current?.terminate(); workerRef.current = null;
    setBusy(false); setStatus('已取消识别');
  }
  async function recognize() {
    if (!file || running.current) return;
    const id = ++generation.current;
    running.current = true; setBusy(true); setError(''); setWarnings([]); setStatus('正在加载识别资源…');
    let worker: Worker | undefined;
    const timeout = window.setTimeout(() => {
      if (id !== generation.current) return;
      cancel(); setError('识别超时，请检查网络或裁剪图片后重试。');
    }, 120000);
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker(language, 1, { logger: message => {
        if (id === generation.current && message.status === 'recognizing text') setStatus(`正在识别 ${Math.round(message.progress * 100)}%`);
      } });
      if (id !== generation.current) return;
      workerRef.current = worker;
      const { words, warnings: reviewWarnings } = await recognizeQuoteImage(file, worker, () => id === generation.current, stage => { if (id === generation.current) setStatus(stage); }, language === 'eng');
      if (id !== generation.current) return;
      const text = ocrWordsToQuoteTable(words);
      onText(text); setWarnings(reviewWarnings);
      setStatus('识别结果已填入下方，请逐项核对机构、期限和小数点后导入。');
    } catch (cause) {
      if (id === generation.current) { setStatus(''); setError(cause instanceof Error ? cause.message : '识别失败，请检查网络或换一张清晰截图。'); }
    } finally {
      window.clearTimeout(timeout);
      if (worker) await worker.terminate().catch(() => {});
      if (id === generation.current) { workerRef.current = null; running.current = false; setBusy(false); }
    }
  }
  return <div className="grid gap-3 rounded-lg border border-dashed border-border p-3 focus-visible:outline-2 focus-visible:outline-ring">
    <p className="text-sm">{t('点击此处后粘贴报价截图（⌘V / Ctrl+V），或选择图片。请包含银行和期限表头。')}</p>
    <textarea aria-label={t('粘贴报价截图')} placeholder={t('点击此处粘贴截图')} onPaste={paste} readOnly disabled={busy} className="h-12 resize-none rounded border border-border bg-card p-3 text-sm" />
    <input type="file" aria-label={t('选择报价图片')} accept="image/png,image/jpeg,image/webp,image/bmp" disabled={busy} onChange={event => { const image = event.target.files?.[0]; if (image) select(image); event.target.value = ''; }} className="max-w-full text-sm" />
    <p className="text-sm text-muted-foreground">{t('图片在浏览器内识别，不上传。首次使用需联网下载识别资源，可能需要稍等。')}</p>
    {/* Local blob preview must retain the original image without an optimization request. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {preview && <img src={preview} alt={t('待识别的报价截图')} className="max-h-64 max-w-full rounded border border-border object-contain object-left" />}
    <label className="flex items-center gap-2 text-sm">{t('机构名称语言')}<select aria-label={t('机构名称语言')} value={language} disabled={busy} onChange={event => setLanguage(event.target.value)} className="rounded border border-border bg-card p-2"><option value="eng">{t('英文 / 银行简称')}</option><option value="eng+chi_sim+chi_tra">{t('中文及英文')}</option></select></label>
    <div className="flex gap-2"><Button type="button" variant="outline" disabled={!file || busy} onClick={() => void recognize()}>{t('识别图片')}</Button>{busy && <Button type="button" variant="outline" onClick={cancel}>{t('取消识别')}</Button>}</div>
    {status && <output className="text-sm">{t(status)}</output>}
    {warnings.length > 0 && <details className="text-sm"><summary>{t('部分文字在重复识别中不一致，请对照原图核对')}（{warnings.length}）</summary><ul className="mt-2 max-h-40 overflow-auto">{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
    {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
  </div>;
}
