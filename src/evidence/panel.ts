// The evidence panel: tap a verse and see every manuscript that carries it.
// A bottom sheet on phones and a right-hand rail on desktops. The header gives
// the count, the oldest witness and how the coverage was established; the
// strip lists the witnesses as cards; variants from the SBLGNT apparatus sit
// underneath.
import '../styles/evidence.css';
import { h, clear } from '../lib/dom';
import { href } from '../lib/nav';
import { bookById, refLabel, verseId, type Book, type Pos } from '../reader/bible';
import type { EvidenceLayer } from '../reader/reader';
import { loadLibrary, gaLabel, centuryLabel, thumbUrl, CAT_ONE, type LibraryData, type Ms } from '../library/data';
import { corpusOf, loadApparatus, loadSummary, loadTiers, loadTx, loadTxIndex, loadWitnesses, witnessesFor, type WitRow } from './data';
import { renderPage } from './render';

const NTVMR_NOTICE = 'Page index and transcriptions: INTF, New Testament Virtual Manuscript Room (Münster), used for non-commercial study with attribution.';

type Mode = 'all' | 'core';
type Sort = 'date' | 'ga' | 'tx';
const PREF = 'cnf-evidence';
interface Prefs {
  mode: Mode;
  sort: Sort;
}
function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREF) || '{}');
    return { mode: p.mode === 'core' ? 'core' : 'all', sort: ['date', 'ga', 'tx'].includes(p.sort) ? p.sort : 'date' };
  } catch {
    return { mode: 'all', sort: 'date' };
  }
}
const savePrefs = (p: Prefs) => {
  try {
    localStorage.setItem(PREF, JSON.stringify(p));
  } catch {
    /* not remembered */
  }
};

const n = (x: number) => x.toLocaleString('en-US');
const catOrder: Record<string, number> = { P: 0, M: 1, m: 2, L: 3 };
function gaKey(ga: string): [number, number] {
  const c = ga.startsWith('P') ? 0 : ga.startsWith('l') ? 3 : ga.startsWith('0') ? 1 : 2;
  return [c, parseInt(ga.replace(/\D/g, ''), 10) || 0];
}
const byGa = (a: string, b: string) => {
  const x = gaKey(a);
  const y = gaKey(b);
  return x[0] - y[0] || x[1] - y[1];
};
export function dateLabel(lib: LibraryData, ga: string): string {
  const f = lib.featured.find((x) => x.ga === ga);
  if (f) return f.date.replace(/\s*\(.*\)\s*$/, '');
  const m = lib.byGa.get(ga);
  return m ? centuryLabel(m) : 'Date unknown';
}

/** Gutter colour by the age of the oldest witness. */
function shadeFor(oldestCentury: number | null, count: number): string | null {
  if (!count) return null;
  if (oldestCentury == null) return 'var(--ev-late)';
  if (oldestCentury <= 4) return 'var(--ev-early)';
  if (oldestCentury <= 9) return 'var(--ev-mid)';
  return 'var(--ev-late)';
}

let sheet: HTMLElement | null = null;
let token = 0;

