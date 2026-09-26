// Deep-zoom viewer. OpenSeadragon is imported only when a manuscript with an
// image source is opened; tiles stream from the holding institution's IIIF
// Image API (or, for Commons images, the full file is opened as a single image).
import { h } from '../lib/dom';
import { commonsFileUrl, type ImageSource } from './data';
import { findFolio, firstPage, manifestCanvases, type Canvas } from './iiif';

export interface ViewerApi {
  el: HTMLElement;
  destroy(): void;
}

export interface ViewerOpts {
  /** 0-based canvas index to open (e.g. from the URL); otherwise firstPage(). */
  page?: number | null;
  onPage?: (index: number, label: string) => void;
  /** Open the canvas labelled with this folio ("12r"), if the manifest has one. */
  folio?: string;
  /** Called once the manifest is read: whether the folio was found. */
  onFolio?: (found: boolean, label: string | null) => void;
  /** Outlines to draw on the opened page (fractions of the image), only where recorded. */
  overlay?: { boxes: { x: number; y: number; w: number; h: number; kind: string }[] };
}

export function Viewer(src: ImageSource, label: string, opts: ViewerOpts = {}): ViewerApi {
  const stage = h('div', { class: 'osd', role: 'img', 'aria-label': `Zoomable image: ${label}` });
  const status = h('p', { class: 'osd__status' }, 'Loading the image from the holding library…');
  const btn = (text: string, title: string) => h('button', { type: 'button', class: 'osd__btn', title, 'aria-label': title }, text);
  const zin = btn('+', 'Zoom in');
  const zout = btn('−', 'Zoom out');
  const home = btn('⟲', 'Fit to view');
  const full = btn('⤢', 'Full screen');
  const prev = btn('‹', 'Previous page');
  const next = btn('›', 'Next page');
  const pageInput = h('input', { type: 'number', class: 'osd__page', min: 1, value: 1, 'aria-label': 'Page number' });
  const pageTotal = h('span', { class: 'osd__total' });
  const pageLabel = h('span', { class: 'osd__label' });
  const pager = h('div', { class: 'osd__pager', hidden: true }, prev, pageInput, pageTotal, next, pageLabel);
  const el = h('div', { class: 'osd-wrap' }, stage, h('div', { class: 'osd__bar' }, zin, zout, home, full), pager, status);
  let viewer: { destroy(): void; open(t: unknown): void } | null = null;
  let dead = false;
  let canvases: Canvas[] = [];
  let index = 0;

  const tileFor = (c: Canvas) => (c.service ? `${c.service.replace(/\/$/, '')}/info.json` : { type: 'image', url: c.image, buildPyramid: false });

  function show(i: number) {
    if (!viewer || !canvases.length) return;
    index = Math.max(0, Math.min(canvases.length - 1, i));
    pageInput.value = String(index + 1);
    pageLabel.textContent = canvases[index].label ? `· ${canvases[index].label}` : '';
    prev.disabled = index === 0;
    next.disabled = index === canvases.length - 1;
    viewer.open(tileFor(canvases[index]));
    opts.onPage?.(index, canvases[index].label);
  }
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  pageInput.addEventListener('change', () => show(Number(pageInput.value) - 1));

  const manifestP: Promise<Canvas[]> =
    src.kind === 'iiif' && src.manifest
      ? fetch(src.manifest)
          .then((r) => (r.ok ? r.json() : null))
          .then((m) => (m ? manifestCanvases(m) : []))
          .catch(() => [])
      : Promise.resolve([]);

  Promise.all([import('openseadragon'), manifestP]).then(([{ default: OSD }, cs]) => {
    if (dead) return;
    canvases = cs.filter((c) => c.service || c.image);
    if (opts.folio && canvases.length) {
      const fi = findFolio(canvases, opts.folio);
      if (fi >= 0) opts.page = fi;
      opts.onFolio?.(fi >= 0, fi >= 0 ? canvases[fi].label : null);
    } else if (opts.folio) opts.onFolio?.(false, null);
    const initialIndex = canvases.length ? (opts.page != null && opts.page < canvases.length ? opts.page : firstPage(canvases)) : 0;
    const initial = canvases.length
      ? tileFor(canvases[(index = initialIndex)])
      : src.kind === 'iiif' && src.service
        ? `${src.service.replace(/\/$/, '')}/info.json`
        : { type: 'image', url: commonsFileUrl(src.file ?? ''), buildPyramid: false };
    const v = OSD({
      element: stage,
      tileSources: initial as string,
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      // Canvas drawing without a CORS requirement: not every image server sends CORS headers.
      drawer: 'canvas',
      crossOriginPolicy: false,
      animationTime: 0.6,
      visibilityRatio: 0.6,
      gestureSettingsMouse: { clickToZoom: false, scrollToZoom: true },
      maxZoomPixelRatio: 2.5,
    });
    viewer = v as unknown as { destroy(): void; open(t: unknown): void };
    v.addHandler('open', () => {
      status.remove();
      // Draw recorded outlines only on the page they were recorded for.
      if (opts.overlay && index === initialIndex) {
        const item = v.world.getItemAt(0);
        const size = item?.getContentSize();
        if (item && size) {
          const ar = size.y / size.x;
          for (const b of opts.overlay.boxes) {
            v.addOverlay({ element: h('div', { class: `osd__box osd__box--${b.kind}` }), location: new OSD.Rect(b.x, b.y * ar, b.w, b.h * ar) });
          }
        }
      }
    });
    v.addHandler('open-failed', () => {
      status.textContent = 'The holding library did not serve this image just now. Use the links below to view it at the source.';
      status.classList.add('is-error');
      if (!status.isConnected) el.appendChild(status);
    });
    zin.addEventListener('click', () => v.viewport.zoomBy(1.5));
    zout.addEventListener('click', () => v.viewport.zoomBy(1 / 1.5));
    home.addEventListener('click', () => v.viewport.goHome());
    full.addEventListener('click', () => v.setFullScreen(!v.isFullPage()));
    if (canvases.length > 1) {
      pager.hidden = false;
      pageInput.max = String(canvases.length);
      pageTotal.textContent = `of ${canvases.length}`;
      pageInput.value = String(index + 1);
      pageLabel.textContent = canvases[index].label ? `· ${canvases[index].label}` : '';
      prev.disabled = index === 0;
      next.disabled = index === canvases.length - 1;
    }
  });

  return {
    el,
    destroy() {
      dead = true;
      viewer?.destroy();
    },
  };
}
