// Transmission simulator for Module 1. Pure and deterministic: every random
// draw is a hash of (seed, model, copy id, word slot, purpose), so moving one
// slider changes only what that slider controls. Raising the error rate adds
// errors to the same copies instead of reshuffling everything; raising loss
// destroys a superset of the copies destroyed at a lower setting.
//
// Copies are stored as arrays of slots aligned to the source tokens. Real
// textual critics must first collate (align) witnesses; the simulator skips
// that step so that reconstruction can focus on the voting idea.

export type ErrType = 'spelling' | 'omission' | 'harmonization' | 'gloss';

export interface Token {
  gk: string;
  en: string;
}

export interface Insert {
  gk: string;
  en: string;
}

export interface Slot {
  /** Greek text now in this slot; null when the word was skipped. */
  gk: string | null;
  en: string;
  /** Error that made this slot differ from the source (null when it still matches). */
  err: ErrType | null;
  /** Marginal note absorbed after this word. */
  ins: Insert | null;
}

export interface Copy {
  id: number;
  parent: number; // -1 = the lost autograph
  depth: number; // 1 = copied straight from the autograph
  region: number;
  lost: boolean;
  slots: Slot[];
  /** Slots that differ from the source (including an absorbed note). */
  diffs: number;
  /** Slots whose error was introduced in this copy (not inherited). */
  fresh: number;
  children: number[];
}

export interface Params {
  seed: number;
  errorRate: number; // 0..1 per word per copy
  mix: Record<ErrType, number>; // relative weights (0 disables a type)
  loss: number; // 0..1 share of copies destroyed
  chainN: number;
  treeK: number;
  treeDepth: number;
  regions: number;
}

export interface Reconstruction {
  survivors: number;
  total: number;
  correct: number;
  pct: number;
  /** Words where the vote tied, so no reading can be chosen. */
  ties: { i: number; readings: { label: string; count: number }[] }[];
  /** Words where the majority reading is wrong. */
  wrong: { i: number; label: string; count: number; of: number }[];
  /** Majority text (for display): per slot the winning reading or null on a tie. */
  text: ({ gk: string | null; ins: string | null } | null)[];
}

/* ---------- Hash-based randomness ---------- */

