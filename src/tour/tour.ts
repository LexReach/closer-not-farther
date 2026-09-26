// Guided tour: plays the argument through the real modules. It navigates,
// moves the actual controls (sliders animate, toggles flip, buttons press) and
// shows the narration from data/tour.json in a caption card. Pause/resume,
// skip chapter, optional voice (Web Speech API, off by default).
// ?tour=1 starts it on load; &film=1 is the recording layout used by
// scripts/render-film.mjs (larger captions, no controls, no voice).
import './tour.css';
import { h, reducedMotion } from '../lib/dom';
import { navigate } from '../lib/nav';
import tour from '../../data/tour.json';

type Action =
  | { do: 'scrollTop' }
  | { do: 'scroll'; selector: string }
  | { do: 'slider'; label: string; to: number; ms?: number }
  | { do: 'click'; selector?: string; text?: string }
  | { do: 'toggle'; label: string; value: string }
  | { do: 'hoverSeq'; selector: string; from: number; to: number; every: number }
  | { do: 'key'; selector: string; key: string }
  | { do: 'wait'; ms: number };

interface Step {
  caption: string;
  ms: number;
  actions?: Action[];
}
interface TourChapter {
  id: string;
  title: string;
  route: string;
  steps: Step[];
}

const chapters = tour.chapters as TourChapter[];

let active: Tour | null = null;

export function startTour(opts: { film?: boolean } = {}) {
  active?.stop();
  active = new Tour(opts.film ?? false);
  active.run();
}

declare global {
  interface Window {
    __tour?: { done: boolean; marks: { id: string; t: number }[] };
  }
}

class Tour {
  private paused = false;
  private stopped = false;
  private skip = false;
  private voice = false;
  private card: HTMLElement;
  private caption: HTMLElement;
  private chapterLabel: HTMLElement;
  private rail: HTMLElement;
  private pauseBtn: HTMLButtonElement;
  private voiceBtn: HTMLButtonElement;
  private resumeWaiters: (() => void)[] = [];
  private t0 = performance.now();

  constructor(film: boolean) {
    this.caption = h('p', { class: 'tour__caption', 'aria-live': 'polite' });
    this.chapterLabel = h('p', { class: 'tour__chapter' });
    this.rail = h(
      'div',
      { class: 'tour__rail', 'aria-hidden': 'true' },
      chapters.map(() => h('span', { class: 'tour__seg' }, h('span', { class: 'tour__fill' }))),
    );
    this.pauseBtn = h('button', { type: 'button', class: 'tour__btn' }, 'Pause');
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    const skipBtn = h('button', { type: 'button', class: 'tour__btn' }, 'Skip chapter');
    skipBtn.addEventListener('click', () => {
      this.skip = true;
      if (this.paused) this.togglePause();
    });
    this.voiceBtn = h('button', { type: 'button', class: 'tour__btn', 'aria-pressed': 'false', hidden: !('speechSynthesis' in window) }, 'Voice: off');
    this.voiceBtn.addEventListener('click', () => {
      this.voice = !this.voice;
      this.voiceBtn.setAttribute('aria-pressed', String(this.voice));
      this.voiceBtn.textContent = `Voice: ${this.voice ? 'on' : 'off'}`;
      if (this.voice) this.speak(this.caption.textContent ?? '');
      else speechSynthesis.cancel();
    });
    const exitBtn = h('button', { type: 'button', class: 'tour__btn tour__btn--exit', 'aria-label': 'End the tour' }, 'End');
    exitBtn.addEventListener('click', () => this.stop());
    this.card = h(
      'div',
      { class: `tour ${film ? 'tour--film' : ''}`, role: 'region', 'aria-label': 'Guided tour' },
      h('div', { class: 'tour__top' }, this.chapterLabel, film ? '' : h('div', { class: 'tour__controls' }, this.pauseBtn, skipBtn, this.voiceBtn, exitBtn)),
      this.caption,
      this.rail,
    );
    document.body.appendChild(this.card);
    document.body.classList.add('is-touring');
    window.__tour = { done: false, marks: [] };
    this.onKey = this.onKey.bind(this);
    document.addEventListener('keydown', this.onKey);
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') this.stop();
    else if (e.key === ' ' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      this.togglePause();
    }
  }

  private togglePause() {
    this.paused = !this.paused;
    this.pauseBtn.textContent = this.paused ? 'Resume' : 'Pause';
    this.card.classList.toggle('is-paused', this.paused);
    if (!this.paused) {
      this.resumeWaiters.splice(0).forEach((f) => f());
      if (this.voice) speechSynthesis.resume();
    } else if (this.voice) speechSynthesis.pause();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.resumeWaiters.splice(0).forEach((f) => f());
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    document.removeEventListener('keydown', this.onKey);
    this.card.remove();
    document.body.classList.remove('is-touring');
    if (window.__tour) window.__tour.done = true;
    if (active === this) active = null;
  }

  private speak(text: string) {
    if (!this.voice || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    speechSynthesis.speak(u);
  }

  /** Wait `ms` of unpaused time; resolves early on skip or stop. */
  private async sleep(ms: number) {
    let left = ms;
    while (left > 0 && !this.stopped && !this.skip) {
      if (this.paused) {
        await new Promise<void>((r) => this.resumeWaiters.push(r));
        continue;
      }
      const slice = Math.min(100, left);
      await new Promise((r) => setTimeout(r, slice));
      left -= slice;
    }
  }

  private async waitFor<T extends Element>(selector: string, timeout = 6000): Promise<T | null> {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) {
      const el = document.querySelector<T>(selector);
      if (el) return el;
      await new Promise((r) => setTimeout(r, 80));
    }
    return null;
  }

