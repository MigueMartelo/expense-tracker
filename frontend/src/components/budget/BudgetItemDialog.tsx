import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BudgetItemForm } from './BudgetItemForm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetKeys, budgetsApi } from '@/lib/api';
import { toast } from 'sonner';
import type { BudgetItem, CreateBudgetItemDto } from '@/types';
import { useTranslation } from 'react-i18next';

interface BudgetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetItem?: BudgetItem;
}

export function BudgetItemDialog({
  open,
  onOpenChange,
  budgetId,
  budgetItem,
}: BudgetItemDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateBudgetItemDto) =>
      budgetsApi.createItem(budgetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      toast.success(t('budget.itemAddedSuccess'));
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('budget.addItemFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateBudgetItemDto }) =>
      budgetsApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      toast.success(t('budget.itemUpdatedSuccess'));
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('budget.updateItemFailed'));
    },
  });

  const handleSubmit = (data: CreateBudgetItemDto) => {
    if (budgetItem) {
      updateMutation.mutate({ id: budgetItem.id, data });
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
            {budgetItem ? t('budget.editItem') : t('budget.addItemDialog')}
          </DialogTitle>
        </DialogHeader>
        <BudgetItemForm
          budgetItem={budgetItem}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
