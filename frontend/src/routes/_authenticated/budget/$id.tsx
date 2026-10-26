import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { budgetKeys, budgetsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BudgetItemDialog } from '@/components/budget/BudgetItemDialog';
import { CategoryBadge } from '@/components/categories/CategoryBadge';
import { toast } from 'sonner';
import type { BudgetItem } from '@/types';
import {
  Archive,
  ArrowLeft,
  Plus,
  PiggyBank,
  Pencil,
  SearchX,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_authenticated/budget/$id')({
  component: BudgetDetailPage,
});

function BudgetDetailPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | undefined>();
  const [deleteItem, setDeleteItem] = useState<BudgetItem | null>(null);

  const {
    data: budget,
    isLoading,
    isError,
  } = useQuery({
    queryKey: budgetKeys.detail(id),
    queryFn: () => budgetsApi.get(id),
    // 403/404 won't fix themselves; show the not-found state right away.
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: budgetsApi.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      toast.success(t('budget.itemDeletedSuccess'));
      setDeleteItem(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('budget.deleteItemFailed'));
    },
  });

  const handleEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(undefined);
  };

  const isArchived = !!budget?.archivedAt;

  const totalAmount =
    budget?.items.reduce((total, item) => total + Number(item.amount), 0) ||
    0;

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-4 md:py-6 space-y-4'>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-10 w-10' />
          <Skeleton className='h-8 w-48' />
        </div>
        <Skeleton className='h-6 w-40' />
        <Skeleton className='h-20' />
        <Skeleton className='h-20' />
      </div>
    );
  }

  if (isError || !budget) {
    return (
      <div className='container mx-auto px-4 py-4 md:py-6'>
        <Card className='border-dashed bg-slate-50/50 dark:bg-slate-800/50'>
          <CardContent className='p-8 text-center'>
            <div className='w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4'>
              <SearchX className='w-7 h-7 text-slate-400 dark:text-slate-500' />
            </div>
            <h3 className='font-semibold text-slate-700 dark:text-slate-300 mb-1'>
              {t('budget.budgetNotFound')}
            </h3>
            <p className='text-sm text-slate-500 dark:text-slate-400 mb-4'>
              {t('budget.budgetNotFoundHint')}
            </p>
            <Link to='/budget'>
              <Button className='gap-2'>
                <ArrowLeft className='w-4 h-4' />
                {t('budget.backToBudgets')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6 pb-24'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3 min-w-0'>
          <Link to='/budget'>
            <Button
              variant='ghost'
              size='icon'
              className='shrink-0 h-11 w-11 sm:h-9 sm:w-9'
            >
              <ArrowLeft className='w-5 h-5' />
            </Button>
          </Link>
          <div className='min-w-0'>
            <h1 className='text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate'>
              {budget.name}
            </h1>
            <div className='mt-1 inline-flex items-center gap-2 rounded-lg border border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 px-3 py-2'>
              <div className='p-1 rounded-md bg-blue-500/10 dark:bg-blue-500/20'>
                <PiggyBank className='w-3 h-3 text-blue-600 dark:text-blue-500' />
              </div>
              <div>
                <p className='text-xs font-medium text-blue-700 dark:text-blue-400'>
                  {t('budget.totalLabel')}
                </p>
                <p className='text-lg md:text-2xl font-bold text-blue-700 dark:text-blue-400'>
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>
        {!isArchived && (
          <Button
            onClick={() => setDialogOpen(true)}
            size='sm'
            className='gap-2 hidden md:flex shrink-0'
          >
            <Plus className='w-4 h-4' />
            {t('budget.addItem')}
          </Button>
        )}
      </div>

      {/* Archived banner */}
      {isArchived && (
        <div className='flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300'>
          <Archive className='w-4 h-4 shrink-0' />
          <p>{t('budget.archivedBanner')}</p>
        </div>
      )}

      {/* Budget Items List */}
      <div className='space-y-3'>
        {budget.items.map((item) => (
          <Card
            key={item.id}
            className='hover:border-slate-300 dark:hover:border-slate-600 transition-colors'
          >
            <CardContent className='p-4'>
              <div className='flex items-center gap-4'>
                {/* Item Icon */}
                <div className='w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500'>
                  <PiggyBank className='w-6 h-6' />
                </div>

                {/* Item Info */}
                <div className='flex-1 min-w-0'>
                  <p className='font-semibold text-slate-800 dark:text-slate-200 truncate'>
                    {item.item}
                  </p>
                  <div className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400'>
                    {item.category ? (
                      <CategoryBadge category={item.category} size='sm' />
                    ) : (
                      <span>{t('budget.noCategory')}</span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className='hidden md:block text-right'>
                  <p className='text-lg font-semibold text-emerald-700 dark:text-emerald-400'>
                    {formatCurrency(Number(item.amount))}
                  </p>
                </div>

                {/* Actions */}
                {!isArchived && (
                  <div className='flex items-center gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleEdit(item)}
                      className='text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 h-11 w-11 sm:h-9 sm:w-9'
                    >
                      <Pencil className='w-4 h-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => setDeleteItem(item)}
                      className='text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 h-11 w-11 sm:h-9 sm:w-9'
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
                )}
              </div>

              {/* Amount - Mobile */}
              <div className='mt-3 md:hidden'>
                <p className='text-base font-semibold text-emerald-700 dark:text-emerald-400'>
                  {formatCurrency(Number(item.amount))}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {budget.items.length === 0 && (
          <Card className='border-dashed bg-slate-50/50 dark:bg-slate-800/50'>
            <CardContent className='p-8 text-center'>
              <div className='w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4'>
                <PiggyBank className='w-7 h-7 text-slate-400 dark:text-slate-500' />
              </div>
              <h3 className='font-semibold text-slate-700 dark:text-slate-300 mb-1'>
                {t('budget.noItemsYet')}
              </h3>
              {!isArchived && (
                <>
                  <p className='text-sm text-slate-500 dark:text-slate-400 mb-4'>
                    {t('budget.addFirstItem')}
                  </p>
                  <Button onClick={() => setDialogOpen(true)} className='gap-2'>
                    <Plus className='w-4 h-4' />
                    {t('budget.addItem')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile FAB */}
      {!isArchived && (
        <Button
          onClick={() => setDialogOpen(true)}
          size='lg'
          className='md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-50 h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 transition-all'
        >
          <Plus className='w-6 h-6' />
        </Button>
      )}

      {/* Budget Item Dialog */}
      <BudgetItemDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        budgetId={budget.id}
        budgetItem={editingItem}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('budget.deleteItem')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('budget.deleteItemConfirm', { name: deleteItem?.item })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
              className='bg-red-600 hover:bg-red-700'
            >
              {deleteMutation.isPending
                ? t('common.deleting')
                : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
