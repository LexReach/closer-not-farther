// scripts/evidence/tei.mjs
//
// NTVMR / IGNTP TEI transcription of one page -> the page shape the site's
// Witness view renders (src/evidence/data.ts, TxPage):
//
//   { ga, pageId, folio, columns: [{ lines: [{ n, tokens: [Token] }] }] }
//   Token = { t, v?, ns?, lac?, gap?, j?, corr?: { hand, t } }
//     t     the letters as the first hand wrote them (supplied letters included
//           when the editor restored them, flagged by lac)
//     v     verse id "BOOK.c.v" (from <ab n="B04K1V1">)
//     ns    nomen sacrum: the expanded word (θς -> θεος)
//     lac   the letters are lost from the page (<supplied>, <gap>)
//     gap   for a <gap> with no restored text: its length in letters
//     j     this token and the next are one word (split by a line break or
//           by a lacuna boundary)
//     corr  a later hand's reading of this token (<app><rdg type="corr">)
//
// The markup this handles (INTF/IGNTP transcription guidelines, as served by
// api/transcript/get/?format=teiraw):
//   <pb n="1r"/> <cb n="P1rC1-P66"/> <lb n="P1rC1L2-P66" break="no"/>
//   <div type="book" n="B04"><div type="chapter" n="B04K1"><ab n="B04K1V1">
//   <w>εν</w> <w><abbr type="nomSac"><hi rend="overline">θς</hi></abbr></w>
//   <gap reason="lacuna" unit="char" extent="12"/> <supplied reason="lacuna">…</supplied>
//   <app><rdg type="orig" hand="firsthand">…</rdg><rdg type="corr" hand="corrector1">…</rdg></app>
//   <pc>·</pc> <note>…</note> <fw>…</fw> <ex>…</ex>
// Only <text> is read; the teiHeader never reaches the tokens.

const NT_BOOK_ORDER = [
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL',
  '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
// Control characters: one NTVMR page came back with binary bytes in its text.
const decode = (s) =>
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffd]/g, '').replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e] ?? m,
  );

/** XML events: { type: 'open'|'close'|'text', name, attrs }. Skips PIs, comments and doctype; CDATA is text. */
export function* xmlEvents(xml) {
  let i = 0;
  const n = xml.length;
  while (i < n) {
    const lt = xml.indexOf('<', i);
    if (lt < 0) {
      yield { type: 'text', text: decode(xml.slice(i)) };
      break;
    }
    if (lt > i) yield { type: 'text', text: decode(xml.slice(i, lt)) };
    if (xml.startsWith('<!--', lt)) {
      const e = xml.indexOf('-->', lt + 4);
      i = e < 0 ? n : e + 3;
    } else if (xml.startsWith('<![CDATA[', lt)) {
      const e = xml.indexOf(']]>', lt + 9);
      yield { type: 'text', text: xml.slice(lt + 9, e < 0 ? n : e) };
      i = e < 0 ? n : e + 3;
    } else if (xml[lt + 1] === '?' || xml[lt + 1] === '!') {
      const e = xml.indexOf('>', lt);
      i = e < 0 ? n : e + 1;
    } else {
      // Find the tag's end, skipping '>' inside quoted attribute values.
      let j = lt + 1;
      let q = null;
      for (; j < n; j++) {
        const c = xml[j];
        if (q) {
          if (c === q) q = null;
        } else if (c === '"' || c === "'") q = c;
        else if (c === '>') break;
      }
      const body = xml.slice(lt + 1, j);
      i = j + 1;
      if (body[0] === '/') {
        yield { type: 'close', name: local(body.slice(1).trim()) };
        continue;
      }
      const self = body.endsWith('/');
      const m = /^([^\s/>]+)/.exec(body);
      if (!m) continue;
      const attrs = {};
      const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let a;
      while ((a = re.exec(body.slice(m[1].length)))) attrs[local(a[1])] = decode(a[2] ?? a[3]);
      const name = local(m[1]);
      yield { type: 'open', name, attrs };
      if (self) yield { type: 'close', name };
    }
  }
}
const local = (s) => s.replace(/^.*:/, '').toLowerCase();

