// Morphology codes in plain English. Pure (no DOM) so it can be unit-tested.
// Greek: Robinson-style codes as used by STEPBible TAGNT / MorphGNT-derived data
//   e.g. "V-AAI-3S", "N-NSM", "A-GPF", "P-1NS", "T-NSM", "CONJ", "PREP".
// Hebrew: OSHB codes, e.g. "HVqp3ms", "HNcmsa", "HC/Ncbsc" (prefix segments split by "/").

const G_POS: Record<string, string> = {
  V: 'verb', N: 'noun', A: 'adjective', T: 'article', P: 'personal pronoun', R: 'relative pronoun', C: 'reciprocal pronoun',
  D: 'demonstrative pronoun', K: 'correlative pronoun', I: 'interrogative pronoun', X: 'indefinite pronoun', Q: 'correlative or interrogative pronoun',
  F: 'reflexive pronoun', S: 'possessive pronoun', ADV: 'adverb', CONJ: 'conjunction', COND: 'conditional particle', PRT: 'particle',
  PREP: 'preposition', INJ: 'interjection', ARAM: 'Aramaic word', HEB: 'Hebrew word', 'N-PRI': 'proper noun (indeclinable)', 'A-NUI': 'number (indeclinable)',
};
const TENSE: Record<string, string> = { P: 'present', I: 'imperfect', F: 'future', A: 'aorist', R: 'perfect', L: 'pluperfect', '2A': 'second aorist', '2R': 'second perfect', '2F': 'second future', '2L': 'second pluperfect' };
const VOICE: Record<string, string> = { A: 'active', M: 'middle', P: 'passive', E: 'middle or passive', D: 'middle deponent', O: 'passive deponent', N: 'middle or passive deponent', Q: 'impersonal active', X: 'no voice' };
const MOOD: Record<string, string> = { I: 'indicative', S: 'subjunctive', O: 'optative', M: 'imperative', N: 'infinitive', P: 'participle', R: 'imperative-sense participle' };
const CASE: Record<string, string> = { N: 'nominative', G: 'genitive', D: 'dative', A: 'accusative', V: 'vocative' };
const NUM: Record<string, string> = { S: 'singular', P: 'plural' };
const GEN: Record<string, string> = { M: 'masculine', F: 'feminine', N: 'neuter' };
const PERSON: Record<string, string> = { '1': '1st person', '2': '2nd person', '3': '3rd person' };

function caseNumGender(s: string): string[] {
  // e.g. "NSM", "GPF", "1NS" (person + case + number for pronouns)
  const out: string[] = [];
  let rest = s;
  if (PERSON[rest[0]]) {
    out.push(PERSON[rest[0]]);
    rest = rest.slice(1);
  }
  if (CASE[rest[0]]) out.push(CASE[rest[0]]);
  if (NUM[rest[1]]) out.push(NUM[rest[1]]);
  if (GEN[rest[2]]) out.push(GEN[rest[2]]);
  return out;
}

export function parseGreek(code: string): string {
  if (!code) return '';
  const c = code.trim().toUpperCase();
  if (G_POS[c]) return G_POS[c];
  const parts = c.split('-');
  const pos = parts[0];
  if (pos === 'V') {
    const tvm = parts[1] ?? '';
    const m = tvm.match(/^(2?[PIFARL])([AMPEDONQX])([ISOMNPR])$/);
    const out = ['verb'];
    if (m) out.push(TENSE[m[1]] ?? m[1], VOICE[m[2]] ?? m[2], MOOD[m[3]] ?? m[3]);
    const pn = parts[2] ?? '';
    if (/^[123][SP]$/.test(pn)) out.push(PERSON[pn[0]], NUM[pn[1]]);
    else if (pn) out.push(...caseNumGender(pn));
    return out.filter(Boolean).join(', ');
  }
  const label = G_POS[pos];
  if (!label) return code;
  const out = [label];
  if (parts[1] === 'PRI') return 'proper noun (indeclinable)';
  if (parts[1] === 'NUI') return 'number (indeclinable)';
  if (parts[1]) out.push(...caseNumGender(parts[1]));
  if (parts[2] === 'C') out.push('comparative');
  if (parts[2] === 'S') out.push('superlative');
  return out.join(', ');
}

/* ---------- Hebrew (OSHB morphology) ---------- */

