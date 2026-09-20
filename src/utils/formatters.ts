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

export function getPaymentMethodDetails(method: string): {
  label: string;
  badgeClass: string;
  color: string;
} {
  switch (method?.toLowerCase()) {
    case 'bca':
      return {
        label: 'Bank BCA',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        color: 'blue',
      };
    case 'bri':
      return {
        label: 'Bank BRI',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
        color: 'sky',
      };
    case 'dana':
    case 'dana_bisnis':
      return {
        label: 'DANA',
        badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        color: 'cyan',
      };
    case 'gojek':
    case 'gopay':
      return {
        label: 'Gojek (GoPay)',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        color: 'emerald',
      };
    case 'qris_dinamis':
      return {
        label: 'QRIS Dinamis',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
        color: 'purple',
      };
    case 'cash':
      return {
        label: 'Tunai (Cash)',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        color: 'amber',
      };
    case 'bank_transfer':
      return {
        label: 'Transfer Bank',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        color: 'indigo',
      };
    default:
      return {
        label: method ? method.replace(/_/g, ' ').toUpperCase() : 'Lainnya',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        color: 'slate',
      };
  }
}

