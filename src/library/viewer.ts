// Deep-zoom viewer. OpenSeadragon is imported only when a manuscript with an
// image source is opened; tiles stream from the holding institution's IIIF
// Image API (or, for Commons images, the full file is opened as a single image).
import { h } from '../lib/dom';
import { commonsFileUrl, type ImageSource } from './data';

export interface ViewerApi {
  el: HTMLElement;
  destroy(): void;
}

export function Viewer(src: ImageSource, label: string): ViewerApi {
  const stage = h('div', { class: 'osd', role: 'img', 'aria-label': `Zoomable image: ${label}` });
  const status = h('p', { class: 'osd__status' }, 'Loading the image from the holding library…');
  const btn = (text: string, title: string) => h('button', { type: 'button', class: 'osd__btn', title, 'aria-label': title }, text);
  const zin = btn('+', 'Zoom in');
  const zout = btn('−', 'Zoom out');
  const home = btn('⟲', 'Fit to view');
  const full = btn('⤢', 'Full screen');
  const el = h('div', { class: 'osd-wrap' }, stage, h('div', { class: 'osd__bar' }, zin, zout, home, full), status);
  let viewer: { destroy(): void } | null = null;
  let dead = false;

  import('openseadragon').then(({ default: OSD }) => {
    if (dead) return;
    const tileSources =
      src.kind === 'iiif' && src.service
        ? `${src.service.replace(/\/$/, '')}/info.json`
        : { type: 'image', url: commonsFileUrl(src.file ?? ''), buildPyramid: false };
    const v = OSD({
      element: stage,
      tileSources: tileSources as string,
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      crossOriginPolicy: 'Anonymous',
      animationTime: 0.6,
      visibilityRatio: 0.6,
      gestureSettingsMouse: { clickToZoom: false, scrollToZoom: true },
      maxZoomPixelRatio: 2.5,
    });
    viewer = v;
    v.addHandler('open', () => status.remove());
    v.addHandler('open-failed', () => {
      status.textContent = 'The holding library did not serve this image just now. Use the links above to view it at the source.';
      status.classList.add('is-error');
    });
    zin.addEventListener('click', () => v.viewport.zoomBy(1.5));
    zout.addEventListener('click', () => v.viewport.zoomBy(1 / 1.5));
    home.addEventListener('click', () => v.viewport.goHome());
    full.addEventListener('click', () => v.setFullScreen(!v.isFullPage()));
  });

  return {
    el,
    destroy() {
      dead = true;
      viewer?.destroy();
    },
  };
}
