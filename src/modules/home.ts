// Home: the argument as a scroll-driven narrative. An opening frame with a
// live miniature of Module 1, the film, one chapter per module with a live
// excerpt of its real component, and a closing frame that ends on the
// skeptics and the sources.
import { h } from '../lib/dom';
import { href } from '../lib/nav';
import { Hero } from '../home/hero';
import { CHAPTERS, type ExcerptApi } from '../chapters';
import { skeptics, skepticsFor, type ModuleKey } from '../data';
import { sourceText as linkify } from '../components';

const MODULE_TITLE: Record<string, string> = {
  telephone: 'Telephone vs. Tree',
  timeline: 'Closer, Not Farther',
  p66: 'Read P66 yourself',
  variants: 'The 110% puzzle',
  names: 'Names as fingerprints',
  coincidences: 'Undesigned coincidences',
};

function filmSection(): { el: HTMLElement; destroy(): void } {
  const base = import.meta.env.BASE_URL;
  const video = h('video', {
    class: 'film__video',
    controls: true,
    preload: 'none',
    playsinline: true,
    poster: `${base}film/poster.jpg`,
    'aria-label': 'The 3-minute version: a guided run through all seven chapters, with captions.',
  });
  const tourBtn = h('button', { class: 'btn btn--primary', type: 'button' }, 'Play the argument live');
  tourBtn.addEventListener('click', async () => {
    const { startTour } = await import('../tour/tour');
    startTour();
  });
  const el = h(
    'section',
    { class: 'film', id: 'film', 'aria-labelledby': 'film-h' },
    h('h2', { id: 'film-h', class: 'film__h' }, 'Watch the 3-minute version'),
    h('p', { class: 'film__lede' }, 'A recorded walk through every chapter, with captions. Or let the site drive itself: the live tour moves the real controls in your browser.'),
    h('div', { class: 'film__frame' }, video),
    h('p', { class: 'film__note' }, 'Recorded before the Reader was added, so the navigation in the film differs from the site’s.'),
    h('div', { class: 'btn-row film__actions' }, tourBtn, h('a', { class: 'btn', href: `${base}film/teaser.mp4`, download: 'closer-not-farther-teaser.mp4' }, 'Download the 20-second teaser')),
  );
  // Only load the film when the reader gets near it.
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      video.appendChild(h('source', { src: `${base}film/closer-not-farther.mp4`, type: 'video/mp4' }));
      video.appendChild(h('source', { src: `${base}film/closer-not-farther.webm`, type: 'video/webm' }));
      video.load();
    },
    { rootMargin: '400px 0px' },
  );
  io.observe(el);
  return { el, destroy: () => io.disconnect() };
}

export function render(root: HTMLElement) {
  const hero = Hero();
  const film = filmSection();
  const excerpts = new Map<Element, { api?: ExcerptApi; loading?: boolean; visible?: boolean }>();

  const chapterEls = CHAPTERS.map((c) => {
    const stage = h('div', { class: 'chapter__stage', 'data-chapter': c.id });
    excerpts.set(stage, {});
    return h(
      'section',
      { class: 'chapter', id: `ch-${c.id}`, 'aria-labelledby': `ch-${c.id}-h` },
      h(
        'header',
        { class: 'chapter__head' },
        h('p', { class: 'chapter__num num' }, c.num === '7' ? 'Coda' : `Chapter ${c.num}`),
        h('h2', { id: `ch-${c.id}-h`, class: 'chapter__title' }, c.title),
        h('p', { class: 'chapter__lead' }, c.lead),
      ),
      stage,
      h('p', { class: 'chapter__close' }, c.sentence, ' ', h('a', { href: href(c.path), 'data-link': true, class: 'chapter__link' }, c.id === 'library' ? 'Open the Library →' : 'Open the full module →')),
    );
  });

  const closing = h(
    'section',
    { class: 'closing', 'aria-labelledby': 'closing-h' },
    h('p', { class: 'chapter__num' }, 'The honest part'),
    h('h2', { id: 'closing-h', class: 'chapter__title' }, 'What skeptics say'),
    h('p', { class: 'chapter__lead' }, skeptics.framing.text),
    (Object.keys(skeptics.modules) as ModuleKey[]).map((key) => {
      const m = skepticsFor(key);
      return h(
        'div',
        { class: 'closing__group' },
        h('h3', null, MODULE_TITLE[key]),
        h('ul', null, m.points.map((p) => h('li', null, p.text, h('cite', { class: 'sk__src' }, p.source ?? '')))),
      );
    }),
    h('p', null, 'Each point, with the replies defenders give, is on the ', h('a', { href: href('/about'), 'data-link': true }, 'About page'), '.'),
    h('h2', { class: 'chapter__title closing__sources-h' }, 'Sources'),
    h(
      'ul',
      { class: 'closing__sources' },
      Object.values(skeptics.bibliography as Record<string, string>)
        .sort((a, b) => a.replace(/^['‘]/, '').localeCompare(b.replace(/^['‘]/, '')))
        .map((x) => h('li', null, linkify(x))),
    ),
  );

  const explore = h('a', { class: 'btn btn--primary hero__btn', href: '#ch-telephone' }, 'Explore');
  explore.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('ch-telephone')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  root.classList.add('page--home');
  root.append(
    h(
      'section',
      { class: 'hero', 'aria-labelledby': 'hero-h' },
      h(
        'div',
        { class: 'hero__text' },
        h('h1', { id: 'hero-h', class: 'hero__title' }, 'As time goes on, we’re not getting farther from the text. We’re getting closer.'),
        h('p', { class: 'hero__line' }, 'Watch one text copied two ways: down a single chain, and across a branching tree. Then see what survives, and what can be recovered.'),
        h('div', { class: 'btn-row hero__actions' }, explore, h('a', { class: 'btn hero__btn', href: href('/present'), 'data-link': true }, 'Present'), h('a', { class: 'btn hero__btn', href: href('/read'), 'data-link': true }, 'Read the text')),
      ),
      hero.el,
      h('p', { class: 'hero__cue', 'aria-hidden': 'true' }, 'Scroll'),
    ),
    film.el,
    h('div', { class: 'chapters', id: 'chapters' }, chapterEls),
    closing,
  );

  // Mount each excerpt as it approaches; play while at least a third is visible.
  const mountIo = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const st = excerpts.get(e.target);
        if (!st || !e.isIntersecting || st.api || st.loading) continue;
        st.loading = true;
        const c = CHAPTERS.find((x) => x.id === (e.target as HTMLElement).dataset.chapter)!;
        c.mount(e.target as HTMLElement).then((api) => {
          st.api = api;
          if (st.visible) api.play();
        });
      }
    },
    { rootMargin: '600px 0px' },
  );
  const playIo = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const st = excerpts.get(e.target);
        if (!st) continue;
        st.visible = e.isIntersecting;
        if (!st.api) continue;
        if (e.isIntersecting) st.api.play();
        else st.api.pause();
      }
    },
    { threshold: 0.33 },
  );
  for (const el of excerpts.keys()) {
    mountIo.observe(el);
    playIo.observe(el);
  }

  if (location.hash === '#film') requestAnimationFrame(() => document.getElementById('film')?.scrollIntoView());

  return () => {
    hero.destroy();
    film.destroy();
    mountIo.disconnect();
    playIo.disconnect();
    for (const st of excerpts.values()) st.api?.destroy();
    root.classList.remove('page--home');
  };
}
