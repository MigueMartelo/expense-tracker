import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MonthOverMonthDelta } from '@/lib/analytics';
import { formatCurrency, formatPercent } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/card';

interface ComparisonSummaryProps {
  delta: MonthOverMonthDelta | null;
}

function DeltaCard({
  label,
  amount,
  change,
  percent,
  invertColors = false,
}: {
  label: string;
  amount: number;
  change: number;
  percent: number | null;
  invertColors?: boolean;
}) {
  const { t } = useTranslation();
  const isUp = change > 0;
  const isDown = change < 0;
  const isPositive = invertColors ? isDown : isUp;
  const isNegative = invertColors ? isUp : isDown;
  const colorClass = isPositive
    ? 'text-emerald-600 dark:text-emerald-500'
    : isNegative
      ? 'text-rose-600 dark:text-rose-500'
      : 'text-slate-600 dark:text-slate-300';

  return (
    <Card>
      <CardContent className='p-4 md:p-5 space-y-1.5'>
        <p className='text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
          {label}
        </p>
        <p className='text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 truncate'>
          {formatCurrency(amount)}
        </p>
        <div className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
          {isUp ? (
            <TrendingUp className='w-3.5 h-3.5' />
          ) : isDown ? (
            <TrendingDown className='w-3.5 h-3.5' />
          ) : null}
          <span>
            {percent === null
              ? formatCurrency(Math.abs(change))
              : formatPercent(percent)}
          </span>
          <span className='text-slate-500 dark:text-slate-400 font-normal'>
            {t('analytics.vsPreviousMonth')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ComparisonSummary({ delta }: ComparisonSummaryProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('es') ? es : enUS;

  if (!delta) {
    return (
      <Card className='border-dashed bg-slate-50/50 dark:bg-slate-800/50'>
        <CardContent className='p-6 text-center'>
          <div className='w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3'>
            <Wallet className='w-5 h-5 text-slate-400 dark:text-slate-500' />
          </div>
          <p className='text-sm text-slate-500 dark:text-slate-400'>
            {t('analytics.noComparison')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentLabel = format(
    new Date(delta.current.year, delta.current.month - 1),
    'MMMM yyyy',
    { locale: dateLocale }
  );

  return (
    <div className='space-y-2'>
      <h2 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
        {currentLabel}
      </h2>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4'>
        <DeltaCard
          label={t('expenses.income')}
          amount={delta.current.income}
          change={delta.incomeChange}
          percent={delta.incomePercent}
        />
        <DeltaCard
          label={t('expenses.expense')}
          amount={delta.current.outcome}
          change={delta.outcomeChange}
          percent={delta.outcomePercent}
          invertColors
        />
        <DeltaCard
          label={t('analytics.netBalance')}
          amount={delta.current.balance}
          change={delta.balanceChange}
          percent={delta.balancePercent}
        />
      </div>
    </div>
  );
}