// Nomina sacra: contracted form (letters only, lower case, final sigma folded)
// -> the full word. The contraction keeps the first letter(s) and the case
// ending, so the table lists the forms per lemma.
const nsKey = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/[^\p{L}]/gu, '');
const NS = {};
function nsAdd(full, ...forms) {
  for (const f of forms) NS[nsKey(f)] ??= nsKey(full);
}
// 2nd declension: stem letters + ending
for (const [stems, full] of [
  [['θ'], 'θε'],
  [['κ'], 'κυρι'],
  [['χ', 'χρ'], 'χριστ'],
  [['υ', 'υι'], 'υι'],
  [['ανθρωπ', 'αν', 'ανν', 'ανθ'], 'ανθρωπ'],
  [['ουραν', 'ουν', 'ουρν', 'ουρ'], 'ουραν'],
  [['στρ', 'στ', 'σταυρ'], 'σταυρ'],
]) {
  for (const s of stems)
    for (const e of ['ος', 'ου', 'ω', 'ον', 'ε', 'οι', 'ων', 'οις', 'ους']) nsAdd(full + e, s + (e.length > 1 && s.length === 1 ? e.slice(-1) : e), s + e);
}
// Ιησους
for (const [f, e] of [['ιησουσ', ['ισ', 'ιησ', 'ιηισ']], ['ιησου', ['ιυ', 'ιηυ', 'ιησυ']], ['ιησοι', []], ['ιησουν', ['ιν', 'ιην', 'ιησν']]]) nsAdd(f, ...e);
nsAdd('ιησου', 'ιω'); // dative written with iota adscript omitted
// πνευμα
for (const [f, e] of [['πνευμα', ['πνα', 'πνμα']], ['πνευματοσ', ['πνσ', 'πνοσ', 'πνατοσ', 'πνματοσ']], ['πνευματι', ['πνι', 'πνατι', 'πνματι']], ['πνευματα', ['πνατα']], ['πνευματων', ['πνατων', 'πνων']], ['πνευματικοσ', ['πνικοσ']]]) nsAdd(f, ...e);
// πατηρ
for (const [f, e] of [['πατηρ', ['πηρ', 'πρ']], ['πατροσ', ['πρσ', 'προσ']], ['πατρι', ['πρι']], ['πατερα', ['πρα']], ['πατερ', ['περ']], ['πατερεσ', ['πρεσ']], ['πατερων', ['πρων']], ['πατρασιν', ['πρασιν']]]) nsAdd(f, ...e);
// μητηρ, σωτηρ, Δαυιδ, Ισραηλ, Ιερουσαλημ
for (const [f, e] of [['μητηρ', ['μηρ']], ['μητροσ', ['μρσ', 'μητρσ']], ['μητρι', ['μρι']], ['μητερα', ['μρα']], ['σωτηρ', ['σηρ', 'σωρ']], ['σωτηροσ', ['σηρσ', 'σρσ']], ['σωτηρα', ['σρα']], ['δαυιδ', ['δαδ', 'δδ']], ['ισραηλ', ['ιηλ', 'ισλ', 'ιηλ']], ['ισραηλιται', ['ιηλιται']], ['ιερουσαλημ', ['ιλημ', 'ιλμ', 'ιερουσλημ']]]) nsAdd(f, ...e);
// σταυροω
for (const [f, e] of [['σταυρωθη', ['στρωθη']], ['σταυρωσον', ['στρωσον']], ['σταυρωσω', ['στρωσω']], ['σταυρωθηναι', ['στρωθηναι']], ['εσταυρωσαν', ['εστρωσαν']], ['σταυρωσωσιν', ['στρωσωσιν']], ['εσταυρωθη', ['εστρωθη']]]) nsAdd(f, ...e);

/** The full form of a contracted sacred name, or the contraction itself when it is not in the table. */
export function expandNomenSacrum(s) {
  const k = nsKey(s);
  return (NS[k] ?? k).replace(/σ$/, 'ς');
}

function verseFromAb(n) {
  const m = /B(\d{1,2})K(\d{1,3})V(\d{1,3})/i.exec(n || '');
  if (!m) return null;
  const book = NT_BOOK_ORDER[parseInt(m[1], 10) - 1];
  return book ? `${book}.${parseInt(m[2], 10)}.${parseInt(m[3], 10)}` : null;
}

function lineNumber(n) {
  const m = /L(\d+)/.exec(n || '') ?? /^(\d+)$/.exec(n || '');
  return m ? parseInt(m[1], 10) : null;
}

/** "P104r-P66" / "104r" / "1303" -> "104r" / "1303". */
function folioLabel(n) {
  if (!n) return null;
  return n.replace(/-[^-]*$/, (m) => (/^-\d+[rv]?$/.test(m) ? m : '')).replace(/^P(?=\d)/, '');
}

