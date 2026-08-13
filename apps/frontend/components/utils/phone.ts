/**
 * Removes all whitespace from phone string when saving to backend API.
 */
export function stripPhoneSpaces(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\s+/g, '').trim();
}

/**
 * Formats a raw phone string into unspaced string with leading zero for copying.
 * E.g.: "917 123 4567" -> "09171234567"
 * E.g.: "0917 123 4567" -> "09171234567"
 */
export function formatPhoneForCopy(phone?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\s+/g, '').trim();
  if (!clean) return '';

  // If 10 digits starting with 9, prepend leading 0
  if (/^9\d{9}$/.test(clean)) {
    clean = '0' + clean;
  }

  return clean;
}

/**
 * Formats a raw phone string into clean, readable spaced format for display.
 * E.g.: "9171234567" -> "0917 123 4567"
 * E.g.: "09171234567" -> "0917 123 4567"
 */
export function formatPhoneForDisplay(phone?: string): string {
  if (!phone) return '';

  let clean = phone.replace(/\s+/g, '').trim();
  if (!clean) return '';

  // If 10 digits starting with 9, prepend leading 0
  if (/^9\d{9}$/.test(clean)) {
    clean = '0' + clean;
  }

  // 11 digits starting with 0: e.g. 09171234567 -> 0917 123 4567
  if (/^0\d{10}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }

  // 12 digits starting with +63 (e.g., +639171234567 -> +63 917 123 4567)
  if (/^\+63\d{10}$/.test(clean)) {
    return `+63 ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
  }

  // Generic formatting for digits if not matching above (chunks of 3-4)
  if (/^\d{7,11}$/.test(clean)) {
    return clean.replace(/(\d{3,4})(?=(\d{3,4})+(?!\d))/g, '$1 ');
  }

  return phone;
}
