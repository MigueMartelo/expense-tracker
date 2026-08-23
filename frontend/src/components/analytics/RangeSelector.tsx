import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export type AnalyticsRange = 6 | 12 | 0;

interface RangeSelectorProps {
  value: AnalyticsRange;
  onChange: (value: AnalyticsRange) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  const { t } = useTranslation();

  const options: { value: AnalyticsRange; label: string }[] = [
    { value: 6, label: t('analytics.range6') },
    { value: 12, label: t('analytics.range12') },
    { value: 0, label: t('analytics.rangeAll') },
  ];

  return (
    <div className='flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide'>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'outline'}
          size='sm'
          className='whitespace-nowrap'
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
