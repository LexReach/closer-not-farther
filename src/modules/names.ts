// Module 5: Names as fingerprints.
import * as d3 from 'd3';
import { h, s, clear, fmtPct, reducedMotion } from '../lib/dom';
import { Disclosure, Legend, ModuleHeader, SourceList, StatTile, Toggle, Tooltip } from '../components';
import { skepticsFor } from '../data';
import names from '../../data/names.json';

type Sex = 'male' | 'female';
type Tag = 'canonical-overlap' | 'palestinian-typical' | 'atypical';

interface NameRow {
  name: string;
  palestine: number;
  gospels_acts: number;
  verify?: boolean;
  verify_note?: string;
}

interface ApoEntry {
  text: string;
  name: string;
  mentions: number;
  tag: Tag;
  note?: string;
  approx?: boolean;
}

const TAG_LABEL: Record<Tag, string> = {
  'canonical-overlap': 'Also in the canonical Gospels',
  'palestinian-typical': 'New, typical Palestinian Jewish name',
  atypical: 'New, not a typical Palestinian name',
};
const TAG_VAR: Record<Tag, string> = {
  'canonical-overlap': 'var(--muted)',
  'palestinian-typical': 'var(--success)',
  atypical: 'var(--r-rome)',
};

function totals(sex: Sex) {
  return {
    pal: sex === 'male' ? names.palestine_totals.male_occurrences : names.palestine_totals.female_occurrences,
    gos: sex === 'male' ? names.gospels_acts_totals.male_occurrences : names.gospels_acts_totals.female_occurrences,
    palDistinct: sex === 'male' ? names.palestine_totals.male_distinct : names.palestine_totals.female_distinct,
  };
}

const rows = (sex: Sex): NameRow[] => (sex === 'male' ? names.male : names.female) as NameRow[];

/* ---------- Panel A chart ---------- */

export interface NameChartOpts {
  /** Draw Palestine bars first, then Gospel bars, then the expected line. */
  animate?: boolean;
  /** Present-mode sizing (28px+ labels, thick marks). */
  big?: boolean;
  /** Show only the first n names. */
  limit?: number;
}

