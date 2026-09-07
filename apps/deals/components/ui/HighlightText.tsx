'use client';

import React from 'react';

export interface HighlightTextProps {
  /** The text string to search within and render */
  text: string | null | undefined;
  /** Search terms: can be a string (supports comma/space delimited terms) or an array of string terms */
  terms: string | string[] | null | undefined;
  /** Optional container class name */
  className?: string;
  /** Optional custom styling for highlighted matches */
  highlightClassName?: string;
}

/**
 * Escapes regex special characters to prevent invalid regex execution
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Theme-aware keyword highlighter component.
 * Highlights matching terms with seamless, beautiful styling for both light and dark modes.
 */
export function HighlightText({
  text,
  terms,
  className = '',
  highlightClassName,
}: HighlightTextProps) {
  if (!text) return null;

  // Extract all individual non-empty search terms
  const rawTerms = Array.isArray(terms) ? terms : terms ? [terms] : [];
  const termList: string[] = [];

  for (const item of rawTerms) {
    if (!item) continue;
    // Split by comma first (for multi-keyword comma search)
    const commaParts = item.split(',');
    for (const cp of commaParts) {
      const trimmed = cp.trim();
      if (trimmed.length > 0) {
        termList.push(trimmed);
        // Also add space-separated sub-words if phrase has spaces
        const subWords = trimmed.split(/\s+/).filter((w) => w.length > 0);
        if (subWords.length > 1) {
          termList.push(...subWords);
        }
      }
    }
  }

  // If no terms provided, render plain text
  if (termList.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Deduplicate and sort descending by length so longer substrings match before shorter ones
  const uniqueTerms = Array.from(
    new Set(termList.map((t) => t.toLowerCase()))
  ).sort((a, b) => b.length - a.length);

  if (uniqueTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Default theme-aware highlight styling:
  // - Light mode: soft amber background, deep warm text, subtle rounded pill
  // - Dark mode: translucent golden-amber badge, luminous amber text, subtle border
  const defaultHighlightClass =
    'bg-amber-200/90 text-amber-950 font-bold px-0.5 py-0.2 rounded-xs ' +
    'dark:bg-amber-500/25 dark:text-amber-200 dark:border dark:border-amber-500/40 dark:shadow-xs';

  const finalHighlightClass = highlightClassName || defaultHighlightClass;

  try {
    const pattern = new RegExp(`(${uniqueTerms.map(escapeRegExp).join('|')})`, 'gi');
    const parts = String(text).split(pattern);

    return (
      <span className={className}>
        {parts.map((part, index) => {
          const isMatch = uniqueTerms.includes(part.toLowerCase());
          return isMatch ? (
            <mark key={index} className={`${finalHighlightClass} inline-block leading-tight`}>
              {part}
            </mark>
          ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
          );
        })}
      </span>
    );
  } catch {
    return <span className={className}>{text}</span>;
  }
}

export default HighlightText;
