'use client';
import { useI18n } from '@/components/i18n-provider';
import { ConstraintNotes } from '@/components/constraint-notes';
import { useState } from 'react';
import type { BankTemplate } from '@/lib/planner';
import type { InstitutionGroup } from '@/lib/group-registry';
import { concentrationKey } from '@/lib/concentration-groups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  institutions: BankTemplate[]; groups: InstitutionGroup[];
  onSaveInstitution: (institution: BankTemplate) => void;
  onDeleteInstitution: (id: string) => void;
  onSaveGroup: (group: InstitutionGroup) => void;
  onDeleteGroup: (id: string) => void;
  groupInUse: (name: string) => boolean;
};
const emptyInstitution = { id: '', name: '', entityName: '', groupName: '', defaultLimitPct: 10 };
const emptyGroup = { id: '', name: '', limitPct: 25 };
export function InstitutionManager({ institutions, groups, onSaveInstitution, onDeleteInstitution, onSaveGroup, onDeleteGroup, groupInUse }: Props) {
  const { t } = useI18n();
  const [institution, setInstitution] = useState<BankTemplate>(emptyInstitution);
  const [group, setGroup] = useState<InstitutionGroup>(emptyGroup);
  const duplicateInstitution = institutions.some(b => b.id !== institution.id && concentrationKey(b.name) === concentrationKey(institution.name));
  const duplicateGroup = groups.some(g => g.id !== group.id && concentrationKey(g.name) === concentrationKey(group.name));
  const invalidLimit = (value: number) => !Number.isFinite(value) || value < 0 || value > 25;
  return <div className="space-y-6">
    <section className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="font-semibold">{institution.id ? t('编辑机构（实体）') : t('新增机构（实体）')}</h3>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); if (!institution.name.trim() || duplicateInstitution || invalidLimit(institution.defaultLimitPct)) return; onSaveInstitution({ ...institution, id: institution.id || crypto.randomUUID(), name: institution.name.trim(), entityName: institution.entityName?.trim() || institution.name.trim(), groupReviewRequired: false }); setInstitution(emptyInstitution); }}>
        <label htmlFor="institution-name" className="grid gap-1 text-sm">{t("机构名称")}<Input id="institution-name" required value={institution.name} onChange={e => setInstitution({ ...institution, name: e.target.value })} /></label>
        <label htmlFor="institution-entity" className="grid gap-1 text-sm">{t("实体全称")}<Input id="institution-entity" placeholder={t("留空使用机构名称")} value={institution.entityName ?? ''} onChange={e => setInstitution({ ...institution, entityName: e.target.value })} /></label>
        <label htmlFor="institution-group" className="grid gap-1 text-sm">{t("所属集团")}<select id="institution-group" className="h-10 rounded-xl border border-border bg-background px-3" value={institution.groupName ?? ''} onChange={e => setInstitution({ ...institution, groupName: e.target.value })}><option value="">{t("未设置")}</option>{groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select></label>
        <label htmlFor="institution-limit" className="grid gap-1 text-sm">{t("机构上限（%）［2］")}<Input id="institution-limit" type="number" required min={0} max={25} step="0.01" value={Number.isFinite(institution.defaultLimitPct) ? institution.defaultLimitPct : ''} onChange={e => setInstitution({ ...institution, defaultLimitPct: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
        {duplicateInstitution && <p role="alert" className="text-sm text-destructive">{t("机构名称已存在。")}</p>}
        <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={!institution.name.trim() || duplicateInstitution || invalidLimit(institution.defaultLimitPct)}>{institution.id ? t('保存机构') : t('新增机构（实体）')}</Button>{institution.id && <Button type="button" variant="outline" onClick={() => setInstitution(emptyInstitution)}>{t("取消")}</Button>}</div>
      </form>
      <details><summary className="cursor-pointer text-sm font-medium">{t("已保存机构（")}{institutions.length}）</summary><div className="mt-3 divide-y divide-border">
        {institutions.map(bank => <div key={bank.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="font-medium">{bank.name}</p>{bank.entityName && bank.entityName !== bank.name && <p className="text-xs text-muted-foreground">{bank.entityName}</p>}<p className="text-sm text-muted-foreground">{bank.groupName || t('未设置集团')}{t("· 上限")}{bank.defaultLimitPct}%</p></div>
          <div className="flex gap-2"><Button variant="outline" size="sm" aria-label={`${t('编辑机构')} ${bank.name}`} onClick={() => { setInstitution(bank); document.getElementById('institution-name')?.focus(); }}>{t("编辑")}</Button><Button variant="ghost" size="sm" className="text-destructive" aria-label={`${t('删除机构')} ${bank.name}`} onClick={() => { onDeleteInstitution(bank.id); if (institution.id === bank.id) setInstitution(emptyInstitution); }}>{t("删除")}</Button></div>
        </div>)}
        {!institutions.length && <p className="py-4 text-sm text-muted-foreground">{t("尚未新增机构。")}</p>}
      </div></details>
      <ConstraintNotes items={['entity']} />
    </section>
    <section className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="font-semibold">{group.id ? t('编辑集团') : t('新增集团')}</h3>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); if (!group.name.trim() || duplicateGroup || invalidLimit(group.limitPct)) return; onSaveGroup({ ...group, id: group.id || crypto.randomUUID(), name: group.name.trim() }); setGroup(emptyGroup); }}>
        <label htmlFor="group-name" className="grid gap-1 text-sm">{t("集团名称")}<Input id="group-name" required value={group.name} onChange={e => setGroup({ ...group, name: e.target.value })} /></label>
        <label htmlFor="group-limit" className="grid gap-1 text-sm">{t("集团上限（%）［3］")}<Input id="group-limit" type="number" required min={0} max={25} step="0.01" value={Number.isFinite(group.limitPct) ? group.limitPct : ''} onChange={e => setGroup({ ...group, limitPct: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
        {duplicateGroup && <p role="alert" className="text-sm text-destructive">{t("集团名称已存在。")}</p>}
        <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={!group.name.trim() || duplicateGroup || invalidLimit(group.limitPct)}>{group.id ? t('保存集团') : t('新增集团')}</Button>{group.id && <Button type="button" variant="outline" onClick={() => setGroup(emptyGroup)}>{t("取消")}</Button>}</div>
      </form>
      <details><summary className="cursor-pointer text-sm font-medium">{t("已保存集团（")}{groups.length}）</summary><div className="mt-3 divide-y divide-border">{groups.map(g => <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{g.name}</p><p className="text-sm text-muted-foreground">{t("上限")}{g.limitPct}% · {institutions.filter(b => concentrationKey(b.groupName ?? '') === concentrationKey(g.name)).length}{t("个机构")}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" aria-label={`${t('编辑集团')} ${g.name}`} onClick={() => { setGroup(g); document.getElementById('group-name')?.focus(); }}>{t("编辑")}</Button><Button size="sm" variant="ghost" className="text-destructive" aria-label={`${t('删除集团')} ${g.name}`} disabled={groupInUse(g.name)} title={t(groupInUse(g.name) ? '请先将所属机构移出该集团' : '删除集团')} onClick={() => { onDeleteGroup(g.id); if (group.id === g.id) setGroup(emptyGroup); }}>{t("删除")}</Button></div></div>)}{!groups.length && <p className="py-4 text-sm text-muted-foreground">{t("尚未新增集团。")}</p>}</div></details>
      <ConstraintNotes items={['group']} />
    </section>
  </div>;
}
