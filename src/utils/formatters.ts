export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateTimeIndo(dateTimeStr: string): string {
  if (!dateTimeStr) return '-';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateTimeStr;
  }
}

export function getStatusDetails(status: string): {
  label: string;
  badgeClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  switch (status.toLowerCase()) {
    case 'paid':
      return {
        label: 'Lunas',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        bgClass: 'bg-emerald-500',
        borderClass: 'border-emerald-500',
        textClass: 'text-emerald-700',
      };
    case 'pending':
      return {
        label: 'Menunggu',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        bgClass: 'bg-amber-500',
        borderClass: 'border-amber-500',
        textClass: 'text-amber-700',
      };
    case 'overdue':
      return {
        label: 'Jatuh Tempo',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
        bgClass: 'bg-rose-500',
        borderClass: 'border-rose-500',
        textClass: 'text-rose-700',
      };
    case 'partial':
      return {
        label: 'Sebagian',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        bgClass: 'bg-blue-500',
        borderClass: 'border-blue-500',
        textClass: 'text-blue-700',
      };
    case 'draft':
      return {
        label: 'Draft',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        bgClass: 'bg-slate-500',
        borderClass: 'border-slate-500',
        textClass: 'text-slate-700',
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        bgClass: 'bg-slate-400',
        borderClass: 'border-slate-400',
        textClass: 'text-slate-600',
      };
  }
}
