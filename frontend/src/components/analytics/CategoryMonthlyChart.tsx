import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoryMonthlyBucket, CategorySeries } from '@/lib/analytics';
import { formatCompactCurrency, formatCurrency } from '@/lib/currency';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface CategoryMonthlyChartProps {
  data: CategoryMonthlyBucket[];
  categories: CategorySeries[];
}

export function CategoryMonthlyChart({ data, categories }: CategoryMonthlyChartProps) {
  const { i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('es') ? es : enUS;
  const chartConfig = Object.fromEntries(
    categories.map((category) => [category.key, {
      label: category.name,
      color: category.color,
    }])
  ) satisfies ChartConfig;
  const chartData = data.map((bucket) => ({
    ...bucket.amounts,
    label: format(new Date(bucket.year, bucket.month - 1), 'MMM yyyy', {
      locale: dateLocale,
    }),
  }));

  return (
    <ChartContainer config={chartConfig} className='aspect-auto h-70 w-full md:h-90'>
      <BarChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey='label' tickLine={false} axisLine={false} tickMargin={8} />
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
              formatter={(value, name) => (
                <div className='flex w-full items-center justify-between gap-4'>
                  <span className='text-muted-foreground'>
                    {chartConfig[String(name)]?.label ?? name}
                  </span>
                  <span className='font-mono font-medium tabular-nums'>
                    {formatCurrency(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {categories.map((category) => (
          <Bar
            key={category.key}
            dataKey={category.key}
            name={category.key}
            stackId='categories'
            fill={`var(--color-${category.key})`}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
