// Typed access to /data/*.json. Components read figures only from here.
import sourceText from '../data/source-text.json';
import skeptics from '../data/skeptics.json';

export { sourceText, skeptics };

export type ModuleKey = keyof typeof skeptics.modules;

const BIB = skeptics.bibliography as Record<string, string>;

/** "Ehrman, Misquoting Jesus (2005), chs. 6–7" from a bibliography key. */
export function shortCite(key: string, loc?: string): string {
  const full = BIB[key];
  if (!full) return key;
  const year = (full.match(/\b(1[5-9]\d\d|20\d\d)\b/) ?? [])[1] ?? '';
  let author = '';
  let rest = full;
  if (!/^['‘"]/.test(full)) {
    const i = full.indexOf(', ');
    author = full.slice(0, i);
    rest = full.slice(i + 2);
    const people = author.split(/ and /).map((p) => {
      const ed = p.includes('(ed.)') ? ' (ed.)' : '';
      const words = p.replace('(ed.)', '').trim().split(' ');
      return words[words.length - 1] + ed;
    });
    author = people.join(' & ');
  }
  const title = rest
    .replace(/^['‘"]/, '')
    .split(/['’"]?,\s|:\s| \(/)[0]
    .replace(/['’"]$/, '');
  return `${author ? `${author}, ` : ''}${title}${year ? ` (${year})` : ''}${loc ? `, ${loc}` : ''}`;
}

export const fullCite = (key: string) => BIB[key] ?? key;

export interface SkepticEntry {
  text: string;
  source?: string;
  reply?: string;
  replySource?: string;
}

interface RawPoint {
  text: string;
  cite: string;
  loc?: string;
  cite_note?: string;
  reply: string;
  reply_cite: string;
  reply_loc?: string;
}

export function skepticsFor(key: ModuleKey) {
  const m = skeptics.modules[key] as { intro: string; framing?: boolean; points: RawPoint[] };
  return {
    intro: m.intro,
    framing: m.framing ? { title: skeptics.framing.title, text: skeptics.framing.text, source: shortCite(skeptics.framing.cite) } : undefined,
    points: m.points.map(
      (p): SkepticEntry => ({
        text: p.text,
        source: `${p.cite_note ? `${p.cite_note} ` : ''}${shortCite(p.cite, p.loc)}`,
        reply: p.reply,
        replySource: shortCite(p.reply_cite, p.reply_loc),
      }),
    ),
  };
}
