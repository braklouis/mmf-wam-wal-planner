'use client';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { useI18n } from '@/components/i18n-provider';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { EditableNumberInput } from '@/components/planner-fields';
import { number, percent, type FrontierMode, type FrontierPoint } from '@/lib/planner';
const frontierChartConfig = {
  ytm: {
    label: 'YTM',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export function FrontierPanel({
  mode,
  points,
  currentLimit,
  onSelect,
  targetYtm,
  targetYtmError,
  targetYtmMessage,
  onTargetYtmChange,
  onSolveTarget,
  disabled,
}: {
  mode: FrontierMode;
  points: FrontierPoint[];
  currentLimit: number | null;
  onSelect: (day: number) => void;
  targetYtm: number | null;
  targetYtmError: string | null;
  targetYtmMessage: string | null;
  onTargetYtmChange: (value: number | null) => void;
  onSolveTarget: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const label = mode.toUpperCase();
  const targetControl = (
    <form
      className="mt-4 rounded-md border border-primary/25 bg-muted/30 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSolveTarget();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor="target-ytm" className="min-w-44 flex-1">
          <span className="mb-1.5 block text-sm font-semibold text-foreground">
            {t('目标交易后 YTM')}
          </span>
          <span className="relative block">
            <EditableNumberInput
              id="target-ytm"
              aria-label={t('目标交易后YTM百分比')}
              aria-invalid={targetYtmError ? true : undefined}
              value={targetYtm}
              step="0.001"
              disabled={disabled}
              placeholder={t('例如 3.000')}
              onValueChange={onTargetYtmChange}
              className={`h-10 rounded-md pr-9 text-base ${
                targetYtmError
                  ? 'border-red-300 bg-red-50 text-red-950'
                  : 'border-primary/35 bg-card focus-visible:border-primary focus-visible:ring-primary/20'
              }`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground/75">
              %
            </span>
          </span>
        </label>
        <Button
          type="submit"
          disabled={disabled || targetYtm === null}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {t('反推期限与配置比例')}
          <ArrowRight />
        </Button>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {t('目标按“至少达到”处理；系统反推所选')}
        {label}{' '}
        {t('的最短上限和产品比例，另一项当前上限及 SFC 硬上限继续生效。')}［1］
      </p>
      {targetYtmError ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          {t(targetYtmError)}
        </p>
      ) : targetYtmMessage ? (
        <p aria-live="polite" className="mt-2 text-xs font-medium text-primary">
          {t(targetYtmMessage)}
        </p>
      ) : null}
    </form>
  );

  if (!points.length) {
    return (
      <div className="p-5">
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {t('当前组合在 SFC 的')}
            {label} {t('区间内没有可行点，请先放宽另一项期限约束或检查输入。')}
          </AlertTitle>
        </Alert>
        {targetControl}
      </div>
    );
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const plateau = points.find((point) => point.isPlateauStart) ?? last;
  const hasPlateau = plateau.day < last.day - 0.001;

  return (
    <div className="p-5">
      <div className="min-w-0">
        <ChartContainer
          config={frontierChartConfig}
          className="h-[290px] w-full cursor-crosshair aspect-auto"
          initialDimension={{ width: 760, height: 290 }}
        >
          <LineChart
            data={points}
            margin={{ top: 12, right: 18, bottom: 8, left: 4 }}
            onClick={(state) => {
              const day = Number(state?.activeLabel);
              if (Number.isFinite(day)) onSelect(day);
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="4 4" />
            <XAxis
              dataKey="day"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickCount={7}
              unit={t('天')}
            />
            <YAxis
              dataKey="ytm"
              type="number"
              domain={['auto', 'auto']}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={58}
              tickFormatter={(value) => `${Number(value).toFixed(2)}%`}
            />
            <ChartTooltip
              cursor={{
                stroke: 'var(--muted-foreground)',
                strokeDasharray: '4 4',
              }}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => (
                    <div className="grid min-w-36 gap-1">
                      <span className="text-muted-foreground">
                        {label}
                        {t('上限')}
                        {number(item.payload.day)}
                        {t('天')}
                      </span>
                      <span className="font-semibold text-foreground">
                        {t('最高 YTM')}
                        {percent(Number(value), 3)}
                      </span>
                      <span className="text-muted-foreground">
                        {t('实际 WAM')}
                        {number(item.payload.wam)}
                        {t('天 · WAL')} {number(item.payload.wal)}
                        {t('天')}
                      </span>
                      <span className="text-primary">
                        {t('较最紧点 +')}
                        {number((item.payload.ytm - first.ytm) * 100, 1)} bp
                      </span>
                      {item.payload.bindingConstraints?.length ? (
                        <span className="max-w-56 text-muted-foreground">
                          {t('约束：')}
                          {item.payload.bindingConstraints.map(t).join(t('、'))}
                        </span>
                      ) : null}
                    </div>
                  )}
                />
              }
            />
            {currentLimit !== null ? (
              <ReferenceLine
                x={currentLimit}
                ifOverflow="extendDomain"
                stroke="var(--chart-2)"
                strokeDasharray="5 4"
                label={{
                  value: t('当前选择'),
                  position: 'insideTopRight',
                  fill: 'var(--chart-2)',
                  fontSize: 12,
                }}
              />
            ) : null}
            {hasPlateau ? (
              <ReferenceLine
                x={plateau.day}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 4"
              />
            ) : null}
            {targetYtm !== null &&
            Number.isFinite(targetYtm) &&
            targetYtm >= first.ytm - 0.0001 &&
            targetYtm <= last.ytm + 0.0001 ? (
              <ReferenceLine
                y={targetYtm}
                stroke="var(--primary)"
                strokeDasharray="3 4"
                label={{
                  value: t('目标 YTM'),
                  position: 'insideBottomLeft',
                  fill: 'var(--primary)',
                  fontSize: 12,
                }}
              />
            ) : null}
            <Line
              dataKey="ytm"
              type="linear"
              stroke="var(--color-ytm)"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: 'var(--chart-1)',
                stroke: 'var(--card)',
                strokeWidth: 3,
              }}
            />
            {hasPlateau ? (
              <ReferenceDot
                x={plateau.day}
                y={plateau.ytm}
                r={5}
                fill="var(--card)"
                stroke="var(--chart-1)"
                strokeWidth={3}
              />
            ) : null}
          </LineChart>
        </ChartContainer>
        {hasPlateau ? (
          <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-primary">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-primary"
            />
            <span>
              {t('坐标（')}
              {number(plateau.day)}
              {t('天，')}
              {percent(plateau.ytm, 3)}
              {t('）· 最大 YTM')}
            </span>
          </p>
        ) : null}
        <p className="mt-1 text-center text-xs text-muted-foreground/75">
          {t('点击曲线上的位置，即可采用对应的')}
          {label}
          {t('上限并重新计算')}
        </p>
        {targetControl}
      </div>
    </div>
  );
}

