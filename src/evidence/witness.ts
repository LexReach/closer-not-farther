// Witness view: one manuscript at one verse. The holder's photograph of the
// page (when the page can be matched) beside the transcription, and three
// rows that move together: the verse as this manuscript writes it, the SBLGNT,
// and the Berean Standard Bible. Nothing is drawn on the photograph unless a
// position for it has been recorded.
import { h, clear } from '../lib/dom';
import { href } from '../lib/nav';
import { ADAPTERS, loadOriginal, refLabel, verseId, type Book, type Pos, type Word } from '../reader/bible';
import type { Segment } from '../reader/adapters';
import { openMeaning, closeMeaning } from '../reader/meaning';
import { gaLabel, intfUrl, type LibraryData } from '../library/data';
import { dateLabel } from './panel';
import { loadTx, type AppEntry, type Token } from './data';
import { alignWords, hasCorrections, renderPage, uncial, verseTokens } from './render';
import { overlayFor } from './spotlight';

export interface WitnessOpts {
  ga: string;
  pageId: string | null;
  book: Book;
  pos: Pos;
  lib: LibraryData;
  app: AppEntry[];
}

let dlg: HTMLDialogElement | null = null;

export async function openWitness(o: WitnessOpts) {
  dlg?.close();
  const v = o.pos.verse!;
  const vid = verseId(o.book.id, o.pos.chapter, v);
  const m = o.lib.byGa.get(o.ga);
  const img = o.lib.images[o.ga];
  const [page, words, bsb] = await Promise.all([
    o.pageId ? loadTx(o.ga, o.pageId) : Promise.resolve(null),
    loadOriginal(o.book),
    ADAPTERS.bsb.getChapter(o.book.id, o.pos.chapter).catch(() => null),
  ]);
  const ed: Word[] = words?.[o.pos.chapter - 1]?.[v - 1] ?? [];
  const eng = (bsb?.verses[v - 1] ?? null) as Segment[] | string | null;
  const tokens: Token[] = page ? verseTokens(page, vid) : [];
  const readable = tokens.filter((t) => !t.lac);
  let corrected = false;

  const closeBtn = h('button', { type: 'button', class: 'ev-close', 'aria-label': 'Close the witness view' }, '×');
  const imgBox = h('div', { class: 'wv__img' });
  const pageBox = h('div', { class: 'wv__page' });
  const rows = h('div', { class: 'wv__rows' });
  const corrBtn = page && hasCorrections(page, vid) ? h('button', { type: 'button', class: 'btn wv__corr', 'aria-pressed': 'false' }, 'Show the correction') : null;

  dlg = h(
    'dialog',
    { class: 'wv', 'aria-labelledby': 'wv-h' },
    h(
      'header',
      { class: 'wv__head' },
      h('p', { class: 'ev-ref' }, refLabel(o.pos)),
      h('h2', { id: 'wv-h' }, gaLabel(o.ga), m?.name ? h('span', { class: 'wv__name' }, ` · ${m.name}`) : ''),
      h('p', { class: 'wv__meta' }, [dateLabel(o.lib, o.ga), m?.inst, m?.city].filter(Boolean).join(' · '), page?.folio ? ` · page ${page.folio}` : ''),
      h(
        'p',
        { class: 'wv__links' },
        h('a', { href: href(`/library#ms=${encodeURIComponent(o.ga)}`), 'data-link': true }, 'In the Library'),
        ' · ',
        h('a', { href: intfUrl(o.ga), target: '_blank', rel: 'noopener' }, 'INTF workspace'),
        img?.link ? [' · ', h('a', { href: img.link, target: '_blank', rel: 'noopener' }, img.institution ?? 'Holder')] : '',
      ),
      closeBtn,
    ),
    h('div', { class: 'wv__body' }, imgBox, h('div', { class: 'wv__text' }, pageBox, corrBtn ?? '', rows)),
  ) as HTMLDialogElement;
  document.body.appendChild(dlg);
  let viewerApi: { destroy(): void } | null = null;
  closeBtn.addEventListener('click', () => dlg?.close());
  dlg.addEventListener('close', () => {
    viewerApi?.destroy();
    closeMeaning();
    dlg?.remove();
    dlg = null;
  });
  dlg.showModal();

  /* Photograph */
  if (img) {
    const cap = h('p', { class: 'wv__cap' }, 'Loading the page from the holder…');
    const { Viewer } = await import('../library/viewer');
    const overlay = page ? await overlayFor(o.ga, page.pageId, vid) : null;
    const api = Viewer(img, `${gaLabel(o.ga)}${page?.folio ? `, page ${page.folio}` : ''}`, {
      folio: page?.folio,
      overlay: overlay ?? undefined,
      onFolio: (found, label) => {
        cap.textContent = !page?.folio
          ? 'The transcription does not name its page, so the viewer opens at the first page.'
          : found
            ? `Page ${label}, matched by its folio label. ${overlay ? overlay.caption : 'The verse’s place on the page is not marked: no line positions have been recorded for this page yet.'}`
            : `Page ${page.folio} could not be matched to the holder’s images, so the viewer opens at the first page.`;
      },
    });
    viewerApi = api;
    if (!page?.folio) cap.textContent = img.kind === 'commons' ? 'A single photograph from Wikimedia Commons; it may not show this verse.' : cap.textContent;
    imgBox.append(api.el, cap);
  } else {
    imgBox.append(h('p', { class: 'wv__noimg' }, 'No photograph of this manuscript can be streamed here. ', h('a', { href: intfUrl(o.ga), target: '_blank', rel: 'noopener' }, 'Look for it in the INTF workspace'), '.'));
    imgBox.classList.add('is-empty');
  }

  /* Transcription and rows */
  function drawPage() {
    clear(pageBox);
    if (!page) {
      pageBox.append(h('p', { class: 'wv__noimg' }, 'No transcription of this manuscript is available here, so its wording of the verse cannot be shown.'));
      return;
    }
    pageBox.append(
      h('p', { class: 'wv__label' }, `The page as transcribed${page.folio ? `, ${page.folio}` : ''}`),
      renderPage(page, { verse: vid, papyrus: m?.cat === 'P', corrected }),
      h('p', { class: 'ev-note' }, 'Line breaks and columns follow the transcription; gaps mark text lost from the page. Transcription: INTF / IGNTP.'),
    );
  }
  drawPage();
  corrBtn?.addEventListener('click', () => {
    corrected = !corrected;
    corrBtn.setAttribute('aria-pressed', String(corrected));
    corrBtn.textContent = corrected ? 'Show the first hand' : 'Show the correction';
    drawPage();
    drawRows();
  });

  function drawRows() {
    clear(rows);
    const msWords = readable.map((t) => (corrected && t.corr ? t.corr.t : t.t));
    const pairs = alignWords(
      readable.map((t, i) => t.ns ?? msWords[i]),
      ed.map((w) => w[0]),
    );
    const msToEd = new Map(pairs);
    const edToMs = new Map(pairs.map(([a, b]) => [b, a]));
    const light = (edIdx: number | null, msIdx: number | null) => {
      dlg?.querySelectorAll('.is-link').forEach((x) => x.classList.remove('is-link'));
      if (edIdx == null && msIdx != null) edIdx = msToEd.get(msIdx) ?? null;
      if (msIdx == null && edIdx != null) msIdx = edToMs.get(edIdx) ?? null;
      if (msIdx != null) dlg?.querySelectorAll(`[data-mi="${msIdx}"]`).forEach((x) => x.classList.add('is-link'));
      if (edIdx != null) dlg?.querySelectorAll(`[data-ei="${edIdx}"], [data-egi="${edIdx}"]`).forEach((x) => x.classList.add('is-link'));
    };
    const row = (label: string, cls: string, content: Node | (Node | string)[], lang?: string) =>
      h('div', { class: `wv__row ${cls}` }, h('span', { class: 'wv__rowlabel' }, label), h('p', { class: 'wv__rowtext', lang: lang ?? null }, content));

    const msRow = tokens.length
      ? tokens.map((t) => {
          if (t.lac) return h('span', { class: 'tx__lac tx__lac--inline', 'aria-label': 'lacuna', title: 'Lost from the page' });
          const i = readable.indexOf(t);
          const w = h('button', { type: 'button', class: `wv__w${msToEd.has(i) ? '' : ' is-diff'}`, 'data-mi': String(i), title: t.ns ? `Sacred name, abbreviated: ${t.ns}` : null }, uncial(msWords[i]));
          w.addEventListener('pointerenter', () => light(null, i));
          w.addEventListener('focus', () => light(null, i));
          w.addEventListener('click', () => {
            const e = msToEd.get(i);
            if (e != null) openEd(e, w);
          });
          return w;
        })
      : [h('span', { class: 'muted' }, page ? 'This page’s transcription does not include the verse’s words.' : 'Not transcribed here.')];
    const edRow = ed.map((w, i) => {
      const b = h('button', { type: 'button', class: `wv__w greek${edToMs.has(i) || !tokens.length ? '' : ' is-diff'}`, 'data-ei': String(i) }, w[0]);
      b.addEventListener('pointerenter', () => light(i, null));
      b.addEventListener('focus', () => light(i, null));
      b.addEventListener('click', () => openEd(i, b));
      return b;
    });
    const engRow = Array.isArray(eng)
      ? eng.map(([t, gi]) => {
          const s = h('span', { class: 'wv__e', 'data-egi': gi == null ? null : String(gi) }, t);
          if (gi != null) s.addEventListener('pointerenter', () => light(gi, null));
          return s;
        })
      : [eng ?? ''];
    rows.append(
      row('As written', 'wv__row--ms', msRow),
      row('SBLGNT', 'wv__row--ed', edRow, 'grc'),
      row('BSB', 'wv__row--en', engRow, 'en'),
      tokens.length ? h('p', { class: 'ev-note' }, 'Words the manuscript writes differently from the SBLGNT are underlined. Spelling differences count, so not every underline is a different reading.') : '',
    );
    if (o.app.length)
      rows.append(
        h(
          'details',
          { class: 'wv__app' },
          h('summary', null, `Where the editions differ (${o.app.length})`),
          o.app.map((e) => h('p', null, h('span', { class: 'greek', lang: 'grc' }, e.lemma), ': ', e.readings.map((r, i) => [i ? ' | ' : '', h('span', { class: 'greek', lang: 'grc' }, r.text || '(omitted)'), ' ', h('small', null, r.eds.join(' '))]))),
        ),
      );
  }
  function openEd(i: number, anchor: Element) {
    const w = ed[i];
    if (!w) return;
    openMeaning({ word: w, lang: 'grc', anchor, where: `${refLabel(o.pos)}, word ${i + 1}` });
  }
  drawRows();
}