  private setProgress(ci: number, frac: number) {
    this.rail.querySelectorAll<HTMLElement>('.tour__fill').forEach((f, i) => {
      f.style.transform = `scaleX(${i < ci ? 1 : i === ci ? frac : 0})`;
    });
  }

  async run() {
    for (let ci = 0; ci < chapters.length && !this.stopped; ci++) {
      const ch = chapters[ci];
      this.skip = false;
      window.__tour?.marks.push({ id: ch.id, t: performance.now() - this.t0 });
      this.chapterLabel.textContent = `${ci + 1} of ${chapters.length} · ${ch.title}`;
      navigate(ch.route);
      await this.waitFor('#main .page > *');
      await this.sleep(500);
      const total = ch.steps.reduce((s, x) => s + x.ms, 0);
      let done = 0;
      for (const step of ch.steps) {
        if (this.stopped || this.skip) break;
        this.caption.textContent = step.caption;
        this.caption.classList.remove('is-in');
        void this.caption.offsetWidth;
        this.caption.classList.add('is-in');
        this.speak(step.caption);
        const actions = this.runActions(step.actions ?? []);
        const t = performance.now();
        const tick = window.setInterval(() => this.setProgress(ci, Math.min(1, (done + (performance.now() - t)) / total)), 200);
        await this.sleep(step.ms);
        window.clearInterval(tick);
        await actions;
        done += step.ms;
        this.setProgress(ci, done / total);
      }
    }
    if (!this.stopped) {
      this.caption.textContent = 'That is the argument. Explore any chapter, or read what skeptics say.';
      await this.sleep(3500);
      this.stop();
    }
  }

  private async runActions(actions: Action[]) {
    for (const a of actions) {
      if (this.stopped || this.skip) return;
      try {
        await this.act(a);
      } catch {
        /* a missing control should never break the tour */
      }
    }
  }

  private findByText(text: string): HTMLElement | null {
    const els = document.querySelectorAll<HTMLElement>('#main button, #main a, #main [role="button"]');
    for (const el of els) if (el.textContent?.replace(/\s+/g, ' ').trim() === text) return el;
    return null;
  }

  private scrollTo(el: Element) {
    el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  }

  private async act(a: Action) {
    switch (a.do) {
      case 'wait':
        return this.sleep(a.ms);
      case 'scrollTop':
        window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
        return;
      case 'scroll': {
        const el = await this.waitFor(a.selector);
        if (el) this.scrollTo(el);
        return;
      }
      case 'click': {
        const t0 = performance.now();
        let el: HTMLElement | null = null;
        while (!el && performance.now() - t0 < 4000) {
          el = a.selector ? document.querySelector<HTMLElement>(a.selector) : this.findByText(a.text ?? '');
          if (!el) await new Promise((r) => setTimeout(r, 100));
        }
        if (!el) return;
        el.classList.add('tour-press');
        el.click();
        window.setTimeout(() => el?.classList.remove('tour-press'), 500);
        return;
      }
      case 'toggle': {
        const fs = [...document.querySelectorAll<HTMLFieldSetElement>('#main fieldset')].find((f) => f.querySelector('legend')?.textContent?.trim() === a.label);
        const input = fs?.querySelector<HTMLInputElement>(`input[value="${a.value}"]`);
        if (input && !input.checked) {
          input.click();
          fs?.classList.add('tour-press');
          window.setTimeout(() => fs?.classList.remove('tour-press'), 600);
        }
        return;
      }
      case 'slider': {
        const wrap = [...document.querySelectorAll<HTMLElement>('#main .slider')].find((s) => s.querySelector('.slider__label')?.textContent?.trim() === a.label);
        const input = wrap?.querySelector<HTMLInputElement>('input[type="range"]');
        if (!input) return;
        this.scrollTo(wrap!);
        wrap!.classList.add('tour-press');
        const from = Number(input.value);
        const step = Number(input.step) || 1;
        const dur = reducedMotion() ? 0 : a.ms ?? 1200;
        let elapsed = 0;
        let last = from;
        while (elapsed < dur && !this.stopped && !this.skip) {
          if (this.paused) {
            await new Promise<void>((r) => this.resumeWaiters.push(r));
            continue;
          }
          await new Promise((r) => requestAnimationFrame(r));
          elapsed += 16.7;
          const k = Math.min(1, elapsed / dur);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const v = Math.round((from + (a.to - from) * e) / step) * step;
          if (v !== last) {
            input.value = String(v);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            last = v;
          }
        }
        input.value = String(a.to);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        wrap!.classList.remove('tour-press');
        return;
      }
      case 'hoverSeq': {
        await this.waitFor(a.selector);
        const els = [...document.querySelectorAll<HTMLElement>(a.selector)];
        for (let i = a.from; i <= Math.min(a.to, els.length - 1) && !this.stopped && !this.skip; i++) {
          if (i > a.from) els[i - 1].dispatchEvent(new PointerEvent('pointerleave'));
          els[i].dispatchEvent(new PointerEvent('pointerenter'));
          await this.sleep(a.every);
        }
        return;
      }
      case 'key': {
        const el = await this.waitFor<HTMLElement>(a.selector);
        if (!el) return;
        el.focus({ preventScroll: true });
        el.dispatchEvent(new KeyboardEvent('keydown', { key: a.key, bubbles: true }));
        return;
      }
    }
  }
}

/** Auto-start from the URL: ?tour=1 (and &film=1 for recording). */
export function maybeAutostart() {
  const q = new URLSearchParams(location.search);
  if (q.get('tour') === '1') startTour({ film: q.get('film') === '1' });
}

