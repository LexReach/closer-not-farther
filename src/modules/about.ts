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

const TEXTS: [string, string, string][] = [
  ['Berean Standard Bible (BSB)', 'public domain (dedicated 2023), with its Greek word alignment', 'https://berean.bible'],
  ['World English Bible (WEB)', 'public domain', 'https://worldenglish.bible'],
  ['King James Version (KJV)', 'public domain outside the United Kingdom', 'https://ebible.org/kjv/'],
  ['American Standard Version (ASV)', 'public domain', 'https://ebible.org/asv/'],
  ['SBL Greek New Testament (SBLGNT)', 'CC BY 4.0, Society of Biblical Literature and Logos Bible Software', 'https://github.com/LogosBible/SBLGNT'],
  ['MorphGNT (parsing and lemmas for the SBLGNT)', 'CC BY-SA 3.0', 'https://github.com/morphgnt/sblgnt'],
  ['STEPBible TAGNT and TAHOT (glosses, Strong’s numbers)', 'CC BY 4.0, Tyndale House Cambridge', 'https://github.com/STEPBible/STEPBible-Data'],
  ['Westminster Leningrad Codex with Open Scriptures morphology', 'text public domain, morphology CC BY 4.0', 'https://github.com/openscriptures/morphhb'],
];

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
      { class: 'about-sec', id: 'texts' },
      h('h2', null, 'Bible texts and licences'),
      h('p', null, 'The Reader’s texts are stored in the repository as one file per book and cached on your device after the first visit. Full provenance, with retrieval dates, is in ', h('code', null, 'data/SOURCES.md'), '.'),
      h(
        'ul',
        { class: 'about-src' },
        TEXTS.map(([name, lic, url]) => h('li', null, h('strong', null, name), `: ${lic}. `, h('a', { href: url, target: '_blank', rel: 'noopener' }, url.replace(/^https?:\/\//, '')))),
      ),
      h('p', null, 'ESV: Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved. The ESV text is never stored here; when the site owner connects it, it is fetched per chapter through a proxy that holds the API key, and shown with this notice and a link to ', h('a', { href: 'https://www.esv.org', target: '_blank', rel: 'noopener' }, 'esv.org'), '.'),
    ),
    h(
      'section',
      { class: 'about-sec', id: 'evidence' },
      h('h2', null, 'Manuscript evidence'),
      h('p', null, 'Which manuscripts carry each verse, and their transcriptions, come from the Institute for New Testament Textual Research (INTF, Münster) through its New Testament Virtual Manuscript Room, and from the International Greek New Testament Project. They are used for non-commercial study with attribution under the terms quoted in ', h('code', null, 'data/SOURCES.md'), '. Photographs are never copied here: they stream from the libraries that hold the manuscripts.'),
      h('p', null, 'For the Hebrew Bible, the listed witnesses are the Leningrad and Aleppo codices, the Samaritan Pentateuch, the Septuagint codices Vaticanus, Sinaiticus and Alexandrinus, and every biblical Dead Sea Scroll whose contents are published in Wikipedia’s List of the Dead Sea Scrolls (after Fitzmyer 2008), each matched to the verses it is recorded to contain; see ', h('code', null, 'data/evidence/ot/refs'), '. Their pages are drawn from the Leningrad text, and the photographs are linked at their holders’ sites.'),
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
