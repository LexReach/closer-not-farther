// IIIF manifest helpers for the viewer: list the canvases of a v2 or v3
// manifest, and pick the first real page rather than a cover or colour chart.
export interface Canvas {
  label: string;
  service: string | null;
  image: string | null;
}

const labelText = (l: unknown): string => {
  if (typeof l === 'string') return l;
  if (Array.isArray(l)) return l.map(labelText).join(' ');
  if (l && typeof l === 'object') {
    const o = l as Record<string, unknown>;
    if ('@value' in o) return String(o['@value']);
    return Object.values(o).map(labelText).join(' ');
  }
  return '';
};
const idOf = (x: unknown): string | null => {
  if (!x) return null;
  if (Array.isArray(x)) return idOf(x[0]);
  const o = x as Record<string, unknown>;
  return (o['@id'] as string) ?? (o.id as string) ?? null;
};

/** Canvases of a IIIF Presentation v2 or v3 manifest. */
export function manifestCanvases(m: Record<string, unknown>): Canvas[] {
  const v2 = (m.sequences as { canvases?: Record<string, unknown>[] }[] | undefined)?.[0]?.canvases;
  if (v2) {
    return v2.map((c) => {
      const res = (c.images as { resource?: Record<string, unknown> }[] | undefined)?.[0]?.resource ?? {};
      return { label: labelText(c.label), service: idOf(res.service), image: idOf(res) };
    });
  }
  const v3 = m.items as Record<string, unknown>[] | undefined;
  return (v3 ?? []).map((c) => {
    const body = ((c.items as { items?: { body?: Record<string, unknown> }[] }[] | undefined)?.[0]?.items?.[0]?.body ?? {}) as Record<string, unknown>;
    return { label: labelText(c.label), service: idOf(body.service), image: idOf(body) };
  });
}

const FOLIO_1 = /^\s*(?:f(?:ol(?:io)?)?\.?\s*)?0*1\s*[ra]?\s*$|^\s*(?:f(?:ol)?\.?\s*)0*1\b|\b0*1\s*(?:r|recto)\b/i;
const COVER = /(cover|flyleaf|fly-leaf|guard|plat|reliure|binding|spine|\bdos\b|garde|contreplat|pastedown|endpaper|tranche|edge|colour chart|color chart)/i;

/** The first real page: a canvas labelled folio 1, else the first after any cover/flyleaf/guard, else the third. */
export function firstPage(canvases: Canvas[]): number {
  const f1 = canvases.findIndex((c) => FOLIO_1.test(c.label));
  if (f1 >= 0) return f1;
  let lastCover = -1;
  canvases.forEach((c, i) => {
    if (COVER.test(c.label) && i < canvases.length / 2) lastCover = i;
  });
  if (lastCover >= 0 && lastCover + 1 < canvases.length) return lastCover + 1;
  return canvases.length >= 3 ? 2 : 0;
}

/** Normalize a folio or page label: "fol. 12 recto" → "12r", "p. 7" → "7". */
export function folioKey(label: string): string | null {
  const l = label.toLowerCase().replace(/\brecto\b/g, 'r').replace(/\bverso\b/g, 'v');
  const m =
    l.match(/\b(?:f|fol|folio)\.?\s*0*(\d+)\s*([rv])?\b/) ??
    l.match(/(?:^|\s)0*(\d+)\s*([rv])\b/) ??
    l.match(/^\s*(?:p\.?|pp\.?|page|pag\.?)?\s*0*(\d+)\s*()$/);
  return m ? `${m[1]}${m[2] ?? ''}` : null;
}

/** Index of the canvas whose label names this folio, or -1. */
export function findFolio(canvases: Canvas[], folio: string): number {
  const want = folioKey(folio);
  if (!want) return -1;
  return canvases.findIndex((c) => folioKey(c.label) === want);
}
