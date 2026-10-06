export function formatCurrencyARS(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatRelativeDate(isoDateString?: string): string {
  if (!isoDateString) return 'Sin fecha';
  const updated = new Date(isoDateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return `hace ${diffDays} días`;
}
