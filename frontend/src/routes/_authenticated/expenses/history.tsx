import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { expensesApi, creditCardsApi, categoriesApi } from '@/lib/api';
import { formatCurrency, formatCurrencyWithSign } from '@/lib/currency';
import { ExpenseType, Expense } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCardBadge } from '@/components/credit-cards/CreditCardBadge';
import { CategoryBadge } from '@/components/categories/CategoryBadge';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
} from 'date-fns';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  X,
  CreditCard as CreditCardIcon,
  Tag,
  Plus,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_authenticated/expenses/history')({
  component: HistoryPage,
});

type QuickFilter =
  | 'today'
  | 'this-week'
  | 'this-month'
  | 'last-month'
  | 'custom';
type CreditCardFilter = 'all' | 'none' | string; // 'none' = cash only, string = specific card ID
type CategoryFilter = 'all' | 'none' | string; // 'none' = uncategorized, string = specific category ID

function HistoryPage() {
  const { t } = useTranslation();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('this-month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  });
  const [typeFilter, setTypeFilter] = useState<ExpenseType | 'all'>('all');
  const [creditCardFilter, setCreditCardFilter] =
    useState<CreditCardFilter>('all');
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>('all');

  // Fetch all expenses
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expensesApi.getAll(),
  });

  // Fetch credit cards for filter dropdown
  const { data: creditCards = [] } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: creditCardsApi.getAll,
  });

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  // Helper to parse expense date as LOCAL date (avoiding timezone issues)
  const parseLocalDate = (dateValue: string): Date => {
    const dateStr = dateValue.substring(0, 10);
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Apply quick filter
  const applyQuickFilter = (filter: QuickFilter) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'today':
        setDateRange({ from: today, to: today });
        break;
      case 'this-week':
        setDateRange({ from: startOfWeek(today), to: endOfWeek(today) });
        break;
      case 'this-month':
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        setDateRange({
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        });
        break;
      case 'custom':
        // Keep current range
        break;
    }
    setQuickFilter(filter);
  };

  // Filter expenses based on date range, type, credit card, and category
  const filteredExpenses =
    expenses?.filter((expense: Expense) => {
      const expenseDate = parseLocalDate(expense.date);

      // Date filter
      if (dateRange?.from && dateRange?.to) {
        const fromDate = new Date(
          dateRange.from.getFullYear(),
          dateRange.from.getMonth(),
          dateRange.from.getDate()
        );
        const toDate = new Date(
          dateRange.to.getFullYear(),
          dateRange.to.getMonth(),
          dateRange.to.getDate()
        );
        if (expenseDate < fromDate || expenseDate > toDate) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && expense.type !== typeFilter) {
        return false;
      }

      // Credit card filter
      if (creditCardFilter !== 'all') {
        if (creditCardFilter === 'none') {
          // Only show expenses without credit card
          if (expense.creditCardId !== null) {
            return false;
          }
        } else {
          // Show expenses with specific credit card
          if (expense.creditCardId !== creditCardFilter) {
            return false;
          }
        }
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'none') {
          // Only show expenses without category
          if (expense.categoryId !== null) {
            return false;
          }
        } else {
          // Show expenses with specific category
          if (expense.categoryId !== categoryFilter) {
            return false;
          }
        }
      }

      return true;
    }) || [];

  // Sort by date (newest first), then by createdAt (most recent first)
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    const dateA = parseLocalDate(a.date).getTime();
    const dateB = parseLocalDate(b.date).getTime();
    if (dateB !== dateA) return dateB - dateA;
    // If same date, sort by createdAt (most recent first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Calculate totals for filtered expenses
  const totals = filteredExpenses.reduce(
    (acc, expense) => {
      if (expense.type === ExpenseType.INCOME) {
        acc.income += Number(expense.amount);
      } else {
        acc.outcome += Number(expense.amount);
      }
      return acc;
    },
    { income: 0, outcome: 0 }
  );

  const balance = totals.income - totals.outcome;

  // Group expenses by date for display
  const groupedExpenses = sortedExpenses.reduce(
    (groups, expense) => {
      const dateKey = expense.date.substring(0, 10);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(expense);
      return groups;
    },
    {} as Record<string, Expense[]>
  );

  const dateRangeLabel =
    dateRange?.from && dateRange?.to
      ? dateRange.from.getTime() === dateRange.to.getTime()
        ? format(dateRange.from, 'MMM d, yyyy')
        : `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
      : t('expenses.selectDates');

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-4 md:py-6 space-y-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-10 w-full' />
        <div className='grid grid-cols-3 gap-2'>
          <Skeleton className='h-20' />
          <Skeleton className='h-20' />
          <Skeleton className='h-20' />
        </div>
        <Skeleton className='h-24' />
        <Skeleton className='h-24' />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6 pb-20'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <Link to='/expenses'>
            <Button
              variant='ghost'
              size='icon'
              className='shrink-0 h-11 w-11 sm:h-9 sm:w-9'
            >
              <ArrowLeft className='w-5 h-5' />
            </Button>
          </Link>
          <h1 className='truncate text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100'>
            {t('expenses.transactionHistory')}
          </h1>
        </div>
        <Link to='/expenses/new' search={{ fromHistory: true }}>
          <Button
            size='sm'
            className='h-11 w-11 p-0 sm:h-9 sm:w-auto sm:px-3'
            aria-label={t('expenses.addTransaction')}
          >
            <Plus className='w-4 h-4' />
            <span className='hidden sm:inline'>
              {t('expenses.addTransaction')}
            </span>
          </Button>
        </Link>
      </div>

      {/* Filters Section */}
      <Card className='bg-slate-50/50 dark:bg-slate-800/50'>
        <CardContent className='p-4 md:p-4 space-y-3'>
          {/* Quick Filters */}
          <div className='flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-hide'>
            {[
              {
                value: 'today' as QuickFilter,
                label: t('expenses.quickFilters.today'),
              },
              {
                value: 'this-week' as QuickFilter,
                label: t('expenses.quickFilters.thisWeek'),
              },
              {
                value: 'this-month' as QuickFilter,
                label: t('expenses.quickFilters.thisMonth'),
              },
              {
                value: 'last-month' as QuickFilter,
                label: t('expenses.quickFilters.lastMonth'),
              },
              {
                value: 'custom' as QuickFilter,
                label: t('expenses.quickFilters.custom'),
              },
            ].map((filter) => (
              <Button
                key={filter.value}
                variant={quickFilter === filter.value ? 'default' : 'outline'}
                size='sm'
                onClick={() => applyQuickFilter(filter.value)}
                className='whitespace-nowrap text-xs'
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Date Range & Type Filter Row */}
          <div className='flex flex-col sm:flex-row gap-2'>
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  className='justify-start text-left font-normal flex-1'
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {dateRangeLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='range'
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    setQuickFilter('custom');
                  }}
                  numberOfMonths={1}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as ExpenseType | 'all')
              }
            >
              <SelectTrigger className='w-full sm:w-[140px]'>
                <Filter className='w-4 h-4 mr-2' />
                <SelectValue placeholder={t('expenses.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>{t('expenses.allTypes')}</SelectItem>
                <SelectItem value={ExpenseType.INCOME}>
                  <span className='flex items-center gap-2'>
                    <TrendingUp className='w-3 h-3 text-emerald-600' />
                    {t('expenses.income')}
                  </span>
                </SelectItem>
                <SelectItem value={ExpenseType.OUTCOME}>
                  <span className='flex items-center gap-2'>
                    <TrendingDown className='w-3 h-3 text-rose-600' />
                    {t('expenses.expenses')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Credit Card Filter */}
            <Select
              value={creditCardFilter}
              onValueChange={(value) => setCreditCardFilter(value)}
            >
              <SelectTrigger className='w-full sm:w-[160px]'>
                <CreditCardIcon className='w-4 h-4 mr-2' />
                <SelectValue placeholder={t('expenses.payment')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>{t('expenses.allPayments')}</SelectItem>
                <SelectItem value='none'>
                  <span className='flex items-center gap-2'>
                    <Wallet className='w-3 h-3 text-slate-500' />
                    {t('expenses.cashDebit')}
                  </span>
                </SelectItem>
                {creditCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    <span className='flex items-center gap-2'>
                      <div
                        className='w-5 h-5 rounded flex items-center justify-center text-xs font-bold'
                        style={{
                          backgroundColor: card.color,
                          color: card.textColor || '#FFFFFF',
                        }}
                      >
                        {card.name.charAt(0).toUpperCase()}
                      </div>
                      {card.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value)}
            >
              <SelectTrigger className='w-full sm:w-[170px]'>
                <Tag className='w-4 h-4 mr-2' />
                <SelectValue placeholder={t('expenses.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>
                  {t('expenses.allCategories')}
                </SelectItem>
                <SelectItem value='none'>{t('expenses.noCategory')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className='flex items-center gap-2'>
                      <div
                        className='w-5 h-5 rounded flex items-center justify-center text-xs font-bold'
                        style={{
                          backgroundColor: category.color,
                          color: category.textColor || '#FFFFFF',
                        }}
                      >
                        {category.name.charAt(0).toUpperCase()}
                      </div>
                      {category.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {(typeFilter !== 'all' ||
            creditCardFilter !== 'all' ||
            categoryFilter !== 'all' ||
            quickFilter === 'custom') && (
            <div className='flex flex-wrap gap-2'>
              {typeFilter !== 'all' && (
                <Badge variant='secondary' className='gap-1'>
                  {typeFilter === ExpenseType.INCOME
                    ? t('expenses.income')
                    : t('expenses.expenses')}
                  <X
                    className='w-3 h-3 cursor-pointer hover:text-red-500'
                    onClick={() => setTypeFilter('all')}
                  />
                </Badge>
              )}
              {creditCardFilter !== 'all' && (
                <Badge variant='secondary' className='gap-1'>
                  {creditCardFilter === 'none'
                    ? t('expenses.cashDebit')
                    : creditCards.find((c) => c.id === creditCardFilter)
                        ?.name || t('expenses.creditCard')}
                  <X
                    className='w-3 h-3 cursor-pointer hover:text-red-500'
                    onClick={() => setCreditCardFilter('all')}
                  />
                </Badge>
              )}
              {categoryFilter !== 'all' && (
                <Badge variant='secondary' className='gap-1'>
                  {categoryFilter === 'none'
                    ? t('expenses.noCategory')
                    : categories.find((c) => c.id === categoryFilter)?.name ||
                      t('expenses.category')}
                  <X
                    className='w-3 h-3 cursor-pointer hover:text-red-500'
                    onClick={() => setCategoryFilter('all')}
                  />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards for Filtered Period */}
      <div className='grid grid-cols-3 gap-3 md:gap-4'>
        {/* Income Card */}
        <Card className='bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/50'>
          <CardContent className='p-4 md:p-4'>
            <div className='flex items-center gap-1.5 mb-1'>
              <TrendingUp className='w-3 h-3 text-emerald-600 dark:text-emerald-500' />
              <span className='text-xs font-medium text-emerald-700 dark:text-emerald-400'>
                {t('expenses.income')}
              </span>
            </div>
            <p className='text-sm md:text-lg font-bold text-emerald-700 dark:text-emerald-400 truncate'>
              {formatCurrency(totals.income)}
            </p>
          </CardContent>
        </Card>

        {/* Outcome Card */}
        <Card className='bg-rose-50/50 dark:bg-rose-900/20 border-rose-200/50 dark:border-rose-800/50'>
          <CardContent className='p-4 md:p-4'>
            <div className='flex items-center gap-1.5 mb-1'>
              <TrendingDown className='w-3 h-3 text-rose-600 dark:text-rose-500' />
              <span className='text-xs font-medium text-rose-700 dark:text-rose-400'>
                {t('expenses.expenses')}
              </span>
            </div>
            <p className='text-sm md:text-lg font-bold text-rose-700 dark:text-rose-400 truncate'>
              {formatCurrency(totals.outcome)}
            </p>
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card
          className={`${balance >= 0 ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/50' : 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-800/50'}`}
        >
          <CardContent className='p-4 md:p-4'>
            <div className='flex items-center gap-1.5 mb-1'>
              <Wallet
                className={`w-3 h-3 ${balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-amber-600 dark:text-amber-500'}`}
              />
              <span
                className={`text-xs font-medium ${balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}
              >
                {t('expenses.balance')}
              </span>
            </div>
            <p
              className={`text-sm md:text-lg font-bold truncate ${balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}
            >
              {balance >= 0 ? '' : '-'}
              {formatCurrency(Math.abs(balance))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Results Count */}
      <div className='flex items-center justify-between'>
        <p className='text-sm text-slate-500 dark:text-slate-400'>
          {t('expenses.transactionsFound', { count: filteredExpenses.length })}
        </p>
      </div>

      {/* Transaction List (Grouped by Date) */}
      <div className='space-y-4'>
        {Object.entries(groupedExpenses).map(([dateKey, dayExpenses]) => (
          <div key={dateKey} className='space-y-2'>
            <h3 className='text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-14 md:top-16 z-10 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm py-1 px-1 -mx-1 rounded'>
              {format(
                parseLocalDate(dateKey + 'T00:00:00'),
                'EEEE, MMMM d, yyyy'
              )}
            </h3>

            {dayExpenses.map((expense) => (
              <Link
                key={expense.id}
                to='/expenses/$id'
                params={{ id: expense.id }}
                className='block'
              >
                <Card className='hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer active:scale-[0.99] touch-manipulation'>
                  <CardContent className='p-4 md:p-4'>
                    <div className='flex items-start gap-3'>
                      {/* Icon */}
                      <div
                        className={`p-2 md:p-2.5 rounded-xl shrink-0 ${
                          expense.type === ExpenseType.INCOME
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500'
                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-500'
                        }`}
                      >
                        {expense.type === ExpenseType.INCOME ? (
                          <TrendingUp className='w-4 h-4 md:w-5 md:h-5' />
                        ) : (
                          <TrendingDown className='w-4 h-4 md:w-5 md:h-5' />
                        )}
                      </div>

                      {/* Content */}
                      <div className='flex-1 min-w-0'>
                        {/* Badges and Metadata - Top row */}
                        <div className='flex flex-wrap items-center gap-1.5 md:gap-2 mb-1 md:mb-0.5'>
                          <Badge
                            variant={
                              expense.type === ExpenseType.INCOME
                                ? 'default'
                                : 'destructive'
                            }
                            className='text-xs px-1.5 py-0 shrink-0'
                          >
                            {expense.type}
                          </Badge>
                          {expense.creditCard && (
                            <div className='shrink-0'>
                              <CreditCardBadge
                                creditCard={expense.creditCard}
                                size='sm'
                              />
                            </div>
                          )}
                          {expense.category && (
                            <div className='shrink-0'>
                              <CategoryBadge
                                category={expense.category}
                                size='sm'
                              />
                            </div>
                          )}
                          <span className='text-xs text-slate-500 dark:text-slate-400 shrink-0'>
                            {format(parseLocalDate(expense.date), 'MMM dd')}
                          </span>
                        </div>

                        {/* Description - Mobile: Full width with amount, Desktop: Left */}
                        <div className='flex items-start justify-between gap-2'>
                          <p className='text-sm md:text-sm font-medium text-slate-800 dark:text-slate-200 flex-1 min-w-0'>
                            {expense.description}
                          </p>
                          {/* Amount - Mobile: Right side, Desktop: Hidden (shown in right column) */}
                          <div className='flex items-center gap-1.5 shrink-0 md:hidden'>
                            <p
                              className={`text-base font-semibold ${
                                expense.type === ExpenseType.INCOME
                                  ? 'text-emerald-600 dark:text-emerald-500'
                                  : 'text-rose-600 dark:text-rose-500'
                              }`}
                            >
                              {formatCurrencyWithSign(
                                Number(expense.amount),
                                expense.type === ExpenseType.INCOME
                                  ? 'income'
                                  : 'outcome'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Amount & Arrow - Desktop only */}
                      <div className='hidden md:flex items-center gap-2 shrink-0'>
                        <p
                          className={`text-lg font-semibold ${
                            expense.type === ExpenseType.INCOME
                              ? 'text-emerald-600 dark:text-emerald-500'
                              : 'text-rose-600 dark:text-rose-500'
                          }`}
                        >
                          {formatCurrencyWithSign(
                            Number(expense.amount),
                            expense.type === ExpenseType.INCOME
                              ? 'income'
                              : 'outcome'
                          )}
                        </p>
                        <ChevronRight className='w-4 h-4 text-slate-400 dark:text-slate-500' />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ))}

        {/* Empty State */}
        {filteredExpenses.length === 0 && (
          <Card className='border-dashed bg-slate-50/50 dark:bg-slate-800/50'>
            <CardContent className='p-6 md:p-8 text-center'>
              <div className='w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3'>
                <CalendarIcon className='w-6 h-6 text-slate-400 dark:text-slate-500' />
              </div>
              <p className='text-slate-500 dark:text-slate-400 text-sm mb-1'>
                {t('expenses.noTransactionsFound')}
              </p>
              <p className='text-slate-400 dark:text-slate-500 text-xs'>
                {t('expenses.tryAdjustingFilters')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
