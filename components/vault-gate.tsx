'use client';
import { useI18n } from '@/components/i18n-provider';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EncryptedVault, VAULT_KEY } from '@/lib/encrypted-vault';

export function VaultGate({ children }: { children: (vault: EncryptedVault, lock: () => void) => ReactNode }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'loading' | 'create' | 'unlock'>('loading');
  const [vault, setVault] = useState<EncryptedVault | null>(null);
  const active = useRef<EncryptedVault | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      if (!crypto.subtle || !navigator.locks) throw new Error('请通过 localhost 或 HTTPS 安全连接使用支持加密的现代浏览器。');
      const initialMode = localStorage.getItem(VAULT_KEY) === null ? 'create' : 'unlock';
      queueMicrotask(() => setMode(initialMode));
    } catch (err) { queueMicrotask(() => setError(err instanceof Error ? err.message : '无法访问本机存储。')); }
    const close = () => { active.current?.close(); active.current = null; setVault(null); setMode('unlock'); };
    const warn = (event: BeforeUnloadEvent) => { if (active.current?.isSaving) { event.preventDefault(); } };
    window.addEventListener('beforeunload', warn);
    window.addEventListener('pagehide', close);
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('pagehide', close); active.current?.close(); };
  }, []);
  const lock = () => {
    if (vault?.isSaving) { window.alert(t('正在加密保存，请稍候再锁定。')); return; }
    if (!window.confirm(t('锁定后未保存的工作内容会清除。请先保存需要保留的内容，确定锁定？'))) return;
    vault?.close(); setVault(null); setMode('unlock'); setError('');
  };
  if (vault) return children(vault, lock);
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <form className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm" onSubmit={async event => {
      event.preventDefault();
      if (busy || mode === 'loading') return;
      setBusy(true); setError('');
      try {
        const unlocked = await navigator.locks.request(VAULT_KEY, () => EncryptedVault.open(localStorage, mode === 'create'));
        active.current = unlocked; setVault(unlocked);
      } catch { setError(mode === 'create' ? '创建失败：请确认本机存储有可用空间。原有数据不会被明文覆盖。' : '无法使用固定成立日期口令解锁：存档可能使用旧密码、已经损坏，或本机存储不可用。原存档未覆盖。'); }
      finally { setBusy(false); }
    }}>
      <LockKeyhole className="h-9 w-9 text-primary" />
      <div><h1 className="text-2xl font-semibold">{mode === 'create' ? t('初始化加密保险库') : t('解锁 MMF 配置台')}</h1><p className="mt-2 text-sm text-muted-foreground">{mode === 'create' ? t('已有存档、机构库和集团资料会迁移至加密保险库。设置前请关闭此软件的其他页面。') : t('使用统一口令解锁本机的存档和机构库。')}</p></div>
      {mode !== 'loading' && <><p className="text-sm text-muted-foreground">{t('所有加密内容统一使用高腾国际成立日期（YYYYMMDD）作为口令，无需另设密码。')}</p>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? t('正在处理…') : mode === 'create' ? t('初始化并加密') : t('解锁')}</Button></>}
      {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
    </form>
  </main>;
}
