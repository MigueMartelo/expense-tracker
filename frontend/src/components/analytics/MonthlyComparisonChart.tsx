import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyBucket } from '@/lib/analytics';
import { formatCompactCurrency, formatCurrency } from '@/lib/currency';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface MonthlyComparisonChartProps {
  data: MonthlyBucket[];
}

export function MonthlyComparisonChart({ data }: MonthlyComparisonChartProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('es') ? es : enUS;

  const chartConfig = {
    income: {
      label: t('expenses.income'),
      color: '#10b981',
    },
    outcome: {
      label: t('expenses.expense'),
      color: '#f43f5e',
    },
    balance: {
      label: t('expenses.balance'),
      color: '#3b82f6',
    },
  } satisfies ChartConfig;

  const chartData = data.map((bucket) => ({
    ...bucket,
    label: format(new Date(bucket.year, bucket.month - 1), 'MMM yyyy', {
      locale: dateLocale,
    }),
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className='aspect-auto h-70 w-full md:h-90'
    >
      <ComposedChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey='label'
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={56}
          tickFormatter={(value: number) => formatCompactCurrency(value)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                const key = String(name) as keyof typeof chartConfig;
                return (
                  <div className='flex w-full items-center justify-between gap-4'>
                    <span className='text-muted-foreground'>
                      {chartConfig[key]?.label ?? name}
                    </span>
                    <span className='font-mono font-medium tabular-nums'>
                      {formatCurrency(Number(value))}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey='income' fill='var(--color-income)' radius={4} />
        <Bar dataKey='outcome' fill='var(--color-outcome)' radius={4} />
        <Line
          type='monotone'
          dataKey='balance'
          stroke='var(--color-balance)'
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
