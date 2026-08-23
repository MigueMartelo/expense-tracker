# Feature: Monthly Income vs. Outcome Comparison Charts (Web)

**Goal:** Add a visual analytics screen to the web app where users can see income and outcome per month side-by-side and compare trends over time.

**Target app:** `frontend/` (TanStack Start + React 19 + Tailwind v4 + shadcn/ui + TanStack Query)

**Backend changes:** None. All data comes from the existing `GET /expenses` endpoint via `expensesApi.getAll()`, aggregated client-side.

---

## Overview

Today the dashboard (`frontend/src/routes/_authenticated/expenses/index.tsx`) only shows summary cards for the **current** month and today's transactions. This feature introduces a dedicated **Analytics** page that:

1. Aggregates all expenses into per-month buckets (income, outcome, balance).
2. Renders a grouped **bar chart** comparing income vs. outcome for each month.
3. Overlays / offers a **balance line** so users can see net cash flow trend.
4. Lets users pick a time range (Last 6 / 12 months / All).
5. Shows a small comparison summary (e.g. "vs. previous month" deltas).

---

## Tech Choice: Charting Library

Use **Recharts** via the **shadcn/ui chart component**. It's the natural fit because the project already uses shadcn/ui + Tailwind v4, and the shadcn `chart` wrapper handles theming (light/dark), tooltips, and legends consistently with the rest of the UI.

Install:

```bash
cd frontend
npm install recharts
```

