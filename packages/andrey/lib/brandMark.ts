/**
 * The rollacode.org mark: an open A whose crossbar is the blue dot of the page's dot field, then a K.
 * app/icon.svg is the same drawing as a static file; keep the two in step.
 */
export const BRAND = {
  ink: '#0b1016',
  paper: '#e6edf3',
  muted: '#8b949e',
  accent: '#58a6ff',
} as const;

export const MARK_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${BRAND.ink}"/>` +
  `<g fill="none" stroke="${BRAND.paper}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M5 23 10 9l5 14"/><path d="M19 9v14M27 9l-7.6 7.6M22.3 14.7 27 23"/></g>` +
  `<circle cx="10" cy="18.8" r="2" fill="${BRAND.accent}"/></svg>`;

export const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
