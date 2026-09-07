'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EncryptedVault, VAULT_KEY } from '@/lib/encrypted-vault';

export function VaultGate({ children }: { children: (vault: EncryptedVault, lock: () => void) => ReactNode }) {
  const [mode, setMode] = useState<'loading' | 'create' | 'unlock'>('loading');
  const [vault, setVault] = useState<EncryptedVault | null>(null);
  const active = useRef<EncryptedVault | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      if (!crypto.subtle || !navigator.locks) throw new Error('请通过 localhost 或 HTTPS 安全连接使用支持加密的现代浏览器。');
      const initialMode = localStorage.getItem(VAULT_KEY) === null ? 'create' : 'unlock';
      queueMicrotask(() => setMode(initialMode));
    } catch (err) { queueMicrotask(() => setError(err instanceof Error ? err.message : '无法访问本机存储。')); }
    const close = () => { active.current?.close(); active.current = null; setVault(null); setMode('unlock'); setPassword(''); setConfirmation(''); };
    const warn = (event: BeforeUnloadEvent) => { if (active.current?.isSaving) { event.preventDefault(); } };
    window.addEventListener('beforeunload', warn);
    window.addEventListener('pagehide', close);
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('pagehide', close); active.current?.close(); };
  }, []);
  const lock = () => {
    if (vault?.isSaving) { window.alert('正在加密保存，请稍候再锁定。'); return; }
    if (!window.confirm('锁定后未保存的工作内容会清除。请先保存需要保留的内容，确定锁定？')) return;
    vault?.close(); setVault(null); setMode('unlock'); setError('');
  };
  if (vault) return children(vault, lock);
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <form className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm" onSubmit={async event => {
      event.preventDefault();
      if (busy || mode === 'loading') return;
      if (mode === 'create' && password !== confirmation) { setError('两次输入的密码不一致。'); return; }
      setBusy(true); setError('');
      try {
        const unlocked = await navigator.locks.request(VAULT_KEY, () => EncryptedVault.open(localStorage, password, mode === 'create'));
        active.current = unlocked; setVault(unlocked); setPassword(''); setConfirmation('');
      } catch { setError(mode === 'create' ? '创建失败：密码需至少 12 个字符，并请确认本机存储有可用空间。原有数据不会被明文覆盖。' : '无法解锁：密码错误、存档损坏或本机存储不可用。原存档未覆盖。'); }
      finally { setBusy(false); }
    }}>
      <LockKeyhole className="h-9 w-9 text-primary" />
      <div><h1 className="text-2xl font-semibold">{mode === 'create' ? '设置保险库密码' : '解锁 MMF 配置台'}</h1><p className="mt-2 text-sm text-muted-foreground">{mode === 'create' ? '已有存档、机构库和集团资料会迁移至加密保险库。设置前请关闭此软件的其他页面。' : '输入密码，解锁本机的存档和机构库。'}</p></div>
      {mode !== 'loading' && <><label htmlFor="vault-password" className="block space-y-2"><span>密码</span><Input id="vault-password" type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required minLength={mode === 'create' ? 12 : undefined} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
      {mode === 'create' && <label htmlFor="vault-confirmation" className="block space-y-2"><span>确认密码</span><Input id="vault-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} /></label>}
      <p className="text-sm text-muted-foreground">密码不会保存，忘记后无法恢复数据。请使用较长且独有的密码，并妥善保管。</p>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? '正在处理…' : mode === 'create' ? '设置密码并加密' : '解锁'}</Button></>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  </main>;
}
