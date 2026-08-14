/**
 * Multi-Tier Search Relevance Ranking Function
 * Computes relevance scores based on exact matches, prefix matches, multi-token coverage, and active status.
 */
export function rankCustomersByRelevance<T extends { custName: string; isActive?: boolean }>(
  items: T[],
  query: string
): T[] {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  const getScore = (name: string, isActive?: boolean): number => {
    const n = name.toLowerCase().trim().replace(/\s+/g, ' ');
    let score = 0;

    // Tier 1: Exact Match (Highest priority)
    if (n === normalizedQuery) {
      score += 10000;
    }
    // Tier 2: Prefix Phrase Match (e.g. "Security Bank Corp" matches "Security Bank")
    else if (n.startsWith(normalizedQuery)) {
      score += 8000;
      const lengthProximity = Math.max(0, 500 - (n.length - normalizedQuery.length) * 10);
      score += lengthProximity;
    }
    // Tier 3: All Query Words Present in Name
    else if (queryWords.length > 1 && queryWords.every((w) => n.includes(w))) {
      score += 5000;
      if (n.startsWith(queryWords[0])) score += 1000;
      const lengthProximity = Math.max(0, 300 - Math.abs(n.length - normalizedQuery.length) * 5);
      score += lengthProximity;
    }
    // Tier 4: Substring Match of Full Query Phrase
    else if (n.includes(normalizedQuery)) {
      score += 3000;
      const pos = n.indexOf(normalizedQuery);
      score += Math.max(0, 500 - pos * 20);
      const lengthProximity = Math.max(0, 200 - (n.length - normalizedQuery.length) * 4);
      score += lengthProximity;
    }
    // Tier 5: First Query Token Matches
    else if (queryWords.length > 0 && n.includes(queryWords[0])) {
      score += 1500;
      const pos = n.indexOf(queryWords[0]);
      score += Math.max(0, 300 - pos * 15);
    }
    // Tier 6: Any Query Token Matches
    else if (queryWords.some((w) => n.includes(w))) {
      score += 500;
      const matchCount = queryWords.filter((w) => n.includes(w)).length;
      score += matchCount * 100;
    }

    // Active status bonus (helps distinguish active vs inactive accounts without Clinic/overshadowing exact matches)
    if (isActive) {
      score += 50;
    }

    return score;
  };

  return items
    .map((item) => ({
      item,
      score: getScore((item.custName || '').trim(), item.isActive),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
