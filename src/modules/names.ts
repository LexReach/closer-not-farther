import { h } from '../lib/dom';
export function render(root: HTMLElement) {
  root.append(h('div', { class: 'stub' }, 'Coming next: names'));
}