export function drawNameChart(wrap: HTMLElement, sex: Sex, opts: NameChartOpts = {}) {
  clear(wrap);
  const big = !!opts.big;
  const data = rows(sex).slice(0, opts.limit ?? undefined);
  const t = totals(sex);
  const W = Math.max(300, wrap.clientWidth || 700);
  const narrow = W < 520 && !big;
  const labelW = big ? 360 : narrow ? 136 : 170;
  const top = big ? 56 : 26;
  const rowH = big ? Math.max(48, Math.min(76, Math.floor(((wrap.clientHeight || 640) - top - 8) / data.length))) : narrow ? 34 : 36;
  const barH = big ? Math.round(rowH * 0.34) : narrow ? 11 : 12;
  const H = top + data.length * rowH + 6;
  const maxPct = d3.max(rows(sex), (d) => Math.max(d.palestine / t.pal, d.gospels_acts / t.gos)) ?? 0.1;
  const x = d3.scaleLinear().domain([0, Math.ceil(maxPct * 20) / 20]).range([labelW, W - (big ? 130 : narrow ? 34 : 44)]);
  const anim = !!opts.animate && !reducedMotion();

  const svg = s('svg', {
    class: `chart names-chart ${narrow ? 'chart--narrow' : ''} ${big ? 'chart--big' : ''} ${anim ? 'is-animating' : ''}`,
    width: W,
    height: H,
    viewBox: `0 0 ${W} ${H}`,
    role: 'list',
    'aria-label': `Share of ${sex} name occurrences for the top ${data.length} names: Palestinian Jews 330 BC to 200 AD compared with the Gospels and Acts, with the Gospel count expected at population rates.`,
  });
  const ticks = x.ticks(big ? 3 : narrow ? 3 : 5);
  for (const tk of ticks) {
    svg.appendChild(s('line', { x1: x(tk), x2: x(tk), y1: top - 6, y2: H - 4, class: 'gridline' }));
    svg.appendChild(s('text', { x: x(tk), y: top - (big ? 18 : 12), 'text-anchor': 'middle' }, `${Math.round(tk * 100)}%`));
  }
  const expPts: string[] = [];
  data.forEach((d, i) => {
    const y = top + i * rowH;
    const pp = d.palestine / t.pal;
    const gp = d.gospels_acts / t.gos;
    const expected = pp * t.gos;
    const g = s('g', { class: 'namebar', tabindex: 0, role: 'listitem' });
    const label = `${d.name}: ${fmtPct(pp, 1)} of Palestinian ${sex} names (${d.palestine} of ${t.pal}); ${fmtPct(gp, 1)} in the Gospels and Acts (${d.gospels_acts} of ${t.gos}); about ${expected.toFixed(1)} expected at population rates.${d.verify ? ' Gospel count unverified.' : ''}`;
    g.setAttribute('aria-label', label);
    const delay = (base: number) => (anim ? { style: `animation-delay: ${base + i * 50}ms` } : {});
    g.append(
      s('rect', { x: 0, y: y - 2, width: W, height: rowH - 2, class: 'namebar__hit' }),
      s('text', { x: labelW - (big ? 20 : 10), y: y + barH + (big ? 8 : 2), 'text-anchor': 'end', class: 'namebar__label' }, `${narrow || big ? '' : `${i + 1}. `}${d.name}${d.verify ? ' *' : ''}`),
      s('rect', { x: labelW, y, width: Math.max(1, x(pp) - labelW), height: barH, class: 'bar-pal grow', rx: 1.5, ...delay(0) }),
      s('rect', { x: labelW, y: y + barH + 2, width: Math.max(gp ? 1 : 0, x(gp) - labelW), height: barH, class: 'bar-gos grow', rx: 1.5, ...delay(900) }),
      s('text', { x: x(pp) + (big ? 10 : 5), y: y + barH - (big ? 4 : 2), class: 'namebar__val fade', ...delay(500) }, fmtPct(pp, 1)),
      s('text', { x: Math.max(x(gp), x(pp)) + (big ? 10 : 5), y: y + 2 * barH + (big ? 0 : 0), class: 'namebar__val namebar__val--gos fade', ...delay(1400) }, fmtPct(gp, 1)),
    );
    expPts.push(`${x(pp)},${y + barH + 2 + barH / 2}`);
    const tip = () =>
      h(
        'div',
        null,
        h('p', null, h('strong', null, d.name)),
        h('p', null, `Palestine: ${d.palestine} of ${t.pal} occurrences (${fmtPct(pp, 1)})`),
        h('p', null, `Gospels + Acts: ${d.gospels_acts} of ${t.gos} (${fmtPct(gp, 1)})`),
        h('p', null, `Expected at population rates: about ${expected.toFixed(1)}`),
        d.verify ? h('p', { class: 'tt-muted' }, d.verify_note ?? 'Gospel count awaiting a check against the printed table.') : null,
        h('p', { class: 'tt-muted' }, 'Source: Ilan 2002 via Bauckham 2017, ch. 4'),
      );
    g.addEventListener('pointermove', (e) => Tooltip.show(tip(), e.clientX, e.clientY));
    g.addEventListener('pointerleave', () => Tooltip.hide());
    g.addEventListener('focus', () => Tooltip.showFor(tip(), g));
    g.addEventListener('blur', () => Tooltip.hide());
    svg.appendChild(g);
  });
  // Expected line: where each Gospel bar would end if names were drawn at population rates.
  const exp = s('g', { class: 'expected fade', 'aria-hidden': 'true', ...(anim ? { style: 'animation-delay: 1900ms' } : {}) });
  exp.appendChild(s('polyline', { points: expPts.join(' '), class: 'expected__line' }));
  for (const pt of expPts) {
    const [ex, ey] = pt.split(',').map(Number);
    exp.appendChild(s('line', { x1: ex, x2: ex, y1: ey - barH * 0.8, y2: ey + barH * 0.8, class: 'expected__tick' }));
  }
  svg.appendChild(exp);
  wrap.appendChild(svg);
}

