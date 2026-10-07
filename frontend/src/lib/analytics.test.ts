import { describe, expect, it } from 'vitest';
import { ExpenseType, type Expense } from '../types';
import {
  aggregateByMonth,
  aggregateByMonthAndCategory,
  getMonthKey,
  getMonthOverMonth,
  lastNMonths,
} from './analytics';

function makeExpense(
  overrides: Partial<Expense> &
    Pick<Expense, 'type' | 'amount' | 'date'>
): Expense {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    userId: 'user-1',
    description: overrides.description ?? 'Test',
    creditCardId: null,
    creditCard: null,
    categoryId: null,
    category: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getMonthKey', () => {
  it('extracts YYYY-MM from ISO dates without timezone shift', () => {
    expect(getMonthKey('2026-01-05T00:00:00.000Z')).toBe('2026-01');
    expect(getMonthKey('2026-12-31T23:00:00.000Z')).toBe('2026-12');
  });
});

describe('aggregateByMonth', () => {
  it('returns an empty array for no expenses', () => {
    expect(aggregateByMonth([])).toEqual([]);
  });

  it('sums multiple expenses in the same month', () => {
    const expenses = [
      makeExpense({
        type: ExpenseType.INCOME,
        amount: 1000,
        date: '2026-01-02T00:00:00.000Z',
      }),
      makeExpense({
        type: ExpenseType.INCOME,
        amount: '500' as unknown as number,
        date: '2026-01-15T00:00:00.000Z',
      }),
      makeExpense({
        type: ExpenseType.OUTCOME,
        amount: 200,
        date: '2026-01-20T00:00:00.000Z',
      }),
    ];

    const [january] = aggregateByMonth(expenses);

    expect(january).toMatchObject({
      key: '2026-01',
      year: 2026,
      month: 1,
      income: 1500,
      outcome: 200,
      balance: 1300,
    });
  });

  it('returns months sorted ascending', () => {
    const expenses = [
      makeExpense({
        type: ExpenseType.OUTCOME,
        amount: 50,
        date: '2026-03-01T00:00:00.000Z',
      }),
      makeExpense({
        type: ExpenseType.INCOME,
        amount: 100,
        date: '2025-12-01T00:00:00.000Z',
      }),
      makeExpense({
        type: ExpenseType.OUTCOME,
        amount: 25,
        date: '2026-01-01T00:00:00.000Z',
      }),
    ];

    expect(aggregateByMonth(expenses).map((bucket) => bucket.key)).toEqual([
      '2025-12',
      '2026-01',
      '2026-03',
    ]);
  });

  it('computes balance as income minus outcome', () => {
    const expenses = [
      makeExpense({
        type: ExpenseType.INCOME,
        amount: 300,
        date: '2026-02-01T00:00:00.000Z',
      }),
      makeExpense({
        type: ExpenseType.OUTCOME,
        amount: 450,
        date: '2026-02-10T00:00:00.000Z',
      }),
    ];

    expect(aggregateByMonth(expenses)[0].balance).toBe(-150);
  });
});

describe('aggregateByMonthAndCategory', () => {
  it('groups outcome amounts by month and category and excludes income', () => {
    const groceries = {
      id: 'category-1', userId: 'user-1', name: 'Groceries', color: '#22c55e',
      textColor: '#fff', createdAt: '', updatedAt: '',
    };
    const result = aggregateByMonthAndCategory([
      makeExpense({
        type: ExpenseType.OUTCOME,
        amount: 25,
        date: '2026-02-01T00:00:00.000Z',
        categoryId: groceries.id,
        category: groceries,
      }),
      makeExpense({
        type: ExpenseType.OUTCOME,
        amount: '15' as unknown as number,
        date: '2026-02-12T00:00:00.000Z',
        categoryId: groceries.id,
        category: groceries,
      }),
      makeExpense({
        type: ExpenseType.INCOME,
        amount: 100,
        date: '2026-02-15T00:00:00.000Z',
        categoryId: groceries.id,
        category: groceries,
      }),
    ], 'Uncategorized');

    expect(result.months).toHaveLength(1);
    expect(result.months[0].amounts).toEqual({ [groceries.id]: 40 });
    expect(result.categories).toEqual([
      { key: groceries.id, name: 'Groceries', color: '#22c55e' },
    ]);
  });

  it('groups expenses without a category under the uncategorized series', () => {
    const result = aggregateByMonthAndCategory([
      makeExpense({
        type: ExpenseType.OUTCOME,
        amount: 12,
        date: '2026-01-03T00:00:00.000Z',
      }),
      makeExpense({
        type: ExpenseType.OUTCOME,
        amount: 8,
        date: '2026-03-03T00:00:00.000Z',
      }),
    ], 'Uncategorized');

    expect(result.months.map(({ key, amounts }) => ({ key, amounts }))).toEqual([
      { key: '2026-01', amounts: { uncategorized: 12 } },
      { key: '2026-03', amounts: { uncategorized: 8 } },
    ]);
    expect(result.categories).toEqual([
      { key: 'uncategorized', name: 'Uncategorized', color: '#94a3b8' },
    ]);
  });
});

describe('lastNMonths', () => {
  const buckets = [
    {
      key: '2025-11',
      label: '2025-11',
      year: 2025,
      month: 11,
      income: 1,
      outcome: 0,
      balance: 1,
    },
    {
      key: '2025-12',
      label: '2025-12',
      year: 2025,
      month: 12,
      income: 2,
      outcome: 0,
      balance: 2,
    },
    {
      key: '2026-01',
      label: '2026-01',
      year: 2026,
      month: 1,
      income: 3,
      outcome: 0,
      balance: 3,
    },
  ];

  it('slices from the end for a positive n', () => {
    expect(lastNMonths(buckets, 2).map((bucket) => bucket.key)).toEqual([
      '2025-12',
      '2026-01',
    ]);
  });

  it('returns all buckets when n is 0', () => {
    expect(lastNMonths(buckets, 0)).toEqual(buckets);
  });
});

describe('getMonthOverMonth', () => {
  it('returns null when fewer than two months exist', () => {
    expect(getMonthOverMonth([])).toBeNull();
    expect(
      getMonthOverMonth([
        {
          key: '2026-01',
          label: '2026-01',
          year: 2026,
          month: 1,
          income: 10,
          outcome: 5,
          balance: 5,
        },
      ])
    ).toBeNull();
  });

  it('compares the last two months', () => {
    const delta = getMonthOverMonth([
      {
        key: '2026-01',
        label: '2026-01',
        year: 2026,
        month: 1,
        income: 100,
        outcome: 40,
        balance: 60,
      },
      {
        key: '2026-02',
        label: '2026-02',
        year: 2026,
        month: 2,
        income: 150,
        outcome: 80,
        balance: 70,
      },
    ]);

    expect(delta).toMatchObject({
      incomeChange: 50,
      outcomeChange: 40,
      balanceChange: 10,
      incomePercent: 50,
      outcomePercent: 100,
    });
  });
});
