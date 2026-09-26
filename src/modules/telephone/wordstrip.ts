// "Compare a single word": every surviving copy's reading of one word, as a
// stacked strip. Each segment is one distinct reading, sized by how many
// copies have it; the majority reading is outlined. Shared by Module 1, the
// home page and present mode.
import { h } from '../../lib/dom';
import { readingLabel, type Copy, type Token } from './sim';

export interface Reading {
  label: string;
  count: number;
  correct: boolean;
}

export function readingsAt(copies: Copy[], i: number, tokens: Token[]): Reading[] {
  const counts = new Map<string, Reading>();
  for (const c of copies) {
    if (c.lost) continue;
    const sl = c.slots[i];
    const label = readingLabel({ gk: sl.gk, ins: sl.ins ? sl.ins.gk : null });
    const correct = sl.gk === tokens[i].gk && !sl.ins;
    const e = counts.get(label);
    if (e) e.count++;
    else counts.set(label, { label, count: 1, correct });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || Number(b.correct) - Number(a.correct));
}

export function WordStrip(title: string, readings: Reading[], opts: { big?: boolean } = {}): HTMLElement {
  const total = readings.reduce((s, r) => s + r.count, 0);
  const tie = readings.length > 1 && readings[0].count === readings[1].count;
  const winner = readings[0];
  const outcome = !total
    ? 'No surviving copies'
    : tie
      ? 'Tie: the vote cannot decide'
      : winner.correct
        ? `Majority reads it correctly (${winner.count} of ${total})`
        : `Majority is wrong (${winner.count} of ${total})`;
  return h(
    'figure',
    { class: `wstrip ${opts.big ? 'wstrip--big' : ''}` },
    h('figcaption', { class: 'wstrip__head' }, h('span', { class: 'wstrip__title' }, title), h('span', { class: `wstrip__outcome ${!total || tie ? 'is-tie' : winner.correct ? 'is-ok' : 'is-bad'}` }, outcome)),
    h(
      'div',
      { class: 'wstrip__bar', role: 'img', 'aria-label': `${title}: ${readings.map((r) => `${r.label}, ${r.count} ${r.count === 1 ? 'copy' : 'copies'}`).join('; ')}. ${outcome}.` },
      readings.map((r, j) =>
        h(
          'div',
          {
            class: `wstrip__seg ${r.correct ? 'is-correct' : 'is-wrong'} ${j === 0 && !tie ? 'is-majority' : ''}`,
            style: { flexGrow: String(r.count) },
            title: `${r.label}: ${r.count} of ${total}`,
          },
          h('span', { class: 'wstrip__gk greek', lang: 'grc' }, r.label),
          h('span', { class: 'wstrip__n num' }, String(r.count)),
        ),
      ),
    ),
  );
}
