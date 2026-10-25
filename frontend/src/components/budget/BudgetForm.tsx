import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateBudgetDto } from '@/types';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const createBudgetSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('budget.nameRequired'))
      .max(100, t('budget.nameMaxLength')),
  });

type BudgetFormData = z.infer<ReturnType<typeof createBudgetSchema>>;

interface BudgetFormProps {
  budget?: { id: string; name: string };
  onSubmit: (data: CreateBudgetDto) => void | Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function BudgetForm({
  budget,
  onSubmit,
  isSubmitting = false,
  onCancel,
}: BudgetFormProps) {
  const { t } = useTranslation();

  const budgetSchema = createBudgetSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { name: budget?.name ?? '' },
  });

  const onFormSubmit = (data: BudgetFormData) => {
    onSubmit({ name: data.name });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className='space-y-5'>
      {/* Name */}
      <div className='space-y-2'>
        <Label htmlFor='name'>{t('budget.name')}</Label>
        <div className='relative'>
          <FileText className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
          <Input
            id='name'
            {...register('name')}
            placeholder={t('budget.namePlaceholder')}
            className='pl-10 h-11'
            maxLength={100}
            autoFocus
          />
        </div>
        {errors.name && (
          <p className='text-sm text-red-500'>{errors.name.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className='flex gap-3 pt-2'>
        {onCancel && (
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            className='flex-1 h-11'
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
        )}
        <Button type='submit' disabled={isSubmitting} className='flex-1 h-11'>
          {isSubmitting
            ? t('common.saving')
            : budget
              ? t('common.save')
              : t('budget.createBudget')}
        </Button>
      </div>
    </form>
  );
}