export function createEvidence(): EvidenceLayer {
  const prefs = loadPrefs();
  // Warm the catalogue so the first panel opens quickly.
  const libP = loadLibrary();
  loadTiers();

  function close() {
    token++;
    sheet?.remove();
    sheet = null;
    document.body.classList.remove('ev-open');
  }

  async function open(pos: Pos) {
    const b = bookById.get(pos.book)!;
    if (!pos.verse) return close();
    const my = ++token;
    if (b.testament === 'OT') {
      const { openOt } = await import('./ot');
      if (my !== token) return;
      return mount(await openOt(b, pos, close));
    }
    const t0 = performance.now();
    const [lib, wit, sum, tiers, txi, app] = await Promise.all([libP, loadWitnesses(b.id, pos.chapter), loadSummary(b.id), loadTiers(), loadTxIndex(b.id), loadApparatus(b.id)]);
    if (my !== token) return;
    const v = pos.verse;
    const key = `${pos.chapter}:${v}`;
    const vid = verseId(b.id, pos.chapter, v);
    const rows = wit ? witnessesFor(wit.rows, v) : [];
    const tx = txi[key] ?? {};
    const coreList = tiers?.corpora[corpusOf(b.id)];
    const core = new Set(Array.isArray(coreList) ? coreList : []);
    const pageLevel = rows.filter((r) => r[4] === 'p').length;
    const catLevel = rows.length - pageLevel;
    const s = sum?.chapters[pos.chapter - 1]?.[v - 1];
    const dated = rows
      .map((r) => ({ r, m: lib.byGa.get(r[0]) }))
      .filter((x) => x.m?.c0 != null)
      .sort((a, b2) => a.m!.c0! - b2.m!.c0! || byGa(a.r[0], b2.r[0]));
    const oldest = dated.filter((x) => x.m!.c0 === dated[0]?.m!.c0).map((x) => x.r[0]);

    const list = h('ol', { class: 'ev-strip', 'aria-label': 'Witnesses' });
    const countEl = h('span', { class: 'ev-count' });
    const modeAll = h('button', { type: 'button', class: 'ev-seg', 'aria-pressed': String(prefs.mode === 'all') }, 'All');
    const modeCore = h('button', { type: 'button', class: 'ev-seg', 'aria-pressed': String(prefs.mode === 'core'), title: 'The witnesses the NA28 edition cites consistently for this part of the New Testament' }, 'Most relied on');
    const sortSel = h(
      'select',
      { class: 'ev-sort', 'aria-label': 'Sort witnesses' },
      h('option', { value: 'date' }, 'Oldest first'),
      h('option', { value: 'ga' }, 'By number'),
      h('option', { value: 'tx' }, 'Transcribed first'),
    );
    sortSel.value = prefs.sort;
    const more = h('button', { type: 'button', class: 'btn ev-more', hidden: true });

    let shown = 0;
    let current: WitRow[] = [];
    const PAGE = 40;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          const el = e.target as HTMLElement;
          const ga = el.dataset.ga!;
          const pid = tx[ga];
          if (pid) {
            loadTx(ga, pid).then((page) => {
              if (!page || !el.isConnected) return;
              const slot = el.querySelector('.ev-card__art')!;
              clear(slot);
              slot.appendChild(renderPage(page, { verse: vid, window: 1, papyrus: lib.byGa.get(ga)?.cat === 'P' }));
            });
          }
        }
      },
      { root: null, rootMargin: '200px' },
    );

    function card(r: WitRow): HTMLElement {
      const [ga, , , , level] = r;
      const m: Ms | undefined = lib.byGa.get(ga);
      const img = lib.images[ga];
      const hasTx = !!tx[ga];
      const thumb = !hasTx && img ? thumbUrl(img, 200) : null;
      const art = h(
        'div',
        { class: `ev-card__art ${m?.cat === 'P' ? 'is-papyrus' : 'is-vellum'}` },
        hasTx ? h('span', { class: 'ev-card__ga-big' }, gaLabel(ga)) : thumb ? h('img', { src: thumb, alt: '', loading: 'lazy', decoding: 'async', onerror: (e: Event) => (e.target as HTMLElement).replaceWith(h('span', { class: 'ev-card__ga-big' }, gaLabel(ga))) }) : h('span', { class: 'ev-card__ga-big' }, gaLabel(ga)),
      );
      const btn = h(
        'button',
        { type: 'button', class: 'ev-card__btn', 'aria-label': `${gaLabel(ga)}${m?.name ? `, ${m.name}` : ''}, ${dateLabel(lib, ga)}${hasTx ? ', transcribed' : ''}` },
        art,
        h(
          'span',
          { class: 'ev-card__meta' },
          h('strong', { class: 'ev-card__ga' }, gaLabel(ga)),
          m?.name ? h('span', { class: 'ev-card__name' }, m.name) : '',
          h('span', { class: 'ev-card__date' }, dateLabel(lib, ga)),
          h('span', { class: 'ev-card__tags' }, m ? CAT_ONE[m.cat] : '', core.has(ga) ? ' · NA28' : '', level === 'c' ? ' · by contents' : '', hasTx ? ' · transcribed' : ''),
        ),
      );
      btn.addEventListener('click', async () => {
        const { openWitness } = await import('./witness');
        openWitness({ ga, pageId: tx[ga] ?? r[1], book: b, pos: { ...pos, verse: v }, lib, app: app[key] ?? [] });
      });
      const li = h('li', { class: `ev-card${level === 'c' ? ' is-catalogue' : ''}`, 'data-ga': ga }, btn);
      return li;
    }

    function fill() {
      let rs = rows;
      if (prefs.mode === 'core') rs = rs.filter((r) => core.has(r[0]));
      const c0 = (ga: string) => lib.byGa.get(ga)?.c0 ?? 99;
      rs = [...rs].sort((a, b2) =>
        prefs.sort === 'ga' ? byGa(a[0], b2[0]) : prefs.sort === 'tx' ? Number(!!tx[b2[0]]) - Number(!!tx[a[0]]) || c0(a[0]) - c0(b2[0]) || byGa(a[0], b2[0]) : c0(a[0]) - c0(b2[0]) || (catOrder[lib.byGa.get(a[0])?.cat ?? 'm'] - catOrder[lib.byGa.get(b2[0])?.cat ?? 'm']) || byGa(a[0], b2[0]),
      );
      current = rs;
      shown = 0;
      clear(list);
      countEl.textContent = prefs.mode === 'core' ? `${n(rs.length)} of the NA28’s consistently cited witnesses` : `${n(rs.length)} manuscript${rs.length === 1 ? '' : 's'}`;
      page();
    }
    function page() {
      const next = current.slice(shown, shown + PAGE);
      for (const r of next) {
        const c = card(r);
        list.appendChild(c);
        if (tx[r[0]]) io.observe(c);
      }
      shown += next.length;
      more.hidden = shown >= current.length;
      more.textContent = `Show ${n(Math.min(PAGE, current.length - shown))} more of ${n(current.length - shown)}`;
    }
    more.addEventListener('click', page);
    modeAll.addEventListener('click', () => setMode('all'));
    modeCore.addEventListener('click', () => setMode('core'));
    function setMode(m: Mode) {
      prefs.mode = m;
      modeAll.setAttribute('aria-pressed', String(m === 'all'));
      modeCore.setAttribute('aria-pressed', String(m === 'core'));
      savePrefs(prefs);
      fill();
    }
    sortSel.addEventListener('change', () => {
      prefs.sort = sortSel.value as Sort;
      savePrefs(prefs);
      fill();
    });

    const coverage =
      rows.length === 0
        ? 'None of the 446 manuscripts indexed so far is recorded as carrying this verse; later minuscules not yet indexed may.'
        : catLevel === 0
          ? `Each is located on a specific page in the INTF’s page index. So far the index here covers 446 manuscripts, nearly all the papyri and majuscules but few of the later minuscules, so the full number of copies is higher.`
          : pageLevel === 0
            ? `Counted from the catalogue’s record of what each manuscript contains, not located page by page, so treat the number as an upper bound.`
            : `${n(pageLevel)} are located on a specific page in the INTF’s index; ${n(catLevel)} more are counted from the catalogue’s record of their contents.`;

    const transcribed = Object.keys(tx).length;
    const head = h(
      'header',
      { class: 'ev-head' },
      h('p', { class: 'ev-ref' }, refLabel({ ...pos, verse: v })),
      h('h2', { class: 'ev-title', id: 'ev-title' }, rows.length ? `Carried by ${n(rows.length)} manuscript${rows.length === 1 ? '' : 's'}` : 'No witnesses indexed'),
      oldest.length
        ? h(
            'p',
            { class: 'ev-oldest' },
            'Oldest: ',
            oldest.slice(0, 4).map((ga, i) => [i ? ', ' : '', h('a', { href: href(`/library#ms=${encodeURIComponent(ga)}`), 'data-link': true }, gaLabel(ga))]),
            oldest.length > 4 ? ` and ${oldest.length - 4} more` : '',
            ` (${dateLabel(lib, oldest[0])})`,
          )
        : '',
      h('p', { class: 'ev-cov' }, coverage, transcribed ? ` ${n(transcribed)} ${transcribed === 1 ? 'has' : 'have'} a transcription of this verse.` : ''),
    );
    const variants = app[key]?.length
      ? h(
          'section',
          { class: 'ev-var', 'aria-labelledby': 'ev-var-h' },
          h('h3', { id: 'ev-var-h' }, 'Where the editions differ'),
          app[key].map((e) =>
            h(
              'div',
              { class: 'ev-var__entry' },
              h('p', { class: 'ev-var__lemma greek', lang: 'grc' }, e.lemma),
              h(
                'ul',
                null,
                e.readings.map((r) => h('li', null, h('span', { class: 'greek', lang: 'grc' }, r.text || '(omitted)'), ' ', h('span', { class: 'ev-var__eds' }, r.eds.join(' ')))),
              ),
            ),
          ),
          h('p', { class: 'ev-note' }, 'From the SBLGNT apparatus (CC BY 4.0): WH Westcott–Hort, Treg Tregelles, NIV the NIV’s Greek text, RP Robinson–Pierpont.'),
        )
      : h('p', { class: 'ev-note' }, 'The SBLGNT apparatus records no difference among its editions here.');

    const closeBtn = h('button', { type: 'button', class: 'ev-close', 'aria-label': 'Close the evidence panel' }, '×');
    closeBtn.addEventListener('click', () => {
      close();
      onClosed?.();
    });
    const el = h(
      'aside',
      { class: 'ev', 'aria-labelledby': 'ev-title', tabindex: '-1' },
      h('div', { class: 'ev-grab', 'aria-hidden': 'true' }),
      closeBtn,
      head,
      rows.length ? h('div', { class: 'ev-controls' }, h('div', { class: 'ev-segs', role: 'group', 'aria-label': 'Which witnesses' }, modeAll, modeCore), sortSel, countEl) : '',
      list,
      more,
      variants,
      h('p', { class: 'ev-notice' }, NTVMR_NOTICE, ' ', h('a', { href: href('/about#evidence'), 'data-link': true }, 'Sources and terms')),
    );
    if (rows.length) fill();
    mount(el);
    el.dataset.ms = String(Math.round(performance.now() - t0));
    void s;
  }

  function mount(el: HTMLElement) {
    sheet?.remove();
    sheet = el;
    document.body.appendChild(el);
    document.body.classList.add('ev-open');
  }

  let onClosed: (() => void) | null = null;

  return {
    hint: 'Tap any verse to see the manuscripts that carry it.',
    async shade(b: Book, c: number, verses: number) {
      if (b.testament === 'OT') {
        const { shadeOt } = await import('./ot');
        return shadeOt(b, c, verses);
      }
      const sum = await loadSummary(b.id);
      const ch = sum?.chapters[c - 1] ?? [];
      return Array.from({ length: verses }, (_, i) => {
        const s = ch[i];
        return s ? shadeFor(s[2] != null ? Math.ceil(s[2] / 100) : null, s[0]) : null;
      });
    },
    open: (pos) => open(pos),
    close,
    set onClose(f: (() => void) | null) {
      onClosed = f;
    },
  } as EvidenceLayer;
}
