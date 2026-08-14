/** Strip HTML tags and collapse whitespace to get a plain-text preview */
export function getPreviewText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Get a human-readable short filename from the full storage name */
export function displayFileName(name: string): string {
  if (!name) return '';
  // Strip the leading timestamp prefix (e.g. "1784011148395_")
  return name.replace(/^\d+_/, '');
}

/** Localize images pointing to the production domain to localhost during development */
export function localizeHtmlImages(html: string): string {
  if (!html) return '';
  return html.replace(/http:\/\/proport\.ics\.com\.ph/g, 'http://localhost:3001');
}
