// Where a verse sits on a photographed page, when that has been recorded
// (data/evidence/lineboxes/<GA>/<pageId>.json). Without such a file nothing is
// drawn on the photograph.
import { EVD } from './data';

export interface Box {
  /** Fractions of the image width and height. */
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'line' | 'word';
}
export interface Overlay {
  boxes: Box[];
  caption: string;
}

export interface LineBoxes {
  ga: string;
  pageId: string;
  /** How the line positions were found. */
  method: string;
  lines: { n: number; col?: number; box: [number, number, number, number]; conf: number; verses?: string[] }[];
  words?: { v: string; i: number; box: [number, number, number, number]; placed: 'manual'; by?: string }[];
}

const cache = new Map<string, Promise<LineBoxes | null>>();
export function loadLineBoxes(ga: string, pageId: string): Promise<LineBoxes | null> {
  const k = `${ga}/${pageId}`;
  let p = cache.get(k);
  if (!p) {
    p = fetch(`${EVD}lineboxes/${k}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    cache.set(k, p);
  }
  return p;
}

/** Minimum confidence for drawing an automatically found line. */
export const MIN_CONF = 0.6;

export async function overlayFor(ga: string, pageId: string, verse: string): Promise<Overlay | null> {
  const lb = await loadLineBoxes(ga, pageId);
  if (!lb) return null;
  const words = (lb.words ?? []).filter((w) => w.v === verse);
  if (words.length)
    return {
      boxes: words.map((w) => ({ x: w.box[0], y: w.box[1], w: w.box[2], h: w.box[3], kind: 'word' })),
      caption: 'Each word of the verse is outlined where it was placed by hand and checked by a second reader.',
    };
  const lines = lb.lines.filter((l) => l.verses?.includes(verse) && l.conf >= MIN_CONF);
  if (!lines.length) return null;
  const conf = Math.min(...lines.map((l) => l.conf));
  return {
    boxes: lines.map((l) => ({ x: l.box[0], y: l.box[1], w: l.box[2], h: l.box[3], kind: 'line' })),
    caption: `The lines carrying the verse are outlined from automatic line detection (lowest confidence ${Math.round(conf * 100)}%); the words within them are not placed.`,
  };
}
