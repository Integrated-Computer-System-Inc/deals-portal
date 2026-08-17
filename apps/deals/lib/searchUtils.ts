import { CustomerLookupResult } from '@my-app/types';

/**
 * Common noise suffixes in company names to normalize for comparison
 */
const CORPORATE_NOISE_REGEX = /\b(inc|incorporated|corp|corporation|co|company|ltd|limited|holdings|holding|group|enterprises|phils|philippines|phil|ph|gmbh|llc|plc)\b/gi;

/**
 * Common Philippine corporate acronyms and synonyms
 */
const ACRONYM_SYNONYMS: Record<string, string[]> = {
  bpi: ['bank of the philippine islands', 'bpi family savings', 'bpi capital'],
  bdo: ['banco de oro', 'bdo unibank', 'bdo capital', 'bdo private'],
  pldt: ['philippine long distance telephone', 'smart communications', 'pldt enterprise'],
  mwc: ['manila water company', 'manila water'],
  sm: ['sm prime holdings', 'sm prime', 'shoemart', 'sm investments', 'sm retail'],
  rcbc: ['rizal commercial banking corporation', 'rcbc savings bank'],
  metrobank: ['metropolitan bank and trust company', 'metrobank card'],
  pnb: ['philippine national bank'],
  meralco: ['manila electric company', 'meralco energy'],
  globe: ['globe telecom', 'innove communications'],
  smc: ['san miguel corporation', 'san miguel'],
  ictsi: ['international container terminal services'],
  ubp: ['union bank of the philippines', 'unionbank'],
  secb: ['security bank corporation', 'security bank'],
};

/**
 * Computes Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates string similarity ratio from 0.0 (completely different) to 1.0 (exact match)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, (maxLen - dist) / maxLen);
}

/**
 * Cleans string of punctuation and corporate noise words
 */
