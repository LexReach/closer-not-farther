// Route table. Each module exports a render function that builds its page into
// `root` and may return a cleanup function (called when navigating away).

export type Cleanup = void | (() => void);
export type Render = (root: HTMLElement) => Cleanup;

export interface RouteDef {
  path: string;
  num: string;
  title: string;
  short: string;
  hook: string;
  load: () => Promise<{ render: Render }>;
}

export const routes: RouteDef[] = [
  {
    path: '/',
    num: '0',
    title: 'Home',
    short: 'Home',
    hook: '',
    load: () => import('./modules/home'),
  },
  {
    path: '/telephone',
    num: '1',
    title: 'Telephone vs. Tree',
    short: 'Tree',
    hook: 'Copy a text through a single chain and through a branching tree, then try to recover the original.',
    load: () => import('./modules/telephone/view'),
  },
  {
    path: '/timeline',
    num: '2',
    title: 'Closer, Not Farther',
    short: 'Timeline',
    hook: 'Drag through five centuries of discovery and watch the earliest known copy move back toward the originals.',
    load: () => import('./modules/timeline'),
  },
  {
    path: '/p66',
    num: '3',
    title: 'Read P66 yourself',
    short: 'P66',
    hook: 'Line up a papyrus from about 200 AD with a modern Greek edition and an English translation, word by word.',
    load: () => import('./modules/p66'),
  },
  {
    path: '/variants',
    num: '4',
    title: 'The 110% puzzle',
    short: 'Variants',
    hook: 'The famous disputed passages are in your footnotes. Toggle them in and out and see who supports them.',
    load: () => import('./modules/variants'),
  },
  {
    path: '/names',
    num: '5',
    title: 'Names as fingerprints',
    short: 'Names',
    hook: 'The Gospels use first-century Palestinian names at about the rates the population did, and qualify the common ones.',
    load: () => import('./modules/names'),
  },
  {
    path: '/coincidences',
    num: '6',
    title: 'Undesigned coincidences',
    short: 'Interlocks',
    hook: 'One Gospel raises a question in passing; another answers it without meaning to.',
    load: () => import('./modules/coincidences'),
  },
  {
    path: '/about',
    num: '·',
    title: 'About',
    short: 'About',
    hook: '',
    load: () => import('./modules/about'),
  },
];