/* ---------- The Twelve (panel B), reused by the home page and present mode ---------- */

type Apostle = { name: string; qualifier: string | null; palestine_rank: number | null; origin: string; note?: string };
export const twelve = names.twelve.entries as Apostle[];
export const TOP_N = names.male.length;
export const isCommon = (r: number | null) => r !== null && r <= TOP_N;

export function TwelveGrid(opts: { big?: boolean } = {}): { el: HTMLElement; play(): void; reset(): void } {
  const items = twelve.map((e) =>
    h(
      'li',
      { class: `apostle ${isCommon(e.palestine_rank) ? 'is-common' : 'is-rare'} ${e.qualifier ? 'has-q' : ''}` },
      h(
        'div',
        { class: 'apostle__top' },
        h('span', { class: 'apostle__name' }, e.name),
        h('span', { class: 'apostle__rank num', title: 'Rank among Palestinian Jewish male names (Ilan / Bauckham)' }, e.palestine_rank ? `#${e.palestine_rank}` : 'rare'),
      ),
      h('div', { class: 'apostle__q' }, e.qualifier ? `“${e.qualifier}”` : 'no qualifier'),
      opts.big ? null : h('div', { class: 'apostle__origin' }, e.origin, e.note ? `. ${capitalize(e.note)}` : ''),
    ),
  );
  const el = h('ol', { class: `twelve ${opts.big ? 'twelve--big' : ''}` }, items);
  let timers: number[] = [];
  const reset = () => {
    timers.forEach(clearTimeout);
    timers = [];
    items.forEach((li) => li.classList.remove('is-lit'));
    el.classList.remove('is-playing');
  };
  return {
    el,
    reset,
    play() {
      reset();
      if (reducedMotion()) {
        items.forEach((li) => li.classList.add('is-lit'));
        return;
      }
      el.classList.add('is-playing');
      items.forEach((li, i) => timers.push(window.setTimeout(() => li.classList.add('is-lit'), 250 + i * 260)));
    },
  };
}

/* ---------- Headline stats (recomputed) ---------- */

function shareOfTop(sex: Sex, n: number) {
  const data = rows(sex).slice(0, n);
  const t = totals(sex);
  return {
    pal: d3.sum(data, (d) => d.palestine) / t.pal,
    gos: d3.sum(data, (d) => d.gospels_acts) / t.gos,
  };
}

/* ---------- Page ---------- */

