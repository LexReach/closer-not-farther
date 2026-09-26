// Typed access to /data/*.json. Components read figures only from here.
import sourceText from '../data/source-text.json';
import skeptics from '../data/skeptics.json';

export { sourceText, skeptics };

export type ModuleKey = keyof typeof skeptics.modules;

export function skepticsFor(key: ModuleKey) {
  const m = skeptics.modules[key];
  return {
    intro: m.intro,
    points: m.points.map((p) => ({ text: p.text, source: p.source || undefined })),
  };
}
