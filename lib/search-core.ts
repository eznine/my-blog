export interface SearchItem {
  type: 'note' | 'research' | 'project';
  typeLabel: string;
  title: string;
  url: string;
  date: string;
  summary: string;
  category: string;
  tags: string[];
  text: string;
}

export interface SearchHit extends SearchItem {
  score: number;
  snippet: string;
}

function tokenize(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    count += 1;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return count;
}

export function searchItems(items: SearchItem[], query: string): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const hits: SearchHit[] = [];

  for (const item of items) {
    const title = item.title.toLowerCase();
    const summary = item.summary.toLowerCase();
    const category = item.category.toLowerCase();
    const text = item.text.toLowerCase();

    let score = 0;
    let matchedAll = true;
    let firstIdx = -1;

    for (const token of tokens) {
      let tokenScore = 0;
      if (title.includes(token)) tokenScore += 8;
      if (item.tags.some((t) => t.toLowerCase().includes(token))) tokenScore += 5;
      if (category.includes(token)) tokenScore += 4;
      if (summary.includes(token)) tokenScore += 3;
      const c = countOccurrences(text, token);
      if (c > 0) tokenScore += Math.min(c, 5);

      if (tokenScore === 0) {
        matchedAll = false;
        break;
      }
      score += tokenScore;

      const idx = text.indexOf(token);
      if (firstIdx === -1 || (idx !== -1 && idx < firstIdx)) firstIdx = idx;
    }

    if (!matchedAll) continue;

    if (title.includes(tokens.join(' '))) score += 10;

    let snippet: string;
    if (firstIdx > -1) {
      const start = Math.max(0, firstIdx - 36);
      snippet = (start > 0 ? '…' : '') + item.text.slice(start, start + 120) + '…';
    } else {
      snippet = item.summary || item.text.slice(0, 100) + '…';
    }

    hits.push({ ...item, score, snippet });
  }

  return hits.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
}
