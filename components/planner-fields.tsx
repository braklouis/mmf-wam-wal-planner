'use client';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { number } from '@/lib/planner';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/components/i18n-provider';
import { normalizeNumericInput } from '@/lib/numeric-input';
function numericDraft(value: number | null) {
  return value === null || !Number.isFinite(value) ? '' : String(value);
}

function parseNumericDraft(value: string) {
  if (value === '' || value === '-' || value === '.' || value === '-.') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? (parsed === 0 ? 0 : parsed) : null;
}

type EditableNumberInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'inputMode' | 'value' | 'onChange'
> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
};

export function EditableNumberInput({
  value,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: EditableNumberInputProps) {
  const [draft, setDraft] = useState(() => numericDraft(value));
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setDraft(numericDraft(value));
  }, [value]);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={props.readOnly ? (value === null || !Number.isFinite(value) ? '—' : number(value, 3)) : draft}
      onFocus={(event) => {
        editing.current = !props.readOnly;
        onFocus?.(event);
      }}
      onChange={(event) => {
        if (props.readOnly) return;
        const next = normalizeNumericInput(event.target.value);
        if (next === null) return;
        setDraft(next);
        onValueChange(parseNumericDraft(next));
      }}
      onBlur={(event) => {
        editing.current = false;
        if (props.readOnly) { onBlur?.(event); return; }
        const parsed = parseNumericDraft(draft);
        setDraft(parsed === null ? '' : String(parsed));
        if (!Object.is(parsed, value)) onValueChange(parsed);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        onKeyDown?.(event);
      }}
    />
  );
}

export function NumberField({
  label,
  value,
  suffix,
  onChange,
  optional,
  min,
  max,
  error,
  warning,
  warningTone = 'yellow',
  readOnly = false,
}: {
  label: string;
  value: number | null;
  suffix: string;
  onChange: (value: number | null) => void;
  optional?: boolean;
  min?: number;
  max?: number;
  error?: string | null;
  warning?: string | null;
  warningTone?: 'yellow' | 'red';
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const fallbackError =
    value === null
      ? optional
        ? null
        : `${label}不能为空。`
      : !Number.isFinite(value)
        ? `${label}必须是有效数字。`
        : null;
  const validationError = error ?? fallbackError;
  const isRed = Boolean(validationError || (warning && warningTone === 'red'));
  const isYellow = Boolean(warning && warningTone === 'yellow' && !isRed);

  return (
    <label
      className={`grid gap-1.5 rounded-md border p-2 ${
        isRed
          ? 'border-red-300 bg-red-50'
          : isYellow
            ? 'border-yellow-300 bg-yellow-100/80'
            : 'border-transparent'
      }`}
    >
      <span className="flex justify-between text-sm font-medium text-foreground/85">
        {t(label)}
        {readOnly ? (
          <span className="text-xs font-normal text-muted-foreground">
            {t('自动计算')}
          </span>
        ) : optional ? (
          <span className="text-xs font-normal text-muted-foreground/75">
            {t('可留空')}
          </span>
        ) : null}
      </span>
      <span className="relative">
        <EditableNumberInput
          readOnly={readOnly}
          min={min}
          max={max}
          step="0.01"
          value={value}
          onValueChange={readOnly ? () => {} : onChange}
          aria-invalid={validationError ? true : undefined}
          className={`h-10 rounded-md pr-12 text-base ${
            isRed
              ? 'border-red-300 bg-red-50 text-red-950 focus-visible:border-red-500 focus-visible:ring-red-500/15'
              : isYellow
                ? 'border-yellow-300 bg-yellow-50 text-foreground focus-visible:border-yellow-500 focus-visible:ring-yellow-500/15'
                : readOnly
                  ? 'cursor-default border-border bg-muted text-muted-foreground dark:bg-muted focus-visible:border-border focus-visible:ring-0'
                  : 'border-border bg-card focus-visible:border-primary focus-visible:ring-primary/20'
          }`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground/75">
          {t(suffix)}
        </span>
      </span>
      {validationError ? (
        <span role="alert" className="text-xs font-medium text-red-600">
          {t(validationError)}
        </span>
      ) : warning ? (
        <span
          aria-live="polite"
          className={`text-xs font-medium ${
            warningTone === 'red' ? 'text-red-700' : 'text-yellow-800'
          }`}
        >
          {t(warning)}
        </span>
      ) : null}
    </label>
  );
}

export function Metric({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      className={`rounded-md border p-4 ${
        accent ? 'border-border border-l-2 border-l-primary bg-card' : 'border-border bg-card'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t(label)}
      </p>
      <p className="mt-2 text-2xl font-medium tracking-tight">{t(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t(detail)}</p>
    </div>
  );
}

