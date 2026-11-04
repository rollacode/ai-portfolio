/**
 * The rollacode.org mark: one ligature where the A's right leg is the K's stem, and the A's counter is filled with the site's blue.
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
  `<path d="M15.5 7 8.64 20h6.86Z" fill="${BRAND.accent}"/>` +
  `<path d="M6 25 15.5 7v18M25.5 7l-8.6 8.8L25.5 25" fill="none" stroke="${BRAND.paper}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
