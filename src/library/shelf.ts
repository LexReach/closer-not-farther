// Featured shelf excerpt (placeholder until the Library data lands).
import { h } from '../lib/dom';
import type { ExcerptApi, MountOpts } from '../chapters';

export async function mountShelfExcerpt(el: HTMLElement, _opts: MountOpts = {}): Promise<ExcerptApi> {
  el.appendChild(h('p', { class: 'muted' }, 'The Library is loading its catalogue.'));
  return { play() {}, pause() {}, destroy() {} };
}
