import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BudgetForm } from './BudgetForm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetKeys, budgetsApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Budget, CreateBudgetDto } from '@/types';
import { useTranslation } from 'react-i18next';

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog renames this budget instead of creating one. */
  budget?: { id: string; name: string };
  onCreated?: (budget: Budget) => void;
}

export function BudgetDialog({
  open,
  onOpenChange,
  budget,
  onCreated,
}: BudgetDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      toast.success(t('budget.budgetCreatedSuccess'));
      onOpenChange(false);
      onCreated?.(created);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('budget.createBudgetFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateBudgetDto }) =>
      budgetsApi.update(id, { name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      toast.success(t('budget.budgetUpdatedSuccess'));
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('budget.updateBudgetFailed'));
    },
  });

  const handleSubmit = (data: CreateBudgetDto) => {
    if (budget) {
      updateMutation.mutate({ id: budget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[450px]'>
        <DialogHeader>
          <DialogTitle>
            {budget ? t('budget.renameBudget') : t('budget.newBudget')}
          </DialogTitle>
        </DialogHeader>
        <BudgetForm
          key={budget?.id ?? 'new'}
          budget={budget}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
