// Present mode: full screen, dark, huge type, keyboard-driven. Steps through
// the same chapters as the home page with the live components at stage scale.
// → / PageDown next · ← / PageUp back · Space play/pause · F full screen ·
// ? keys · Esc exit. Deep links: /present#names.
import '../styles/present.css';
import { h, clear } from '../lib/dom';
import { href } from '../lib/nav';
import { CHAPTERS, mountNames, type Chapter, type ExcerptApi, type MountOpts } from '../chapters';

interface Slide {
  id: string;
  kicker: string;
  title: string;
  sentence: string;
  mount?: (el: HTMLElement, opts: MountOpts) => Promise<ExcerptApi>;
}

function buildSlides(): Slide[] {
  const out: Slide[] = [
    {
      id: 'title',
      kicker: 'Closer, Not Farther',
      title: 'As time goes on, we’re not getting farther from the text. We’re getting closer.',
      sentence: 'Seven pieces of evidence, each one live.',
    },
  ];
  for (const c of CHAPTERS as Chapter[]) {
    if (c.id === 'names') {
      out.push({ id: 'names', kicker: `Chapter ${c.num}`, title: c.title, sentence: 'The Gospels’ most common names are the population’s most common names.', mount: (el, o) => mountNames(el, { ...o, part: 'chart' }) });
      out.push({ id: 'twelve', kicker: `Chapter ${c.num}`, title: 'The Twelve', sentence: 'Common names get a second name; rare names don’t.', mount: (el, o) => mountNames(el, { ...o, part: 'twelve' }) });
      continue;
    }
    out.push({ id: c.id, kicker: c.num === '7' ? 'Coda' : `Chapter ${c.num}`, title: c.title, sentence: c.sentence, mount: c.mount });
  }
  out.push({
    id: 'end',
    kicker: 'And the honest part',
    title: 'Every chart has a “What skeptics say.”',
    sentence: 'The site ends on the objections and the sources, because that is what makes the rest evidence.',
  });
  return out;
}

export function render(root: HTMLElement) {
  const slides = buildSlides();
  let idx = Math.max(0, slides.findIndex((s) => s.id === location.hash.slice(1)));
  let api: ExcerptApi | null = null;
  let playing = true;
  let token = 0;

  const stage = h('div', { class: 'pr-stage' });
  const status = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const rail = h(
    'nav',
    { class: 'pr-rail', 'aria-label': 'Slides' },
    slides.map((s, i) => {
      const b = h('button', { type: 'button', class: 'pr-rail__seg', 'aria-label': `Slide ${i + 1}: ${s.title}` }, h('span', { class: 'pr-rail__label' }, s.title));
      b.addEventListener('click', () => go(i));
      return b;
    }),
  );
  const pauseBadge = h('div', { class: 'pr-paused', 'aria-hidden': 'true' }, 'Paused');
  const help = h(
    'div',
    { class: 'pr-help', role: 'dialog', 'aria-label': 'Keyboard shortcuts', hidden: true },
    h('h2', null, 'Keys'),
    h(
      'dl',
      null,
      [
        ['→  or  PageDown', 'Next slide'],
        ['←  or  PageUp', 'Previous slide'],
        ['Space', 'Play or pause the live chart'],
        ['F', 'Full screen'],
        ['Home / End', 'First / last slide'],
        ['?', 'Show or hide this list'],
        ['Esc', 'Leave present mode'],
      ].map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v))),
    ),
  );
  const exit = h('a', { class: 'pr-exit', href: href('/why'), 'data-link': true }, 'Exit');
  const keysBtn = h('button', { class: 'pr-keys', type: 'button', 'aria-label': 'Show keyboard shortcuts' }, '?');
  keysBtn.addEventListener('click', () => toggleHelp());
  const shell = h('div', { class: 'pr', tabindex: '-1' }, stage, rail, pauseBadge, help, exit, keysBtn, status);
  root.classList.add('page--present');
  root.appendChild(shell);

  async function show(i: number) {
    const my = ++token;
    api?.destroy();
    api = null;
    clear(stage);
    const s = slides[i];
    const excerpt = h('div', { class: 'pr-excerpt' });
    const slide = h(
      'section',
      { class: `pr-slide pr-slide--${s.id} ${s.mount ? '' : 'pr-slide--text'}`, 'aria-roledescription': 'slide', 'aria-label': `${i + 1} of ${slides.length}: ${s.title}` },
      h('header', { class: 'pr-head' }, h('p', { class: 'pr-kicker' }, s.kicker), h('h1', { class: 'pr-title' }, s.title), h('p', { class: 'pr-sentence' }, s.sentence)),
      s.mount ? excerpt : '',
    );
    stage.appendChild(slide);
    rail.querySelectorAll('.pr-rail__seg').forEach((b, j) => {
      b.classList.toggle('is-done', j < i);
      b.classList.toggle('is-current', j === i);
      if (j === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    status.textContent = `Slide ${i + 1} of ${slides.length}: ${s.title}`;
    history.replaceState(history.state, '', `${location.pathname}#${s.id}`);
    if (s.mount) {
      const a = await s.mount(excerpt, { big: true });
      if (my !== token) return a.destroy();
      api = a;
      if (playing) a.play();
    }
  }

  function go(i: number) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    show(idx);
  }

  function toggleHelp(force?: boolean) {
    help.hidden = force === undefined ? !help.hidden : !force;
  }

  function togglePlay() {
    playing = !playing;
    shell.classList.toggle('is-paused', !playing);
    if (playing) api?.play();
    else api?.pause();
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') go(idx + 1);
    else if (k === 'ArrowLeft' || k === 'PageUp') go(idx - 1);
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === ' ') togglePlay();
    else if (k === '?' || (k === '/' && e.shiftKey)) toggleHelp();
    else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (k === 'Escape') {
      if (!help.hidden) toggleHelp(false);
      else if (!document.fullscreenElement) exit.click();
      else return;
    } else return;
    e.preventDefault();
  };
  const onHash = () => {
    const j = slides.findIndex((s) => s.id === location.hash.slice(1));
    if (j >= 0 && j !== idx) go(j);
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHash);
  show(idx);
  shell.focus({ preventScroll: true });

  return () => {
    token++;
    api?.destroy();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', onHash);
    root.classList.remove('page--present');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
}
