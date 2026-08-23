import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { expensesApi } from '@/lib/api';
import {
  aggregateByMonth,
  getMonthOverMonth,
  lastNMonths,
} from '@/lib/analytics';
import { ComparisonSummary } from '@/components/analytics/ComparisonSummary';
import {
  RangeSelector,
  type AnalyticsRange,
} from '@/components/analytics/RangeSelector';
import { MonthlyComparisonChart } from '@/components/analytics/MonthlyComparisonChart';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/_authenticated/analytics/')({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<AnalyticsRange>(6);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expensesApi.getAll(),
  });

  const buckets = useMemo(() => aggregateByMonth(expenses ?? []), [expenses]);
  const visible = useMemo(() => lastNMonths(buckets, range), [buckets, range]);
  const delta = useMemo(() => getMonthOverMonth(buckets), [buckets]);

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-4 md:py-6 space-y-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-5 w-72' />
        <div className='flex gap-2'>
          <Skeleton className='h-8 w-32' />
          <Skeleton className='h-8 w-32' />
          <Skeleton className='h-8 w-24' />
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4'>
          <Skeleton className='h-24' />
          <Skeleton className='h-24' />
          <Skeleton className='h-24' />
        </div>
        <Skeleton className='h-70 md:h-90 w-full' />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6'>
      <div>
        <h1 className='text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100'>
          {t('analytics.title')}
        </h1>
        <p className='text-sm text-slate-500 dark:text-slate-400 mt-1'>
          {t('analytics.subtitle')}
        </p>
      </div>

      <RangeSelector value={range} onChange={setRange} />

      {visible.length === 0 ? (
        <Card className='border-dashed bg-slate-50/50 dark:bg-slate-800/50'>
          <CardContent className='p-6 md:p-8 text-center'>
            <div className='w-10 h-10 md:w-12 md:h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3'>
              <BarChart3 className='w-5 h-5 md:w-6 md:h-6 text-slate-400 dark:text-slate-500' />
            </div>
            <p className='text-slate-500 dark:text-slate-400 text-sm'>
              {t('common.noData')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ComparisonSummary delta={delta} />

          <Card>
            <CardContent className='p-4 md:p-6 space-y-4'>
              <h2 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                {t('analytics.monthlyComparison')}
              </h2>
              <MonthlyComparisonChart data={visible} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
