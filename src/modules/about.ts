// About: method, sources, limits, credits, and every skeptic point in one place.
import { h } from '../lib/dom';
import { ModuleHeader, sourceText as linkify } from '../components';
import { skeptics, skepticsFor, sourceText, type ModuleKey } from '../data';
import { routes } from '../routes';
import { href } from '../lib/nav';
import names from '../../data/names.json';
import mss from '../../data/manuscripts.json';
import comparison from '../../data/comparison.json';
import variants from '../../data/variants.json';
import coincidences from '../../data/coincidences.json';
import p66 from '../../data/p66.json';

// The reference works the spec asks the UI to cite (SPEC.md section 4).
const CORE_SOURCES = [
  'Tal Ilan, Lexicon of Jewish Names in Late Antiquity, Part I: Palestine 330 BCE–200 CE (2002)',
  'Richard Bauckham, Jesus and the Eyewitnesses, 2nd ed. (2017), ch. 4 tables',
  'INTF Kurzgefasste Liste, https://ntvmr.uni-muenster.de/liste',
  'Clay Jones, "The Bibliographical Test Updated," Christian Research Journal 35:3 (2012)',
  'Daniel Wallace on variant categories (CSNTM)',
  'Lydia McGrew, Hidden in Plain View (2017)',
  'Bodmer Library / Wikimedia Commons for P66 imagery and license',
  'Counterpoints: Bart Ehrman, Misquoting Jesus (2005); "Name Recall in the Synoptic Gospels," New Testament Studies (2022)',
];

const DATASETS: { file: string; module: string; sources: string[] }[] = [
  { file: 'data/source-text.json', module: 'Telephone vs. Tree', sources: sourceText.sources },
  { file: 'data/manuscripts.json', module: 'Closer, Not Farther', sources: mss.sources },
  { file: 'data/comparison.json', module: 'Closer, Not Farther', sources: comparison.sources },
  { file: 'data/p66.json', module: 'Read P66 yourself', sources: p66.sources.filter((x: string) => !x.startsWith('General scholarly')) },
  { file: 'data/variants.json', module: 'The 110% puzzle', sources: variants.sources },
  { file: 'data/names.json', module: 'Names as fingerprints', sources: names.sources },
  { file: 'data/coincidences.json', module: 'Undesigned coincidences', sources: [...coincidences.sources, coincidences.translation, ...coincidences.map_geo.sources] },
  { file: 'data/skeptics.json', module: 'All modules', sources: skeptics.sources },
];

const MODULE_TITLE: Record<string, string> = {
  telephone: 'Telephone vs. Tree',
  timeline: 'Closer, Not Farther',
  p66: 'Read P66 yourself',
  variants: 'The 110% puzzle',
  names: 'Names as fingerprints',
  coincidences: 'Undesigned coincidences',
};

export function render(root: HTMLElement) {
  const pathFor = (key: string) => routes.find((r) => r.title === MODULE_TITLE[key])?.path ?? '/';
  root.append(
    ModuleHeader('About', 'Method, sources and limits', 'What this site does, where every number comes from, and what it does not claim.'),
    h(
      'section',
      { class: 'about-sec' },
      h('h2', null, 'Method'),
      h(
        'p',
        null,
        'Every figure on screen is read from a JSON file in the repository’s ',
        h('code', null, 'data/'),
        ' folder, and every file lists its sources. Percentages, shares and gaps are computed from those files when the page loads, not typed into the pages. Where a value could not be checked against its printed source during the build, the file marks it ',
        h('code', null, 'verify: true'),
        ' and the page says so.',
      ),
      h(
        'p',
        null,
        'The transmission simulator is a teaching model: seeded random copying errors, random loss, and a word-by-word majority vote. Real textual criticism weighs witnesses by age, family and coherence rather than counting them. The P66 page draws a facsimile with approximate line breaks because the photograph and a published line-by-line transcription could not be retrieved while the site was built.',
      ),
    ),
    h(
      'section',
      { class: 'about-sec' },
      h('h2', null, 'What this site does not claim'),
      h(
        'ul',
        null,
        h('li', null, 'That the manuscripts prove the New Testament’s content is true. The subject here is transmission: whether we can know what the authors wrote.'),
        h('li', null, 'That there are no significant variants. A handful matter, and they are shown.'),
        h('li', null, 'That the name statistics show eyewitness authorship. They point to a first-century Palestinian origin for the traditions.'),
        h('li', null, 'That counts of manuscripts for other ancient authors are settled. They are older tallies and shift with new catalogues.'),
        h('li', null, 'That any single undesigned coincidence is decisive. The argument is cumulative.'),
      ),
    ),
    h(
      'section',
      { class: 'about-sec' },
      h('h2', null, 'What skeptics say, all in one place'),
      h('aside', { class: 'sk__framing' }, h('p', { class: 'sk__label' }, skeptics.framing.title), h('p', null, skeptics.framing.text)),
      (Object.keys(skeptics.modules) as ModuleKey[]).map((key) => {
        const m = skepticsFor(key);
        return h(
          'div',
          { class: 'about-sk' },
          h('h3', null, h('a', { href: href(pathFor(key)), 'data-link': true }, MODULE_TITLE[key] ?? key)),
          h('p', { class: 'muted' }, m.intro),
          h(
            'ol',
            { class: 'disclosure__list' },
            m.points.map((p) =>
              h(
                'li',
                { class: 'sk' },
                h('p', { class: 'sk__claim' }, p.text, h('cite', { class: 'sk__src' }, p.source ?? '')),
                h('p', { class: 'sk__reply' }, h('span', { class: 'sk__label' }, 'Defenders reply'), p.reply ?? '', h('cite', { class: 'sk__src' }, p.replySource ?? '')),
              ),
            ),
          ),
        );
      }),
    ),
    h(
      'section',
      { class: 'about-sec' },
      h('h2', null, 'Bibliography'),
      h('p', { class: 'muted' }, 'Every counterpoint and reply above cites one of these works.'),
      h(
        'ul',
        { class: 'about-bib' },
        Object.values(skeptics.bibliography as Record<string, string>)
          .sort((a, b) => a.replace(/^['‘]/, '').localeCompare(b.replace(/^['‘]/, '')))
          .map((x) => h('li', null, linkify(x))),
      ),
    ),
    h(
      'section',
      { class: 'about-sec' },
      h('h2', null, 'Core references'),
      h('ul', { class: 'about-src' }, CORE_SOURCES.map((x) => h('li', null, linkify(x)))),
      h('h2', null, 'Sources by dataset'),
      DATASETS.map((d) =>
        h(
          'div',
          { class: 'about-ds' },
          h('h3', null, h('code', null, d.file), h('span', { class: 'muted' }, ` · ${d.module}`)),
          h('ul', { class: 'about-src' }, d.sources.map((x) => h('li', null, linkify(x)))),
        ),
      ),
    ),
    h(
      'section',
      { class: 'about-sec' },
      h('h2', null, 'Credits'),
      h(
        'p',
        null,
        'The argument follows Wesley Huff’s talk (',
        h('a', { href: 'https://www.youtube.com/watch?v=qYsBvzmdxQY', target: '_blank', rel: 'noopener' }, 'YouTube'),
        '). Greek text of John 1:1–5 from the SBL Greek New Testament (CC BY 4.0). Verse quotations from the World English Bible (public domain). Typefaces: Fraunces, Source Serif 4, IBM Plex Sans and Noto Serif (SIL Open Font License). Charts drawn with D3. No tracking, no cookies, no accounts.',
      ),
    ),
  );
}
