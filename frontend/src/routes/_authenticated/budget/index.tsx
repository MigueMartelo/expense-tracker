import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { budgetKeys, budgetsApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetCard } from '@/components/budget/BudgetCard';
import { BudgetDialog } from '@/components/budget/BudgetDialog';
import { Archive, ArrowLeft, Plus, PiggyBank } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_authenticated/budget/')({
  component: BudgetsPage,
});

function BudgetsPage() {
  const { t } = useTranslation();
  const [archived, setArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: budgets, isLoading } = useQuery({
    queryKey: budgetKeys.list(archived),
    queryFn: () => budgetsApi.list(archived),
  });

  const filterOptions = [
    { value: false, label: t('budget.active') },
    { value: true, label: t('budget.archived') },
  ];

  return (
    <div className='container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6 pb-24'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Link to='/expenses'>
            <Button
              variant='ghost'
              size='icon'
              className='shrink-0 h-11 w-11 sm:h-9 sm:w-9'
            >
              <ArrowLeft className='w-5 h-5' />
            </Button>
          </Link>
          <h1 className='text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100'>
            {t('budget.listTitle')}
          </h1>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          size='sm'
          className='gap-2 hidden md:flex'
        >
          <Plus className='w-4 h-4' />
          {t('budget.newBudget')}
        </Button>
      </div>

      {/* Description */}
      <p className='text-sm text-slate-500 dark:text-slate-400'>
        {t('budget.manageBudget')}
      </p>

      {/* Active / Archived toggle */}
      <div className='flex gap-2'>
        {filterOptions.map((option) => (
          <Button
            key={String(option.value)}
            variant={archived === option.value ? 'default' : 'outline'}
            size='sm'
            onClick={() => setArchived(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Budgets List */}
      {isLoading ? (
        <div className='space-y-3'>
          <Skeleton className='h-20' />
          <Skeleton className='h-20' />
        </div>
      ) : (
        <div className='space-y-3'>
          {budgets?.map((budget) => (
            // TODO(BUD-07): wrap in <Link to='/budget/$id' params={{ id: budget.id }}>
            // once the detail route exists.
            <BudgetCard key={budget.id} budget={budget} />
          ))}

          {/* Empty State */}
          {budgets?.length === 0 && (
            <Card className='border-dashed bg-slate-50/50 dark:bg-slate-800/50'>
              <CardContent className='p-8 text-center'>
                <div className='w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4'>
                  {archived ? (
                    <Archive className='w-7 h-7 text-slate-400 dark:text-slate-500' />
                  ) : (
                    <PiggyBank className='w-7 h-7 text-slate-400 dark:text-slate-500' />
                  )}
                </div>
                <h3 className='font-semibold text-slate-700 dark:text-slate-300 mb-1'>
                  {archived
                    ? t('budget.noArchivedBudgets')
                    : t('budget.noBudgetsYet')}
                </h3>
                <p className='text-sm text-slate-500 dark:text-slate-400'>
                  {archived
                    ? t('budget.noArchivedBudgetsHint')
                    : t('budget.createFirstBudget')}
                </p>
                {!archived && (
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className='gap-2 mt-4'
                  >
                    <Plus className='w-4 h-4' />
                    {t('budget.newBudget')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Mobile FAB */}
      <Button
        onClick={() => setDialogOpen(true)}
        size='lg'
        className='md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-50 h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 transition-all'
      >
        <Plus className='w-6 h-6' />
      </Button>

      {/* Budget Dialog */}
      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        // TODO(BUD-07): navigate({ to: '/budget/$id', params: { id: budget.id } })
        // once the detail route exists; until then the new budget shows up in the list.
        onCreated={() => setArchived(false)}
      />
    </div>
  );
}
