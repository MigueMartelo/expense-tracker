import { ExpenseType, type Expense } from '../types';

export interface MonthlyBucket {
  key: string;
  label: string;
  year: number;
  month: number;
  income: number;
  outcome: number;
  balance: number;
}

export interface MonthOverMonthDelta {
  current: MonthlyBucket;
  previous: MonthlyBucket;
  incomeChange: number;
  outcomeChange: number;
  balanceChange: number;
  incomePercent: number | null;
  outcomePercent: number | null;
  balancePercent: number | null;
}

export function getMonthKey(dateValue: string): string {
  return dateValue.substring(0, 7);
}

export function aggregateByMonth(expenses: Expense[]): MonthlyBucket[] {
  const map = new Map<string, MonthlyBucket>();

  for (const expense of expenses) {
    const key = getMonthKey(expense.date);
    const [year, month] = key.split('-').map(Number);
    const bucket =
      map.get(key) ??
      {
        key,
        label: key,
        year,
        month,
        income: 0,
        outcome: 0,
        balance: 0,
      };

    if (expense.type === ExpenseType.INCOME) {
      bucket.income += Number(expense.amount);
    } else {
      bucket.outcome += Number(expense.amount);
    }
    bucket.balance = bucket.income - bucket.outcome;

    map.set(key, bucket);
  }

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function lastNMonths(
  buckets: MonthlyBucket[],
  n: number
): MonthlyBucket[] {
  return n > 0 ? buckets.slice(-n) : buckets;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function getMonthOverMonth(
  buckets: MonthlyBucket[]
): MonthOverMonthDelta | null {
  if (buckets.length < 2) {
    return null;
  }

  const previous = buckets[buckets.length - 2];
  const current = buckets[buckets.length - 1];

  return {
    current,
    previous,
    incomeChange: current.income - previous.income,
    outcomeChange: current.outcome - previous.outcome,
    balanceChange: current.balance - previous.balance,
    incomePercent: percentChange(current.income, previous.income),
    outcomePercent: percentChange(current.outcome, previous.outcome),
    balancePercent: percentChange(current.balance, previous.balance),
  };
}