Then add the shadcn chart primitive at `frontend/src/components/ui/chart.tsx` (copy from the shadcn docs — it exports `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, and a `ChartConfig` type). This matches how the other `ui/*.tsx` components are structured.

> Note: Recharts 2.x has a peer dep on React 18; with React 19 install may warn. If `npm install` complains, use `npm install recharts --legacy-peer-deps`, or use Recharts 3.x which supports React 19.

---

## New Concepts / Building Blocks

### 1. Monthly aggregation helper

Create a pure helper that turns a flat `Expense[]` into sorted monthly buckets. Put it in a new file `frontend/src/lib/analytics.ts` so it's testable (the project uses vitest).

```ts
import { ExpenseType, type Expense } from '@/types';

export interface MonthlyBucket {
  key: string;        // "2026-01"
  label: string;      // "Jan 2026" (localized at render time)
  year: number;
  month: number;      // 1-12
  income: number;
  outcome: number;
  balance: number;    // income - outcome
}

// Reuse the same local-date parsing already used in the dashboard
export function getMonthKey(dateValue: string): string {
  return dateValue.substring(0, 7); // "YYYY-MM"
}

export function aggregateByMonth(expenses: Expense[]): MonthlyBucket[] {
  const map = new Map<string, MonthlyBucket>();

  for (const e of expenses) {
    const key = getMonthKey(e.date);
    const [year, month] = key.split('-').map(Number);
    const bucket =
      map.get(key) ??
      { key, label: key, year, month, income: 0, outcome: 0, balance: 0 };

    if (e.type === ExpenseType.INCOME) bucket.income += Number(e.amount);
    else bucket.outcome += Number(e.amount);
    bucket.balance = bucket.income - bucket.outcome;

    map.set(key, bucket);
  }

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function lastNMonths(buckets: MonthlyBucket[], n: number): MonthlyBucket[] {
  return n > 0 ? buckets.slice(-n) : buckets;
}
```

### 2. shadcn Chart config

The chart needs a `ChartConfig` object mapping data keys to labels/colors. Reuse the app's existing color language (emerald for income, rose for outcome, blue for balance):

```ts
const chartConfig = {
  income: { label: t('expenses.income'), color: 'var(--color-emerald-500)' },
  outcome: { label: t('expenses.expense'), color: 'var(--color-rose-500)' },
  balance: { label: t('expenses.balance'), color: 'var(--color-blue-500)' },
} satisfies ChartConfig;
```

### 3. Grouped BarChart + optional balance line

Recharts `BarChart` with two `<Bar>` series (income, outcome) grouped per month, plus an optional `<Line>` (using `ComposedChart`) for balance.

---

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `frontend/package.json` | modify | add `recharts` dependency |
| `frontend/src/components/ui/chart.tsx` | create | shadcn chart primitives |
| `frontend/src/lib/analytics.ts` | create | monthly aggregation helpers |
| `frontend/src/lib/analytics.test.ts` | create | unit tests for aggregation |
| `frontend/src/routes/_authenticated/analytics/index.tsx` | create | the Analytics page/route |
| `frontend/src/components/analytics/MonthlyComparisonChart.tsx` | create | the chart component |
| `frontend/src/components/analytics/RangeSelector.tsx` | create | 6 / 12 / All toggle |
| `frontend/src/components/layout/AppLayout.tsx` | modify | add nav link (desktop + mobile) |
| `frontend/src/locales/en/common.json` | modify | add `analytics.*` keys |
| `frontend/src/locales/es/common.json` | modify | add `analytics.*` keys |
| `frontend/src/routeTree.gen.ts` | auto | regenerated by the router plugin |

---

## Step-by-Step Instructions

### Step 1: Install Recharts and add the chart primitive
Install `recharts` and add `frontend/src/components/ui/chart.tsx` from the shadcn/ui chart docs.

### Step 2: Build the aggregation helper + tests
Implement `frontend/src/lib/analytics.ts` as above. Add `analytics.test.ts` covering:
- empty array → `[]`
- multiple expenses in the same month sum correctly
- months come back sorted ascending
- `balance = income - outcome`
- `lastNMonths` slices from the end

### Step 3: Create the Analytics route
Create `frontend/src/routes/_authenticated/analytics/index.tsx`:

```tsx
export const Route = createFileRoute('/_authenticated/analytics/')({
  component: AnalyticsPage,
});
```

Inside `AnalyticsPage`:
1. `useQuery({ queryKey: ['expenses'], queryFn: () => expensesApi.getAll() })` (shares cache with the dashboard).
2. `const buckets = useMemo(() => aggregateByMonth(expenses ?? []), [expenses])`.
3. Local state for range: `useState<6 | 12 | 0>(6)`; derive `visible = lastNMonths(buckets, range)`.
4. Show a `Skeleton` while `isLoading` (match the dashboard's skeleton pattern).
5. Show an empty state (`common.noData`) when there are no buckets.

### Step 4: Build `MonthlyComparisonChart`
`frontend/src/components/analytics/MonthlyComparisonChart.tsx` takes `data: MonthlyBucket[]`:
- Localize each bucket label with `date-fns` `format(new Date(year, month-1), 'MMM yyyy')`.
- Render a shadcn `ChartContainer` wrapping a Recharts `ComposedChart`:
  - `<CartesianGrid vertical={false} />`
  - `<XAxis dataKey="label" />`, `<YAxis>` with `tickFormatter={(v) => formatCurrency(v)}` (consider a compact formatter for axis).
  - `<Bar dataKey="income" fill="var(--color-income)" radius={4} />`
  - `<Bar dataKey="outcome" fill="var(--color-outcome)" radius={4} />`
  - Optional `<Line dataKey="balance" stroke="var(--color-balance)" />`
  - `<ChartTooltip content={<ChartTooltipContent />}/>` with currency formatting.
  - `<ChartLegend content={<ChartLegendContent />}/>`.
- Make it responsive (shadcn `ChartContainer` handles `ResponsiveContainer`).

### Step 5: Build the range selector
`RangeSelector.tsx` — three shadcn `Button`s (6 / 12 / All), styled like the dashboard filter buttons (`variant` toggles between `default` and `outline`). Wire to the parent's range state.

### Step 6: Add a comparison summary (the "comparation")
Above or beside the chart, show the current month vs. previous month deltas:
- % change in income, outcome, and balance.
- Use `TrendingUp` / `TrendingDown` icons (already used across the app) with emerald/rose coloring.
- Reuse `formatCurrency` from `@/lib/currency`.

### Step 7: Wire up navigation
In `frontend/src/components/layout/AppLayout.tsx`:
- Import a chart icon from `lucide-react` (e.g. `BarChart3`).
- Add a `<Link to='/analytics'>` button in the **desktop menu** block (next to Credit Cards / Categories / Budget) and in the **mobile menu** block, following the exact existing pattern.
- Use `t('analytics.title')` for the label.

### Step 8: Add i18n keys
Add to both `en/common.json` and `es/common.json`:

```jsonc
"analytics": {
  "title": "Analytics",
  "subtitle": "Compare income and expenses across months",
  "monthlyComparison": "Monthly Comparison",
  "range6": "Last 6 months",
  "range12": "Last 12 months",
  "rangeAll": "All time",
  "vsPreviousMonth": "vs. previous month",
  "netBalance": "Net balance"
}
```
(Spanish equivalents in `es/common.json`.)

### Step 9: Verify
- `npm run dev` in `frontend/`, log in, open the Analytics link.
- `npm run test` to confirm the aggregation unit tests pass.

---

## Acceptance Criteria

- [ ] A new **Analytics** page is reachable from both desktop and mobile navigation.
- [ ] A grouped bar chart shows income (emerald) and outcome (rose) per month.
- [ ] Months are sorted chronologically and labels are localized.
- [ ] A range selector switches between Last 6 / 12 / All months.
- [ ] Tooltips and axis values are formatted as currency via `formatCurrency`.
- [ ] A comparison summary shows current-vs-previous month deltas for income, outcome, and balance.
- [ ] Chart renders correctly in both light and dark mode.
- [ ] Loading skeleton and empty state (`common.noData`) are handled.
- [ ] Aggregation logic is covered by vitest unit tests.
- [ ] Layout is responsive (usable on mobile widths).

---

## Hints & Gotchas

- **Reuse the cache:** use the exact query key `['expenses']` (no filter) so the Analytics page shares data already fetched by the dashboard — no extra network cost.
- **Local dates:** dates come back like `"2026-01-05T00:00:00.000Z"`. Use `.substring(0, 7)` for the month key to avoid timezone shifting (same approach the dashboard already uses with `substring(0, 10)`).
- **Amounts are strings/decimals:** always wrap with `Number(expense.amount)` before summing (Prisma Decimal serializes as string).
- **Colors:** shadcn charts read `--color-<key>` CSS vars generated from your `chartConfig`; map them to the app's emerald/rose/blue palette for consistency with the dashboard cards.
- **Compact axis labels:** COP amounts get large; consider a compact Y-axis formatter (e.g. `Intl.NumberFormat('es-CO', { notation: 'compact' })`) while keeping full currency in tooltips.
- **Future extension:** the same `aggregateByMonth` helper can later power per-category breakdowns (pie/donut) or a year-over-year comparison, since it's a pure function over `Expense[]`.
