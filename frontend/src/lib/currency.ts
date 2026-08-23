/**
 * Format a number as Colombian Pesos (COP)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as Colombian Pesos with sign prefix
 */
export function formatCurrencyWithSign(amount: number, type: 'income' | 'outcome'): string {
  const formatted = formatCurrency(Math.abs(amount));
  return type === 'income' ? `+${formatted}` : `-${formatted}`;
}

/**
 * Compact currency for chart axis labels (e.g. $1,2 M)
 */
export function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

