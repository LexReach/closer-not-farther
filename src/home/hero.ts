// Opening frame: a self-running miniature of Module 1, drawn on canvas with the
// real simulator. One chain descends on the left, a tree fans out on the
// right, most copies are lost, then both are reconstructed by majority vote:
// the tree heals to 100% while the chain keeps its inherited errors.
// Deterministic (fixed seed); loops every ~12 s; reduced motion gets one still.
import { reconstruct, runChain, runTree, type Copy, type Params, type Reconstruction } from '../modules/telephone/sim';
import { sourceText } from '../data';
import { reducedMotion } from '../lib/dom';

export const HERO_PARAMS: Params = {
  seed: 4,
  errorRate: 0.035,
  mix: { spelling: 0.6, omission: 0.2, harmonization: 0.12, gloss: 0.08 },
  loss: 0.5,
  chainN: 16,
  treeK: 3,
  treeDepth: 4,
  regions: 5,
};

const LOOP = 12000;
// Phase boundaries (ms).
const T_SOURCE = 700;
const T_COPY_END = 6200;
const T_LOSS_END = 7300;
const T_RECON = 7600;
const T_RECON_END = 10200;
const T_FADE = 11300;

interface Colors {
  bg: string;
  ink: string;
  muted: string;
  rule: string;
  accent: string;
  err: string;
  ok: string;
  surface: string;
}

