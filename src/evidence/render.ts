// Typographic rendering of a transcribed page: capitals without accents or
// word breaks, as the scribe wrote them, on a papyrus or parchment tone. The
// verse being read is lit; lacunae are left as gaps; corrections can be
// switched between the first hand and the corrector.
import { h } from '../lib/dom';
import type { Token, TxPage } from './data';

/** Strip accents and breathings and fold to capitals, keeping the letters. */
export function uncial(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/Σ/g, 'C')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export interface RenderOpts {
  verse: string;
  /** Show only the lines that carry the verse, plus this many either side. */
  window?: number;
  /** Show the corrector's text instead of the first hand's. */
  corrected?: boolean;
  papyrus?: boolean;
  onToken?: (t: Token, el: HTMLElement) => void;
}

export function renderPage(page: TxPage, o: RenderOpts): HTMLElement {
  const cols = page.columns.map((col) => {
    let lines = col.lines;
    if (o.window != null) {
      const idx = lines.map((l, i) => (l.tokens.some((t) => t.v === o.verse) ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) return null;
      lines = lines.slice(Math.max(0, idx[0] - o.window), idx[idx.length - 1] + 1 + o.window);
    }
    return h(
      'div',
      { class: 'tx__col' },
      lines.map((l) =>
        h(
          'div',
          { class: 'tx__line' },
          h('span', { class: 'tx__n', 'aria-hidden': 'true' }, String(l.n)),
          h(
            'span',
            { class: 'tx__text' },
            l.tokens.map((t) => {
              const text = o.corrected && t.corr ? t.corr.t : t.t;
              if (t.lac) return h('span', { class: 'tx__lac', style: { width: `${Math.max(1, uncial(t.t).length || 3) * 0.72}em` }, title: 'Lost from the page', 'aria-label': 'lacuna' });
              const el = h(
                'span',
                {
                  class: `tx__w${t.v === o.verse ? ' is-spot' : ''}${t.ns ? ' tx__ns' : ''}${t.corr ? ' tx__corr' : ''}`,
                  title: t.ns ? `Abbreviated sacred name for ${t.ns}` : t.corr ? `Corrected (${t.corr.hand}): ${t.corr.t}` : null,
                },
                uncial(text),
              );
              if (o.onToken) el.addEventListener('click', () => o.onToken!(t, el));
              return el;
            }),
          ),
        ),
      ),
    );
  });
  return h(
    'div',
    { class: `tx ${o.papyrus ? 'tx--papyrus' : 'tx--vellum'}${o.window != null ? ' tx--snip' : ''}`, lang: 'grc' },
    cols.filter(Boolean) as HTMLElement[],
  );
}

/** The tokens of one verse, in order, across the page's columns. */
export function verseTokens(page: TxPage, verse: string): Token[] {
  return page.columns.flatMap((c) => c.lines.flatMap((l) => l.tokens.filter((t) => t.v === verse)));
}

export const hasCorrections = (page: TxPage, verse: string) => verseTokens(page, verse).some((t) => t.corr);

/** Normalized form for matching a manuscript's word against the edition. */
export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/[^\p{L}]/gu, '');

/**
 * Align manuscript tokens with edition words by longest common subsequence on
 * normalized spelling (sacred names use their expansion). Returns pairs of
 * [msIndex, edIndex] for the words that match.
 */
export function alignWords(ms: string[], ed: string[]): [number, number][] {
  const a = ms.map(norm);
  const b = ed.map(norm);
  const n = a.length;
  const m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push([i, j]);
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  return out;
}