function mix32(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Uniform [0,1) from integer inputs. */
export function rnd(seed: number, a: number, b: number, c: number, d = 0): number {
  let h = mix32(seed ^ 0x9e3779b9);
  h = mix32(h ^ Math.imul(a + 1, 0x27d4eb2d));
  h = mix32(h ^ Math.imul(b + 1, 0x165667b1));
  h = mix32(h ^ Math.imul(c + 1, 0x61c88647));
  h = mix32(h ^ Math.imul(d + 1, 0x3c6ef372));
  return h / 4294967296;
}

const MODEL_CHAIN = 1;
const MODEL_TREE = 2;
// Purposes for draws.
const P_ERR = 1, P_TYPE = 2, P_PICK = 3, P_LOSS = 4, P_REGION = 5, P_REGION2 = 6;

/* ---------- Error operators ---------- */

const PUNCT_RE = /([,.·;’]+)$/;
const splitPunct = (w: string): [string, string] => {
  const m = w.match(PUNCT_RE);
  return m ? [w.slice(0, -m[1].length), m[1]] : [w, ''];
};

// Itacism and related sound-alike swaps, applied on NFD text so accents ride along.
const VOWEL_SWAPS: [string, string][] = [
  ['ο', 'ω'],
  ['ω', 'ο'],
  ['αι', 'ε'],
  ['ε', 'αι'],
  ['ει', 'ι'],
  ['ι', 'ει'],
  ['η', 'ι'],
  ['οι', 'υ'],
];

function misspell(word: string, r: number): string {
  const [core, p] = splitPunct(word);
  const d = core.normalize('NFD');
  const cands: [number, string, string][] = [];
  for (const [from, to] of VOWEL_SWAPS) {
    let idx = d.indexOf(from);
    while (idx !== -1) {
      // Skip "ι" that is the second letter of a diphthong we already cover.
      cands.push([idx, from, to]);
      idx = d.indexOf(from, idx + 1);
    }
  }
  if (core.endsWith('ν')) cands.push([d.length - 1, 'ν', '']); // movable nu dropped
  else if (/[εια]$/.test(d)) cands.push([d.length, '', 'ν']); // movable nu added
  if (!cands.length) return word + 'ν';
  const [idx, from, to] = cands[Math.floor(r * cands.length)];
  const out = (d.slice(0, idx) + to + d.slice(idx + from.length)).normalize('NFC');
  return (out === core ? core + 'ν' : out) + p;
}

// Plausible substitutions, keyed on the word without punctuation.
const SYNONYMS: Record<string, Insert> = {
  'θεόν': { gk: 'κύριον', en: 'Lord' },
  'θεὸς': { gk: 'κύριος', en: 'Lord' },
  'ἦν': { gk: 'ἐστιν', en: 'is' },
  'καὶ': { gk: 'δὲ', en: 'but' },
  'ἐγένετο': { gk: 'ἐγίνετο', en: 'was coming to be' },
  'κατέλαβεν': { gk: 'παρέλαβεν', en: 'received' },
  'φαίνει': { gk: 'ἔφαινεν', en: 'shone' },
  'ἀνθρώπων': { gk: 'ἀνδρῶν', en: 'of men' },
  'πάντα': { gk: 'ὅλα', en: 'all' },
  'σκοτίᾳ': { gk: 'σκότει', en: 'darkness' },
  'σκοτία': { gk: 'σκότος', en: 'darkness' },
  'οὗτος': { gk: 'αὐτὸς', en: 'he' },
  'γέγονεν': { gk: 'ἐγένετο', en: 'came to be' },
  'ζωὴ': { gk: 'ἡ ζωὴ', en: 'the life' },
  'οὐδὲ': { gk: 'οὐ', en: 'not' },
  'ἕν': { gk: 'οὐδέν', en: 'nothing' },
  'λόγος': { gk: 'υἱός', en: 'Son' },
  'χωρὶς': { gk: 'ἄνευ', en: 'apart from' },
  'πρὸς': { gk: 'παρὰ', en: 'beside' },
  'αὐτοῦ': { gk: 'αὐτῷ', en: 'him' },
  'ἀρχῇ': { gk: 'ἀρχὴν', en: 'beginning' },
};

// Short explanatory notes a reader might have written in the margin.
const GLOSSES: Record<string, Insert> = {
  'λόγος': { gk: 'τοῦ θεοῦ', en: 'of God' },
  'θεόν': { gk: 'καὶ πατέρα', en: 'and Father' },
  'ἀρχῇ': { gk: 'τοῦ κόσμου', en: 'of the world' },
  'φῶς': { gk: 'τὸ ἀληθινόν', en: 'the true' },
  'ζωὴ': { gk: 'αἰώνιος', en: 'eternal' },
  'ἐγένετο': { gk: 'ἐν τῷ κόσμῳ', en: 'in the world' },
  'ἀνθρώπων': { gk: 'πάντων', en: 'all' },
  'κατέλαβεν': { gk: 'οὐδὲ ἔγνω', en: 'nor knew' },
};
const GENERIC_GLOSSES: Insert[] = [
  { gk: 'ἀληθῶς', en: 'truly' },
  { gk: 'ἀμήν', en: 'amen' },
  { gk: 'τοῦτ’ ἔστιν', en: 'that is' },
];

/* ---------- Copying ---------- */

export function sourceSlots(tokens: Token[]): Slot[] {
  return tokens.map((t) => ({ gk: t.gk, en: t.en, err: null, ins: null }));
}

function pickType(mix: Record<ErrType, number>, r: number): ErrType | null {
  const types: ErrType[] = ['spelling', 'omission', 'harmonization', 'gloss'];
  const total = types.reduce((s, t) => s + mix[t], 0);
  if (total <= 0) return null;
  let acc = 0;
  for (const t of types) {
    acc += mix[t] / total;
    if (r < acc) return t;
  }
  return types[types.length - 1];
}

function copyText(
  parent: Slot[],
  tokens: Token[],
  p: Params,
  model: number,
  id: number,
): { slots: Slot[]; fresh: number } {
  const slots = parent.slice();
  let fresh = 0;
  for (let i = 0; i < slots.length; i++) {
    let rate = p.errorRate;
    // Haplography: a scribe's eye skips more easily where a word repeats nearby.
    const cur = tokens[i].gk;
    if (i > 0 && (tokens[i - 1].gk === cur || (i > 1 && tokens[i - 2].gk === cur))) rate *= 1.5;
    if (rnd(p.seed, model, id, i, P_ERR) >= rate) continue;
    const type = pickType(p.mix, rnd(p.seed, model, id, i, P_TYPE));
    if (!type) continue;
    const r = rnd(p.seed, model, id, i, P_PICK);
    const s = slots[i];
    let next: Slot | null = null;
    if (type === 'spelling') {
      if (s.gk !== null) next = { ...s, gk: misspell(s.gk, r), err: s.err ?? 'spelling' };
    } else if (type === 'omission') {
      if (s.gk !== null) next = { ...s, gk: null, err: 'omission' };
    } else if (type === 'harmonization') {
      if (s.gk !== null) {
        const [core, punct] = splitPunct(s.gk);
        const syn = SYNONYMS[core];
        if (syn) next = { ...s, gk: syn.gk + punct, en: syn.en, err: 'harmonization' };
        else next = { ...s, gk: misspell(s.gk, r), err: s.err ?? 'spelling' };
      }
    } else if (type === 'gloss') {
      if (!s.ins) {
        const core = splitPunct(tokens[i].gk)[0];
        const g = GLOSSES[core] ?? GENERIC_GLOSSES[Math.floor(r * GENERIC_GLOSSES.length)];
        next = { ...s, ins: g };
      }
    }
    if (next) {
      // A later copyist can accidentally restore the source reading; keep the
      // bookkeeping honest when that happens.
      if (next.gk === tokens[i].gk && next.err !== 'omission') next = { ...next, err: null, en: tokens[i].en };
      slots[i] = next;
      fresh++;
    }
  }
  return { slots, fresh };
}

export function countDiffs(slots: Slot[], tokens: Token[]): number {
  let n = 0;
  for (let i = 0; i < slots.length; i++) if (slots[i].gk !== tokens[i].gk || slots[i].ins) n++;
  return n;
}

function regionFor(p: Params, model: number, id: number, parentRegion: number | null): number {
  if (parentRegion === null) return Math.floor(rnd(p.seed, model, id, 0, P_REGION) * p.regions);
  // Most copies stay where they were made; about one in five travels.
  if (rnd(p.seed, model, id, 0, P_REGION2) < 0.8) return parentRegion;
  return Math.floor(rnd(p.seed, model, id, 1, P_REGION) * p.regions);
}

export function runChain(tokens: Token[], p: Params): Copy[] {
  const out: Copy[] = [];
  let prev = sourceSlots(tokens);
  let region: number | null = null;
  for (let id = 0; id < p.chainN; id++) {
    const { slots, fresh } = copyText(prev, tokens, p, MODEL_CHAIN, id);
    region = regionFor(p, MODEL_CHAIN, id, region);
    out.push({
      id,
      parent: id - 1,
      depth: id + 1,
      region,
      lost: rnd(p.seed, MODEL_CHAIN, id, 0, P_LOSS) < p.loss,
      slots,
      diffs: countDiffs(slots, tokens),
      fresh,
      children: id + 1 < p.chainN ? [id + 1] : [],
    });
    prev = slots;
  }
  return out;
}

/** Breadth-first tree: ids are assigned generation by generation. */
export function runTree(tokens: Token[], p: Params): Copy[] {
  const out: Copy[] = [];
  const root = sourceSlots(tokens);
  let frontier: { slots: Slot[]; id: number; region: number | null }[] = [{ slots: root, id: -1, region: null }];
  for (let depth = 1; depth <= p.treeDepth; depth++) {
    const next: typeof frontier = [];
    for (const par of frontier) {
      for (let c = 0; c < p.treeK; c++) {
        const id = out.length;
        const { slots, fresh } = copyText(par.slots, tokens, p, MODEL_TREE, id);
        const region = regionFor(p, MODEL_TREE, id, par.region);
        out.push({
          id,
          parent: par.id,
          depth,
          region,
          lost: rnd(p.seed, MODEL_TREE, id, 0, P_LOSS) < p.loss,
          slots,
          diffs: countDiffs(slots, tokens),
          fresh,
          children: [],
        });
        if (par.id >= 0) out[par.id].children.push(id);
        next.push({ slots, id, region });
      }
    }
    frontier = next;
  }
  return out;
}

/* ---------- Reconstruction: majority vote per word ---------- */

const readingKey = (s: Slot) => `${s.gk ?? '∅'}|${s.ins ? s.ins.gk : ''}`;

export function readingLabel(s: { gk: string | null; ins: string | null }): string {
  const w = s.gk === null ? '(omitted)' : s.gk;
  return s.ins ? `${w} + ${s.ins}` : w;
}

export function reconstruct(copies: Copy[], tokens: Token[]): Reconstruction {
  const alive = copies.filter((c) => !c.lost);
  const n = tokens.length;
  const res: Reconstruction = {
    survivors: alive.length,
    total: n,
    correct: 0,
    pct: 0,
    ties: [],
    wrong: [],
    text: [],
  };
  if (!alive.length) {
    res.text = tokens.map(() => null);
    res.ties = [];
    return res;
  }
  for (let i = 0; i < n; i++) {
    const counts = new Map<string, { count: number; gk: string | null; ins: string | null }>();
    for (const c of alive) {
      const s = c.slots[i];
      const k = readingKey(s);
      const e = counts.get(k);
      if (e) e.count++;
      else counts.set(k, { count: 1, gk: s.gk, ins: s.ins ? s.ins.gk : null });
    }
    const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
    const top = sorted[0];
    if (sorted.length > 1 && sorted[1].count === top.count) {
      res.ties.push({
        i,
        readings: sorted.filter((r) => r.count === top.count).map((r) => ({ label: readingLabel(r), count: r.count })),
      });
      res.text.push(null);
      continue;
    }
    res.text.push({ gk: top.gk, ins: top.ins });
    if (top.gk === tokens[i].gk && top.ins === null) res.correct++;
    else res.wrong.push({ i, label: readingLabel(top), count: top.count, of: alive.length });
  }
  res.pct = res.correct / n;
  return res;
}

export function treeSize(k: number, depth: number): number {
  let total = 0;
  let gen = 1;
  for (let d = 1; d <= depth; d++) {
    gen *= k;
    total += gen;
  }
  return total;
}