export function cleanCorporateName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(CORPORATE_NOISE_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if query words match company words fuzzily (allowing typos)
 */
function fuzzyTokenMatch(queryWord: string, companyWords: string[]): { matched: boolean; similarity: number } {
  if (queryWord.length < 3) {
    // For very short words (2 chars), only exact or prefix match
    const exact = companyWords.some((cw) => cw === queryWord || cw.startsWith(queryWord));
    return { matched: exact, similarity: exact ? 1.0 : 0 };
  }

  let bestSim = 0;
  for (const cw of companyWords) {
    if (cw === queryWord) return { matched: true, similarity: 1.0 };
    if (cw.startsWith(queryWord) || queryWord.startsWith(cw)) {
      bestSim = Math.max(bestSim, 0.9);
      continue;
    }

    const sim = stringSimilarity(queryWord, cw);
    if (sim > bestSim) {
      bestSim = sim;
    }
  }

  // Allow match if similarity is at least 72% or edit distance is <= 2
  const isMatch = bestSim >= 0.72;
  return { matched: isMatch, similarity: bestSim };
}

/**
 * Multi-Tier Smart & Fuzzy Relevance Ranking Function
 * Computes relevance scores and assigns a matchTier:
 * - 'exact'   : Exact or cleaned exact match
 * - 'prefix'  : Starts with the search query
 * - 'token'   : All or primary search words found
 * - 'synonym' : Matched via acronym or company alias
 * - 'fuzzy'   : Close match with typos/phonetic similarity
 */
export function rankCustomersByRelevance<T extends { custName: string; isActive?: boolean; matchTier?: CustomerLookupResult['matchTier'] }>(
  items: T[],
  query: string
): (T & { matchTier: 'exact' | 'prefix' | 'token' | 'synonym' | 'fuzzy' })[] {
  const rawQuery = (query || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!rawQuery) return [];

  const cleanQuery = cleanCorporateName(rawQuery);
  const rawQueryWords = rawQuery.split(/\s+/).filter(Boolean);
  const cleanQueryWords = cleanQuery.split(/\s+/).filter(Boolean);

  const scoredList = items.map((item) => {
    const rawName = (item.custName || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const cleanName = cleanCorporateName(rawName);
    const rawNameWords = rawName.split(/\s+/).filter(Boolean);
    const cleanNameWords = cleanName.split(/\s+/).filter(Boolean);

    let score = 0;
    let tier: 'exact' | 'prefix' | 'token' | 'synonym' | 'fuzzy' = 'fuzzy';

    // 1. Exact Match (Raw or Clean)
    if (rawName === rawQuery || cleanName === cleanQuery) {
      score += 10000;
      tier = 'exact';
    }
    // 2. Prefix Match
    else if (rawName.startsWith(rawQuery) || cleanName.startsWith(cleanQuery)) {
      score += 8000;
      const lenDiff = Math.abs(rawName.length - rawQuery.length);
      score += Math.max(0, 500 - lenDiff * 10);
      tier = 'prefix';
    }
    // 3. Acronym / Synonym Match
    else if (
      ACRONYM_SYNONYMS[rawQuery]?.some((syn) => rawName.includes(syn) || cleanName.includes(cleanCorporateName(syn))) ||
      Object.entries(ACRONYM_SYNONYMS).some(([acr, syns]) =>
        rawQuery.includes(acr) && syns.some((syn) => rawName.includes(syn))
      )
    ) {
      score += 6500;
      tier = 'synonym';
    }
    // 4. Substring Phrase Match
    else if (rawName.includes(rawQuery) || (cleanQuery.length > 2 && cleanName.includes(cleanQuery))) {
      score += 5500;
      const pos = rawName.indexOf(rawQuery);
      score += Math.max(0, 400 - (pos >= 0 ? pos * 20 : 0));
      tier = 'token';
    }
    // 5. All Clean Words Present (Word-Order Independent)
    else if (cleanQueryWords.length > 1 && cleanQueryWords.every((w) => cleanName.includes(w))) {
      score += 5000;
      if (cleanName.startsWith(cleanQueryWords[0])) score += 500;
      tier = 'token';
    }
    // 6. Fuzzy Word-by-Word Matching (Typo Tolerance)
    else {
      const wordsToTest = cleanQueryWords.length > 0 ? cleanQueryWords : rawQueryWords;
      const targetWords = cleanNameWords.length > 0 ? cleanNameWords : rawNameWords;

      let totalWordSim = 0;
      let matchedCount = 0;

      for (const qw of wordsToTest) {
        const { matched, similarity } = fuzzyTokenMatch(qw, targetWords);
        if (matched) {
          matchedCount++;
          totalWordSim += similarity;
        }
      }

      const matchRatio = wordsToTest.length > 0 ? matchedCount / wordsToTest.length : 0;

      if (matchRatio >= 0.5) {
        // High confidence fuzzy match
        const avgSim = matchedCount > 0 ? totalWordSim / matchedCount : 0;
        score += 2000 * matchRatio + 1500 * avgSim;
        tier = matchRatio === 1 ? (avgSim > 0.9 ? 'token' : 'fuzzy') : 'fuzzy';
      } else {
        // Check whole-string similarity as last resort
        const overallSim = stringSimilarity(cleanQuery, cleanName);
        if (overallSim >= 0.65) {
          score += 1500 * overallSim;
          tier = 'fuzzy';
        }
      }
    }

    // Active Account Preference Bonus
    if (item.isActive) {
      score += 50;
    }

    return {
      item: {
        ...item,
        matchTier: tier,
      },
      score,
    };
  });

  return scoredList
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

/**
 * Normalizes Business Unit code into standard format (e.g., 'bu 5' -> 'BU5', 'bu-1' -> 'BU1', 'bu12' -> 'BU12')
 */
export function normalizeBusinessUnit(rawBu?: string | null): string {
  if (!rawBu) return 'BU5';
  const trimmed = rawBu.trim();
  if (!trimmed) return 'BU5';

  // If already standard BU pattern like BU5, bu 5, bu-5, BU_5, BU 10
  const match = trimmed.match(/^BU\s*[-_]?\s*(\d+)$/i);
  if (match) {
    return `BU${match[1]}`;
  }

  // If pure number like '5' or '10'
  if (/^\d+$/.test(trimmed)) {
    return `BU${trimmed}`;
  }

  // Otherwise, return cleaned uppercase string
  return trimmed.toUpperCase();
}

