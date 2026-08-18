const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Formats a date into "MMMM DD, YYYY" (e.g. "August 18, 2026")
 */
export function formatDateLong(
  dateInput: string | Date | null | undefined,
  fallback: string = 'N/A'
): string {
  if (!dateInput) return fallback;

  try {
    // If it's a YYYY-MM-DD or YYYY-MM-DDTHH... string, parse directly to avoid timezone drift
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      if (!trimmed) return fallback;
      const clean = trimmed.split('T')[0];
      const parts = clean.split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const [year, month, day] = parts;
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const monthName = MONTH_NAMES[month - 1];
          return `${monthName} ${day}, ${year}`;
        }
      }
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;

    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (err) {
    return fallback;
  }
}

export function timeAgo(dateStr: string): string {
  const now = new Date().getTime();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return formatDateLong(dateStr);
}

export function fullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatActivityDateKey(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return 'Earlier';
  }
}

/**
 * Safely adds days to a date string formatted as YYYY-MM-DD using UTC arithmetic
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr || isNaN(days)) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  
  const [year, month, day] = parts;
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Calculates the difference in days between two YYYY-MM-DD date strings
 */
export function getDaysDifference(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const cleanStart = startDateStr.split('T')[0];
  const cleanEnd = endDateStr.split('T')[0];
  
  const p1 = cleanStart.split('-').map(Number);
  const p2 = cleanEnd.split('-').map(Number);
  if (p1.length !== 3 || p2.length !== 3 || p1.some(isNaN) || p2.some(isNaN)) return 0;

  const t1 = Date.UTC(p1[0], p1[1] - 1, p1[2]);
  const t2 = Date.UTC(p2[0], p2[1] - 1, p2[2]);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}
