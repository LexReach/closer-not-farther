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
  /** Hidden from the navigation rail. */
  hidden?: boolean;
  /** Full-bleed page without the rail (present mode). */
  bare?: boolean;
  /** Top-level section in the navigation: Read · Library · Why · About. */
  group: 'read' | 'library' | 'why' | 'about';
  load: () => Promise<{ render: Render }>;
}

export const routes: RouteDef[] = [
  {
    path: '/',
    num: '',
    title: 'Read',
    short: 'Read',
    hook: 'The Bible in four versions, Greek and Hebrew, with the manuscript evidence for every verse.',
    group: 'read',
    hidden: true,
    load: () => import('./reader/reader'),
  },
  {
    path: '/read',
    num: '',
    title: 'Read',
    short: 'Read',
    hook: 'The Bible in four versions, Greek and Hebrew, with the manuscript evidence for every verse.',
    group: 'read',
    load: () => import('./reader/reader'),
  },
  {
    path: '/why',
    num: '',
    title: 'Why trust the text',
    short: 'Why',
    hook: 'The argument in seven chapters, each with a live chart, ending on what skeptics say.',
    group: 'why',
    load: () => import('./modules/home'),
  },
  {
    path: '/telephone',
    group: 'why',
    num: '1',
    title: 'Telephone vs. Tree',
    short: 'Tree',
    hook: 'Copy a text through a single chain and through a branching tree, then try to recover the original.',
    load: () => import('./modules/telephone/view'),
  },
  {
    path: '/timeline',
    group: 'why',
    num: '2',
    title: 'Closer, Not Farther',
    short: 'Timeline',
    hook: 'Drag through five centuries of discovery and watch the earliest known copy move back toward the originals.',
    load: () => import('./modules/timeline'),
  },
  {
    path: '/p66',
    group: 'why',
    num: '3',
    title: 'Read P66 yourself',
    short: 'P66',
    hook: 'Line up a papyrus from about 200 AD with a modern Greek edition and an English translation, word by word.',
    load: () => import('./modules/p66'),
  },
  {
    path: '/variants',
    group: 'why',
    num: '4',
    title: 'The 110% puzzle',
    short: 'Variants',
    hook: 'The famous disputed passages are in your footnotes. Toggle them in and out and see who supports them.',
    load: () => import('./modules/variants'),
  },
  {
    path: '/names',
    group: 'why',
    num: '5',
    title: 'Names as fingerprints',
    short: 'Names',
    hook: 'The Gospels use first-century Palestinian names at about the rates the population did, and qualify the common ones.',
    load: () => import('./modules/names'),
  },
  {
    path: '/coincidences',
    group: 'why',
    num: '6',
    title: 'Undesigned coincidences',
    short: 'Interlocks',
    hook: 'One Gospel raises a question in passing; another answers it without meaning to.',
    load: () => import('./modules/coincidences'),
  },
  {
    path: '/why/coverage',
    group: 'why',
    num: '7',
    title: 'Every verse, century by century',
    short: 'Coverage',
    hook: 'Each verse lights up once a surviving manuscript copied by that century carries it.',
    load: () => import('./modules/coverage'),
  },
  {
    path: '/library',
    group: 'library',
    num: '7',
    title: 'The Library',
    short: 'Library',
    hook: 'Every catalogued Greek New Testament manuscript, with page images streamed from the libraries that hold them.',
    load: () => import('./modules/library'),
  },
  {
    path: '/present',
    group: 'why',
    num: '▶',
    title: 'Present',
    short: 'Present',
    hook: '',
    hidden: true,
    bare: true,
    load: () => import('./modules/present'),
  },
  {
    path: '/about',
    group: 'about',
    num: '·',
    title: 'About',
    short: 'About',
    hook: '',
    load: () => import('./modules/about'),
  },
];
