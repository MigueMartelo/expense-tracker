import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import type { BudgetSummary } from '@/types';
import { ChevronRight, PiggyBank } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BudgetCardProps {
  budget: BudgetSummary;
}

export function BudgetCard({ budget }: BudgetCardProps) {
  const { t } = useTranslation();
  const isArchived = !!budget.archivedAt;
  const totalColor = isArchived
    ? 'text-slate-500 dark:text-slate-400'
    : 'text-emerald-700 dark:text-emerald-400';

  return (
    <Card className='hover:border-slate-300 dark:hover:border-slate-600 transition-colors'>
      <CardContent className='p-4'>
        <div className='flex items-center gap-4'>
          {/* Budget Icon */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
              isArchived
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500'
            }`}
          >
            <PiggyBank className='w-6 h-6' />
          </div>

          {/* Budget Info */}
          <div className='flex-1 min-w-0'>
            <p className='font-semibold text-slate-800 dark:text-slate-200 truncate'>
              {budget.name}
            </p>
            <p className='text-xs text-slate-500 dark:text-slate-400'>
              {t('budget.itemCount', { count: budget.itemCount })}
            </p>
            {/* Total - Mobile */}
            <p
              className={`md:hidden mt-1 text-base font-semibold ${totalColor}`}
            >
              {formatCurrency(Number(budget.total))}
            </p>
          </div>

          {/* Total - Desktop */}
          <p
            className={`hidden md:block text-lg font-semibold shrink-0 ${totalColor}`}
          >
            {formatCurrency(Number(budget.total))}
          </p>

          <ChevronRight className='w-4 h-4 text-slate-400 shrink-0' />
        </div>
      </CardContent>
    </Card>
  );
}