export function render(root: HTMLElement) {
  let sex: Sex = 'male';
  const chartWrap = h('div', { class: 'chart-wrap' });
  const statsWrap = h('div', { class: 'stats names-stats' });

  const renderStats = () => {
    clear(statsWrap);
    const top2 = shareOfTop('male', 2);
    const top9 = shareOfTop('male', 9);
    const hs = names.headline_stats;
    statsWrap.append(
      StatTile('Top 2 male names, Palestine', fmtPct(top2.pal, 1), `Bauckham prints ${fmtPct(hs.top2_share_palestine, 1)}`).el,
      StatTile('Top 2 male names, Gospels + Acts', fmtPct(top2.gos, 1), `Bauckham prints ${fmtPct(hs.top2_share_gospels_acts, 1)}`, 'accent').el,
      StatTile('Top 9 male names, Palestine', fmtPct(top9.pal, 1), `Bauckham prints ${fmtPct(hs.top9_share_palestine, 1)}`).el,
      StatTile('Top 9 male names, Gospels + Acts', fmtPct(top9.gos, 1), `Bauckham prints ${fmtPct(hs.top9_share_gospels_acts, 1)}`, 'accent').el,
    );
  };

  const sexToggle = Toggle<Sex>({
    label: 'Names',
    options: [
      { value: 'male', label: `Top ${names.male.length} male` },
      { value: 'female', label: `Top ${names.female.length} female` },
    ],
    value: sex,
    onChange: (v) => {
      sex = v;
      drawNameChart(chartWrap, sex);
      caption.textContent = captionText();
    },
  });

  const captionText = () => {
    const t = totals(sex);
    return `Each bar is a share of its own total: ${t.pal.toLocaleString('en-US')} ${sex} name occurrences among Palestinian Jews (${t.palDistinct} distinct names), and ${t.gos} named ${sex} Palestinian Jews in the Gospels and Acts. Hover or focus a row for raw counts. * = figure flagged for a check against the printed table.`;
  };
  const caption = h('p', { class: 'chart-note' }, captionText());

  /* Panel B: the Twelve */
  const topN = TOP_N;
  const common = twelve.filter((e) => isCommon(e.palestine_rank));
  const rare = twelve.filter((e) => !isCommon(e.palestine_rank));
  const commonQ = common.filter((e) => e.qualifier).length;
  const rareQ = rare.filter((e) => e.qualifier).length;
  const twelveGrid = TwelveGrid().el;

  /* Panel C: control group */
  const apo = names.apocryphal as unknown as {
    texts: string[];
    entries: ApoEntry[];
    text_sources: Record<string, { translation: string; url: string; date_of_text: string }>;
    method: string;
  };
  const hasApo = apo.entries.length > 0;
  let apoText = apo.texts[0];
  const apoWrap = h('div', { class: 'apo' });
  const apoToggle = Toggle<string>({
    label: 'Text',
    options: apo.texts.map((t) => ({ value: t, label: t.replace('Gospel of ', ''), disabled: !hasApo, title: t })),
    value: apoText,
    onChange: (v) => {
      apoText = v;
      renderApo();
    },
  });

  function renderApo() {
    clear(apoWrap);
    if (!hasApo) {
      apoWrap.append(h('p', { class: 'muted' }, 'Data pending: the name sets for these texts have not been extracted yet.'));
      return;
    }
    const entries = apo.entries.filter((e) => e.text === apoText);
    const added = entries.filter((e) => e.tag !== 'canonical-overlap');
    const typical = added.filter((e) => e.tag === 'palestinian-typical');
    const src = apo.text_sources[apoText];
    const counts = (['canonical-overlap', 'palestinian-typical', 'atypical'] as Tag[]).map((tag) => ({
      tag,
      n: entries.filter((e) => e.tag === tag).length,
    }));
    const total = entries.length;
    const bar = h(
      'div',
      { class: 'apo__bar', role: 'img', 'aria-label': counts.map((c) => `${c.n} ${TAG_LABEL[c.tag].toLowerCase()}`).join(', ') },
      counts.filter((c) => c.n).map((c) =>
        h('div', { class: 'apo__seg', style: { flexGrow: String(c.n), background: TAG_VAR[c.tag] } }, h('span', null, String(c.n))),
      ),
    );
    apoWrap.append(
      h(
        'p',
        { class: 'apo__summary' },
        h('strong', null, apoText),
        ` (${(src?.date_of_text ?? '').split(/ \(|;/)[0]}) names ${total} ${total === 1 ? 'person' : 'people'}. `,
        added.length === 0
          ? 'Every one is borrowed from the canonical Gospels (or their Old Testament background). It adds no new names to test.'
          : `${total - added.length} are borrowed from the canonical story. Of the ${added.length} it adds, ${typical.length} ${typical.length === 1 ? 'is a' : 'are'} typical Palestinian Jewish name${typical.length === 1 ? '' : 's'}.`,
      ),
      bar,
      h(
        'ul',
        { class: 'apo__names' },
        [...entries]
          .sort((a, b) => (a.tag === b.tag ? b.mentions - a.mentions : a.tag.localeCompare(b.tag)))
          .map((e) =>
            h(
              'li',
              { class: `chip apo__chip tag-${e.tag}`, title: e.note ?? '' },
              h('span', { class: 'apo__dot', style: { background: TAG_VAR[e.tag] }, 'aria-hidden': 'true' }),
              e.name,
              h('span', { class: 'muted num' }, `${e.approx ? '≈' : '×'}${e.mentions}`),
              h('span', { class: 'visually-hidden' }, `, ${TAG_LABEL[e.tag]}`),
            ),
          ),
      ),
      src ? h('p', { class: 'chart-note' }, `Translation: ${src.translation}. `, h('a', { href: src.url, rel: 'noopener', target: '_blank' }, 'Text'), '. Mention counts are approximate (≈).') : '',
    );
  }

  const sk = skepticsFor('names');

  root.append(
    ModuleHeader(
      'Module 5',
      'Names as fingerprints',
      'Invented stories set in a far-off place tend to get the names wrong. The Gospels use first-century Palestinian Jewish names at about the rates the population did, and they add a second name exactly where a common name would be ambiguous.',
    ),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'names-a' },
      h('h2', { id: 'names-a' }, 'The most common names, then and in the Gospels'),
      h(
        'p',
        { class: 'measure' },
        'Tal Ilan catalogued every known Jewish name from Palestine between 330 BC and 200 AD. Richard Bauckham compared her tallies with the named Palestinian Jews in the Gospels and Acts. If the Gospel names came from somewhere else, the two shapes would not match.',
      ),
      h(
        'div',
        { class: 'panel' },
        h(
          'div',
          { class: 'names-bar-head' },
          sexToggle.el,
          Legend(
            [
              { label: 'Palestinian Jews, 330 BC–200 AD', color: 'var(--bar-pal)' },
              { label: 'Gospels + Acts', color: 'var(--accent)' },
              { label: 'Expected at population rates', color: 'var(--ink)', shape: 'line' },
            ],
            'Series',
          ),
        ),
        chartWrap,
        caption,
      ),
      h('h3', { class: 'names-stats-h' }, 'Bauckham’s headline comparison, recomputed from the data'),
      statsWrap,
      h(
        'p',
        { class: 'chart-note measure' },
        'The recomputed shares use the counts in data/names.json. Where they differ from the figures Bauckham prints, both are shown; the gap reflects which occurrences are counted, and it is one reason his arithmetic has been questioned.',
      ),
    ),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'names-b' },
      h('h2', { id: 'names-b' }, 'The Twelve'),
      h(
        'p',
        { class: 'measure' },
        `Matthew 10:2–4 lists the apostles. The ${common.length} with names in the top ${topN} all get a qualifier (${commonQ} of ${common.length}): Simon called Peter, James son of Zebedee, Judas Iscariot. Of the ${rare.length} with rarer names, ${rareQ} ${rareQ === 1 ? 'gets one' : 'get one'}, and ${rareQ === 1 ? 'it is' : 'those are'} relational rather than disambiguating. That is how people talk when several people in the room share a name.`,
      ),
      Legend(
        [
          { label: `Name in the top ${topN}`, color: 'var(--accent)' },
          { label: 'Rarer name', color: 'var(--rule)' },
        ],
        'Name frequency',
      ),
      twelveGrid,
      h('p', { class: 'chart-note' }, names.twelve.ranks_source),
    ),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'names-c' },
      h('h2', { id: 'names-c' }, 'The control group'),
      h(
        'p',
        { class: 'measure' },
        'Later gospels written far from Palestine are the natural comparison. Most of their cast is borrowed from the canonical story, so the test is the names each one adds.',
      ),
      h(
        'div',
        { class: 'panel' },
        h('div', { class: 'names-bar-head' }, apoToggle.el, Legend((Object.keys(TAG_LABEL) as Tag[]).map((t) => ({ label: TAG_LABEL[t], color: TAG_VAR[t] })), 'Name tags')),
        apoWrap,
      ),
      hasApo ? h('p', { class: 'chart-note measure' }, apo.method) : '',
    ),
    Disclosure(sk.points, { intro: sk.intro, framing: sk.framing }),
    SourceList(names.sources),
  );

  drawNameChart(chartWrap, sex);
  renderStats();
  renderApo();

  let lastW = chartWrap.clientWidth;
  const ro = new ResizeObserver(() => {
    if (Math.abs(chartWrap.clientWidth - lastW) > 8) {
      lastW = chartWrap.clientWidth;
      drawNameChart(chartWrap, sex);
    }
  });
  ro.observe(chartWrap);
  return () => ro.disconnect();
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
