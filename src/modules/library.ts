import { h } from '../lib/dom';
import { ModuleHeader } from '../components';
export function render(root: HTMLElement) {
  root.append(ModuleHeader('Library', 'The Library', 'Every catalogued Greek New Testament manuscript. The catalogue is being assembled.'), h('p', { class: 'muted' }, 'Coming shortly.'));
}