const H_POS: Record<string, string> = { A: 'adjective', C: 'conjunction', D: 'adverb', N: 'noun', P: 'pronoun', R: 'preposition', S: 'suffix', T: 'particle', V: 'verb' };
const H_STEM: Record<string, string> = {
  q: 'qal', N: 'niphal', p: 'piel', P: 'pual', h: 'hiphil', H: 'hophal', t: 'hithpael', o: 'polel', O: 'polal', r: 'hithpolel', m: 'poel', M: 'poal',
  k: 'palel', K: 'pulal', Q: 'qal passive', l: 'pilpel', L: 'polpal', f: 'hithpalpel', D: 'nithpael', j: 'pealal', i: 'pilel', u: 'hothpaal', c: 'tiphil', v: 'hishtaphel', w: 'nithpalel', y: 'nithpoel', z: 'hithpoel',
};
const H_FORM: Record<string, string> = { p: 'perfect', q: 'sequential perfect', i: 'imperfect', w: 'sequential imperfect', h: 'cohortative', j: 'jussive', v: 'imperative', r: 'participle', s: 'passive participle', a: 'infinitive absolute', c: 'infinitive construct' };
const H_PERSON: Record<string, string> = { '1': '1st person', '2': '2nd person', '3': '3rd person' };
const H_GEN: Record<string, string> = { m: 'masculine', f: 'feminine', b: 'both genders', c: 'common' };
const H_NUM: Record<string, string> = { s: 'singular', p: 'plural', d: 'dual' };
const H_STATE: Record<string, string> = { a: 'absolute', c: 'construct', d: 'determined' };
const H_NTYPE: Record<string, string> = { c: 'common', g: 'gentilic', p: 'proper name' };

function hebSegment(seg: string): string {
  const pos = seg[0];
  const rest = seg.slice(1);
  if (pos === 'V') {
    const out = ['verb', H_STEM[rest[0]] ?? '', H_FORM[rest[1]] ?? ''];
    let r = rest.slice(2);
    if (H_PERSON[r[0]]) {
      out.push(H_PERSON[r[0]]);
      r = r.slice(1);
    }
    if (H_GEN[r[0]]) out.push(H_GEN[r[0]]);
    if (H_NUM[r[1]]) out.push(H_NUM[r[1]]);
    if (H_STATE[r[2]]) out.push(H_STATE[r[2]]);
    return out.filter(Boolean).join(', ');
  }
  if (pos === 'N') {
    const out = [H_NTYPE[rest[0]] === 'proper name' ? 'proper name' : 'noun'];
    if (H_GEN[rest[1]]) out.push(H_GEN[rest[1]]);
    if (H_NUM[rest[2]]) out.push(H_NUM[rest[2]]);
    if (H_STATE[rest[3]]) out.push(H_STATE[rest[3]]);
    return out.join(', ');
  }
  if (pos === 'A') {
    const out = ['adjective'];
    if (H_GEN[rest[1]]) out.push(H_GEN[rest[1]]);
    if (H_NUM[rest[2]]) out.push(H_NUM[rest[2]]);
    return out.join(', ');
  }
  if (pos === 'R') return rest.startsWith('d') ? 'preposition with article' : 'preposition';
  if (pos === 'T') return rest === 'd' ? 'definite article' : rest === 'o' ? 'direct object marker' : rest === 'n' ? 'negative particle' : 'particle';
  if (pos === 'S') return rest.startsWith('d') ? 'directional ending' : 'pronominal suffix';
  return H_POS[pos] ?? seg;
}

export function parseHebrew(code: string): string {
  if (!code) return '';
  const c = code.replace(/^[HA]/, ''); // language letter: H Hebrew, A Aramaic
  const lang = code.startsWith('A') ? 'Aramaic ' : '';
  return lang + c.split('/').map(hebSegment).join(' + ');
}

export function parseMorph(code: string, lang: 'grc' | 'hbo'): string {
  return lang === 'hbo' ? parseHebrew(code) : parseGreek(code);
}

/* ---------- Transliteration fallback (Greek) ---------- */

const TR: Record<string, string> = {
  α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō',
};
export function translitGreek(word: string): string {
  const base = word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rough = /̔/.test(word.normalize('NFD'));
  let out = '';
  for (const ch of base) out += TR[ch] ?? (/[a-z]/.test(ch) ? ch : '');
  out = out.replace(/gg/g, 'ng').replace(/gk/g, 'nk').replace(/gx/g, 'nx').replace(/gch/g, 'nch');
  return (rough ? 'h' : '') + out;
}