function readColors(el: Element): Colors {
  const cs = getComputedStyle(el);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return { bg: v('--bg'), ink: v('--ink'), muted: v('--muted'), rule: v('--rule'), accent: v('--accent'), err: v('--accent-2'), ok: v('--success'), surface: v('--surface') };
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export interface HeroApi {
  el: HTMLElement;
  destroy(): void;
}

export function Hero(): HeroApi {
  const tokens = sourceText.tokens;
  const chain = runChain(tokens, HERO_PARAMS);
  const tree = runTree(tokens, HERO_PARAMS);
  const rc = reconstruct(chain, tokens);
  const rt = reconstruct(tree, tokens);
  const n = tokens.length;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    `Animation: John 1:1–5 is copied ${chain.length} times in a single chain and ${tree.length} times in a branching tree. Half the copies are lost. A majority vote over the survivors recovers ${Math.round(rc.pct * 100)}% of the words from the chain and ${Math.round(rt.pct * 100)}% from the tree.`,
  );
  const wrap = document.createElement('div');
  wrap.className = 'hero-stage';
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let colors = readColors(wrap);
  let raf = 0;
  let start = performance.now();
  let inView = true;
  let running = false;
  let pausedAt: number | null = null;

  // Tree layout: generations fan out to the right of the source.
  interface NodePos { x: number; y: number; c: Copy; }
  let treePos: NodePos[] = [];
  let chainPos: { x: number; y: number; w: number; h: number; c: Copy }[] = [];
  let src = { x: 0, y: 0 };

  function layout() {
    const r = wrap.getBoundingClientRect();
    W = Math.max(300, r.width);
    H = Math.max(320, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const narrow = W < 640;
    src = { x: narrow ? W * 0.5 : W * 0.34, y: narrow ? 34 : H * 0.14 };
    // Chain: a column of tiles descending on the left.
    const chainX = narrow ? 12 : W * 0.04;
    const chainW = narrow ? W * 0.36 : W * 0.22;
    const top = narrow ? 92 : H * 0.28;
    const bottom = H - (narrow ? 70 : 64);
    const step = (bottom - top) / chain.length;
    chainPos = chain.map((c, i) => ({ x: chainX, y: top + i * step, w: chainW, h: Math.max(3, step * 0.6), c }));
    // Tree: columns to the right.
    const depth = HERO_PARAMS.treeDepth;
    const x0 = narrow ? W * 0.5 : W * 0.42;
    const x1 = W - (narrow ? 14 : W * 0.04);
    const byDepth: Copy[][] = Array.from({ length: depth }, () => []);
    for (const c of tree) byDepth[c.depth - 1].push(c);
    treePos = [];
    const ty0 = narrow ? 92 : H * 0.26;
    const ty1 = H - (narrow ? 70 : 64);
    byDepth.forEach((gen, d) => {
      const x = x0 + ((d + 1) / depth) * (x1 - x0);
      gen.forEach((c, i) => treePos.push({ x, y: ty0 + ((i + 0.5) / gen.length) * (ty1 - ty0), c }));
    });
  }

  const nodeAt = new Map<number, NodePos>();

  function drawStrip(x: number, y: number, w: number, h: number, cells: (0 | 1 | 2)[], alpha: number, heal = 0) {
    // 0 = matches, 1 = wrong, 2 = unresolved
    const cw = w / cells.length;
    for (let i = 0; i < cells.length; i++) {
      const bad = cells[i] !== 0;
      ctx.globalAlpha = alpha * (bad ? 1 - heal * 0 : 0.55);
      ctx.fillStyle = bad ? colors.err : colors.rule;
      ctx.fillRect(x + i * cw, y, Math.max(0.6, cw - 0.5), h);
    }
    ctx.globalAlpha = 1;
  }

  function copyCells(c: Copy): (0 | 1)[] {
    return c.slots.map((s, i) => (s.gk !== tokens[i].gk || s.ins ? 1 : 0));
  }

  function reconCells(r: Reconstruction): (0 | 1 | 2)[] {
    return r.text.map((t, i) => (t === null ? 2 : t.gk === tokens[i].gk && t.ins === null ? 0 : 1));
  }

  function frame(now: number) {
    const t = reducedMotion() ? T_RECON_END + 400 : (now - start) % LOOP;
    const fadeAll = t > T_FADE ? 1 - clamp01((t - T_FADE) / (LOOP - T_FADE)) : 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    const narrow = W < 640;

    // Source text.
    const a0 = ease(t / T_SOURCE) * fadeAll;
    ctx.globalAlpha = a0;
    ctx.fillStyle = colors.ink;
    ctx.textAlign = 'center';
    ctx.font = `${narrow ? 18 : 24}px "Noto Serif", serif`;
    ctx.fillText('Ἐν ἀρχῇ ἦν ὁ λόγος', src.x, src.y);
    ctx.font = `500 ${narrow ? 10.5 : 11.5}px "IBM Plex Sans", sans-serif`;
    ctx.fillStyle = colors.muted;
    ctx.fillText('THE SOURCE · JOHN 1:1–5 · LOST', src.x, src.y + (narrow ? 18 : 22));
    ctx.globalAlpha = 1;

    const copyT = clamp01((t - T_SOURCE) / (T_COPY_END - T_SOURCE));
    const lossT = clamp01((t - T_COPY_END) / (T_LOSS_END - T_COPY_END));

    // Labels.
    ctx.globalAlpha = ease(copyT * 4) * fadeAll;
    ctx.font = `600 ${narrow ? 11 : 12.5}px "IBM Plex Sans", sans-serif`;
    ctx.fillStyle = colors.ink;
    ctx.textAlign = 'left';
    const cp0 = chainPos[0];
    ctx.fillText('ONE CHAIN', cp0.x, cp0.y - 12);
    ctx.fillText('A TREE', treePos[0].x - 30, (treePos[0]?.y ?? 0) - 18 < 0 ? 12 : chainPos[0].y - 12);
    ctx.globalAlpha = 1;

    // Chain: tiles appear one by one.
    chainPos.forEach((p, i) => {
      const appear = clamp01(copyT * chain.length - i);
      if (appear <= 0) return;
      const lost = p.c.lost ? ease(lossT) : 0;
      const alpha = ease(appear) * (1 - 0.8 * lost) * fadeAll;
      // connector
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = colors.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const prevY = i === 0 ? src.y + 30 : chainPos[i - 1].y + chainPos[i - 1].h;
      const prevX = i === 0 ? src.x : p.x + 4;
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(p.x + 4, p.y);
      ctx.stroke();
      drawStrip(p.x + 8, p.y, p.w, p.h, copyCells(p.c), alpha);
    });

    // Tree: links then nodes, generation by generation.
    const depth = HERO_PARAMS.treeDepth;
    nodeAt.clear();
    for (const p of treePos) nodeAt.set(p.c.id, p);
    for (const p of treePos) {
      const g = p.c.depth;
      const appear = clamp01(copyT * depth - (g - 1));
      if (appear <= 0) continue;
      const par = p.c.parent >= 0 ? nodeAt.get(p.c.parent)! : { x: src.x + (narrow ? 0 : 90), y: src.y + (narrow ? 26 : 0) };
      const lost = p.c.lost ? ease(lossT) : 0;
      const a = ease(appear) * fadeAll;
      ctx.globalAlpha = a * 0.35 * (1 - 0.6 * lost);
      ctx.strokeStyle = colors.muted;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(par.x, par.y);
      const mx = (par.x + p.x) / 2;
      ctx.bezierCurveTo(mx, par.y, mx, p.y, p.x, p.y);
      ctx.stroke();
    }
    for (const p of treePos) {
      const g = p.c.depth;
      const appear = clamp01(copyT * depth - (g - 1));
      if (appear <= 0) continue;
      const lost = p.c.lost ? ease(lossT) : 0;
      const a = ease(appear) * (1 - 0.82 * lost) * fadeAll;
      const r = g === depth ? (narrow ? 2 : 2.6) : narrow ? 3 : 3.8;
      ctx.globalAlpha = a;
      ctx.fillStyle = colors.surface;
      ctx.strokeStyle = colors.muted;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (p.c.diffs > 0) {
        // Sienna fleck, stronger with more changes.
        ctx.fillStyle = colors.err;
        ctx.globalAlpha = a * Math.min(1, 0.35 + p.c.diffs * 0.18);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Reconstruction.
    const recT = clamp01((t - T_RECON) / (T_RECON_END - T_RECON));
    if (recT > 0) {
      const a = ease(Math.min(1, recT * 3)) * fadeAll;
      const yb = H - (narrow ? 44 : 40);
      const cw = chainPos[0].w;
      const cx = chainPos[0].x + 8;
      // Chain result: votes settle into its inherited errors.
      drawStrip(cx, yb, cw, narrow ? 7 : 9, reconCells(rc), a);
      // Tree result: starts with the union of visible flecks, heals to the vote.
      const tx = treePos[0].x;
      const tw = W - (narrow ? 14 : W * 0.04) - tx;
      const heal = ease(clamp01((recT - 0.15) / 0.7));
      const union = new Array(n).fill(0) as (0 | 1)[];
      for (const c of tree) if (!c.lost) c.slots.forEach((s, i) => { if (s.gk !== tokens[i].gk || s.ins) union[i] = 1; });
      const cw2 = tw / n;
      for (let i = 0; i < n; i++) {
        const bad = union[i] === 1 && reconCells(rt)[i] === 0 ? 1 - heal : reconCells(rt)[i] ? 1 : 0;
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = colors.rule;
        ctx.fillRect(tx + i * cw2, yb, Math.max(0.6, cw2 - 0.5), narrow ? 7 : 9);
        if (bad > 0) {
          ctx.globalAlpha = a * bad;
          ctx.fillStyle = colors.err;
          ctx.fillRect(tx + i * cw2, yb, Math.max(0.6, cw2 - 0.5), narrow ? 7 : 9);
        }
      }
      // Counters.
      const count = ease(clamp01((recT - 0.1) / 0.8));
      ctx.globalAlpha = a;
      ctx.textAlign = 'left';
      ctx.font = `600 ${narrow ? 15 : 20}px "IBM Plex Sans", sans-serif`;
      ctx.fillStyle = colors.err;
      ctx.fillText(`${Math.round(rc.pct * 100 * count)}% recovered`, cx, yb + (narrow ? 26 : 32));
      ctx.fillStyle = colors.ok;
      ctx.fillText(`${Math.round(rt.pct * 100 * count)}% recovered`, tx, yb + (narrow ? 26 : 32));
      ctx.font = `500 ${narrow ? 10 : 11}px "IBM Plex Sans", sans-serif`;
      ctx.fillStyle = colors.muted;
      ctx.fillText('MAJORITY VOTE OF SURVIVORS', cx, yb - 6);
      ctx.fillText('MAJORITY VOTE OF SURVIVORS', tx, yb - 6);
      ctx.globalAlpha = 1;
    }
    if (!reducedMotion() && inView && !document.hidden) raf = requestAnimationFrame(frame);
    else {
      running = false;
      pausedAt = performance.now();
    }
  }

  const ensureRunning = () => {
    if (running) return;
    if (pausedAt !== null) start += performance.now() - pausedAt;
    pausedAt = null;
    running = true;
    raf = requestAnimationFrame(frame);
  };
  /** Redraw now (resize, fonts, scheme) and keep running if allowed. */
  const kick = () => {
    if (running) return;
    ensureRunning();
  };

  const ro = new ResizeObserver(() => {
    layout();
    if (!running) frame(performance.now());
    kick();
  });
  ro.observe(wrap);
  const io = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    if (inView) ensureRunning();
  });
  const onVis = () => {
    if (!document.hidden && inView) ensureRunning();
  };
  document.addEventListener('visibilitychange', onVis);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onScheme = () => {
    colors = readColors(wrap);
    kick();
  };
  mq.addEventListener('change', onScheme);
  requestAnimationFrame(() => {
    colors = readColors(wrap);
    layout();
    start = performance.now();
    io.observe(wrap);
    kick();
  });
  // Fonts load after first paint; redraw once they are ready.
  document.fonts?.ready.then(() => kick());

  return {
    el: wrap,
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      mq.removeEventListener('change', onScheme);
    },
  };
}