// Elements whose text is not part of the running text of the page.
const SKIP = new Set(['teiheader', 'note', 'fw', 'ex', 'pc', 'space', 'certainty', 'desc', 'expan']);

/** The <text> element of a TEI document (the header is dropped). */
export function teiBody(xml) {
  const a = xml.search(/<text[\s>]/);
  const b = xml.lastIndexOf('</text>');
  return a >= 0 && b > a ? xml.slice(a, b + 7) : xml;
}

export function parseTEIPage(xml, { ga, pageId, folio = null }) {
  const columns = [];
  let col = null;
  let line = null;
  let verse = null;
  let pbFolio = null;
  let inText = !/<text[\s>]/.test(xml); // no <text> element: read the whole document
  let skip = 0;
  let lac = 0; // inside <supplied>
  let word = null; // { frags: [token], ns: bool } while inside <w>
  let frag = null; // the fragment being written: { orig, corr, lac }
  // <app>: the first hand's reading is written to the page, a corrector's
  // reading is kept alongside. rdg: 'orig' | 'corr' | 'other'.
  let app = null; // { inWord, rdg, hand, origStart, origWords: [[token]], corrText, corrWords: [] }

  const newLine = (n) => {
    if (!col) {
      col = { lines: [] };
      columns.push(col);
    }
    line = { n: n ?? col.lines.length + 1, tokens: [] };
    col.lines.push(line);
  };
  const place = (tok) => {
    if (!line) newLine();
    line.tokens.push(tok);
    return tok;
  };

  // Close the current fragment into a token on the current line.
  function flushFrag() {
    if (!frag || (!frag.orig && !frag.corr)) {
      frag = null;
      return;
    }
    const tok = { t: frag.orig };
    if (verse) tok.v = verse;
    if (frag.lac) tok.lac = true;
    if (frag.corr !== frag.orig) tok.corr = { hand: frag.hand ?? 'corrector', t: frag.corr };
    place(tok);
    if (word) word.frags.push(tok);
    frag = null;
  }
  function fragFor() {
    if (frag && frag.lac !== lac > 0) flushFrag();
    frag ??= { orig: '', corr: '', lac: lac > 0, hand: null };
    return frag;
  }
  function addText(s) {
    if (!s) return;
    if (app) {
      // A corrector's letters or words are kept aside until </app>.
      if (app.rdg === 'corr') app.corrText += s;
      if (app.rdg !== 'orig') return;
    }
    if (word) {
      const f = fragFor();
      f.orig += s;
      // Inside a word, a corrector's letters replace these at </app>; whole
      // words are paired with the corrector's words at </app> instead.
      if (!app || !app.inWord) f.corr += s;
      return;
    }
    // Loose text outside <w>: split on spaces (transcriptions without word markup).
    for (const part of s.split(/(\s+)/)) {
      if (!part.trim()) continue;
      startWord();
      addText(part);
      endWord();
    }
  }
  function startWord() {
    flushFrag();
    word = { frags: [], ns: false };
  }
  function endWord() {
    flushFrag();
    const w = word;
    word = null;
    if (!w || !w.frags.length) return;
    for (let i = 0; i < w.frags.length - 1; i++) w.frags[i].j = 1;
    if (w.ns) {
      const full = expandNomenSacrum(w.frags.map((f) => f.t).join(''));
      for (const f of w.frags) f.ns = full;
    }
    if (app && !app.inWord && app.rdg === 'orig') app.origWords.push(w.frags);
  }
  function lineBreak(attrs) {
    // Inside a word the break splits it: the part so far stays on this line.
    flushFrag();
    newLine(lineNumber(attrs.n) ?? undefined);
  }

  for (const ev of xmlEvents(xml)) {
    if (ev.type === 'text') {
      if (!inText || skip) continue;
      // Inside a word, whitespace is layout, not a word break.
      addText(word ? ev.text.replace(/\s+/g, '') : ev.text);
      continue;
    }
    const { name } = ev;
    if (ev.type === 'open') {
      if (name === 'text') inText = true;
      if (!inText) continue;
      if (skip || SKIP.has(name)) {
        skip++;
        continue;
      }
      // Structure written only by the first hand counts; a corrector's line
      // breaks and the like (inside <rdg type="corr">) do not move the page.
      const structural = !app || app.rdg === 'orig';
      switch (name) {
        case 'pb':
          if (structural) pbFolio = ev.attrs.n || pbFolio;
          break;
        case 'cb':
          if (!structural) break;
          flushFrag();
          col = { lines: [] };
          columns.push(col);
          line = null;
          break;
        case 'lb':
          if (structural) lineBreak(ev.attrs);
          break;
        case 'ab': {
          const v = verseFromAb(ev.attrs.n);
          if (v) verse = v;
          break;
        }
        case 'w':
          if (app && !app.inWord && app.rdg !== 'orig') {
            if (app.rdg === 'corr') app.corrText += ' ';
            break;
          }
          startWord();
          break;
        case 'abbr':
          if (/nomsac/i.test(ev.attrs.type || '') && word) word.ns = true;
          break;
        case 'supplied':
          flushFrag();
          lac++;
          break;
        case 'gap': {
          if (app && app.rdg !== 'orig') break;
          const ext = parseInt(ev.attrs.extent, 10);
          const unit = ev.attrs.unit || 'char';
          const len = Number.isFinite(ext) ? (unit === 'line' ? ext * 18 : unit === 'word' ? ext * 5 : unit === 'char' ? ext : 6) : 6;
          flushFrag();
          const tok = { t: '', lac: true, gap: Math.min(len, 400) };
          if (verse) tok.v = verse;
          place(tok);
          if (word) word.frags.push(tok);
          break;
        }
        case 'app':
          if (!word) flushFrag();
          app = { inWord: !!word, rdg: 'other', hand: null, origWords: [], corrText: '' };
          break;
        case 'rdg': {
          if (!app) break;
          if (!app.inWord) flushFrag();
          const type = (ev.attrs.type || '').toLowerCase();
          const hand = ev.attrs.hand || '';
          if (type === 'orig' || /^firsthand$/i.test(hand)) app.rdg = 'orig';
          else if (type === 'corr') {
            // Later correctors overwrite earlier ones: the corrected view shows the final state.
            app.rdg = 'corr';
            app.hand = hand || 'corrector';
            app.corrText = '';
          } else app.rdg = 'other';
          break;
        }
        default:
          break;
      }
    } else {
      if (!inText) continue;
      if (name === 'text') {
        inText = false;
        continue;
      }
      if (skip) {
        skip--;
        continue;
      }
      switch (name) {
        case 'w':
          if (app && !app.inWord && app.rdg !== 'orig') break;
          endWord();
          break;
        case 'supplied':
          flushFrag();
          lac = Math.max(0, lac - 1);
          break;
        case 'rdg':
          if (app) {
            if (!app.inWord) flushFrag();
            app.rdg = 'other';
          }
          break;
        case 'app': {
          const a = app;
          app = null;
          if (!a) break;
          if (a.inWord) {
            // Inside a word: the corrector's letters take the place of the first hand's.
            if (a.hand) {
              const f = fragFor();
              f.corr += a.corrText.replace(/\s+/g, '');
              f.hand = a.hand;
            } else if (frag) frag.corr = frag.orig;
            break;
          }
          flushFrag();
          if (!a.hand) break;
          // Pair the corrector's words with the first hand's, word by word.
          const corrWords = a.corrText.split(/\s+/).filter(Boolean);
          const orig = a.origWords;
          if (!orig.length) {
            if (!corrWords.length) break;
            // An addition by the corrector: an empty first-hand token.
            const tok = { t: '', corr: { hand: a.hand, t: corrWords.join(' ') } };
            if (verse) tok.v = verse;
            place(tok);
            break;
          }
          const same = orig.length === corrWords.length;
          orig.forEach((frags, i) => {
            const text = same ? corrWords[i] : i === 0 ? corrWords.join(' ') : '';
            const first = frags.map((f) => f.t).join('');
            if (same && text === first) return;
            frags.forEach((f, k) => (f.corr = { hand: a.hand, t: k === 0 ? text : '' }));
          });
          break;
        }
        default:
          break;
      }
    }
  }
  if (word) endWord();
  flushFrag();

  // Drop empty lines at the end of each column and empty columns.
  const cols = columns
    .map((c) => {
      const lines = c.lines.slice();
      while (lines.length && !lines[lines.length - 1].tokens.length) lines.pop();
      return { lines };
    })
    .filter((c) => c.lines.some((l) => l.tokens.length));
  return { ga, pageId, folio: folioLabel(pbFolio) ?? folio ?? null, columns: cols };
}
