// Base-aware links. BASE is '' in dev with BASE=/, or '/closer-not-farther' on Pages.
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const href = (path: string) => `${BASE}${path}`;
export const assetUrl = (file: string) => `${import.meta.env.BASE_URL}${file}`;
