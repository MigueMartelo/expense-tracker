import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { expensesApi } from '@/lib/api';
import { toast } from 'sonner';
import type { CreateExpenseDto } from '@/types';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_authenticated/expenses/new')({
  validateSearch: (search: Record<string, unknown>) => ({
    fromHistory: search.fromHistory === true,
  }),
  component: NewExpensePage,
});

function NewExpensePage() {
  const { t } = useTranslation();
  const { fromHistory } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: createExpense, isPending } = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(t('expenses.transactionAdded'));
      navigate({ to: fromHistory ? '/expenses/history' : '/expenses' });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('expenses.createFailed'));
    },
  });

  const handleSubmit = (data: CreateExpenseDto) => {
    createExpense(data);
  };

  return (
    <div className='container mx-auto px-4 py-4 md:py-6 max-w-lg'>
      {/* Back Button */}
      <Link
        to={fromHistory ? '/expenses/history' : '/expenses'}
        className='inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-4 min-h-[44px]'
      >
        <ArrowLeft className='w-4 h-4' />
        {t(fromHistory ? 'expenses.backToHistory' : 'expenses.backToDashboard')}
      </Link>

      <Card className='shadow-lg'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-xl md:text-2xl'>{t('expenses.addTransaction')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm onSubmit={handleSubmit} isSubmitting={isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
