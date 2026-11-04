/**
 * The rollacode.org mark, cut down from Andrey's own avatar to the two things people remember:
 * the swept navy quiff and the aviators, on the avatar's red.
 * app/icon.svg is the same drawing as a static file; keep the two in step.
 */
export const BRAND = {
  ink: '#0b1016',
  paper: '#e6edf3',
  muted: '#8b949e',
  accent: '#58a6ff',
  avatarRed: '#dd3745',
  avatarNavy: '#0a1a78',
} as const;

const FIGURE =
  `<g transform="translate(16 16.2) scale(1.16) translate(-16.8 -11.3)">` +
  `<path d="M8.2 15.6C7.4 10.6 9 6.6 12.4 5C13.6 3.4 15.6 2.8 17.2 3.3C18.6 1.8 21 1.6 22.6 2.5C24.2 1.7 26.6 2 28.6 3.4C27 3.5 26 4.1 25.6 4.9C27.4 5 28.8 6 29.4 7.2C27.4 7.2 25.9 8 25.3 9.4L24.4 13.2C19.4 11.9 13.6 11.9 9.8 13.2L9.6 15.6Z" fill="${BRAND.avatarNavy}"/>` +
  `<g fill="none" stroke="#2a3fb0" stroke-width=".7" stroke-linecap="round"><path d="M11.4 9.6C13.6 6.6 17.4 5 21.4 5.2"/><path d="M14.6 9.2C17 7.2 20.6 6.4 24 7"/><path d="M12.2 12C15.2 10.2 19.6 9.6 23.4 10.4"/></g>` +
  `<path d="M7.2 15.6H15C15.2 18.6 13.8 21 11.3 21C8.8 21 7.2 19 7.2 16.8ZM24.8 15.6H17C16.8 18.6 18.2 21 20.7 21C23.2 21 24.8 19 24.8 16.8Z" fill="${BRAND.avatarNavy}"/>` +
  `<path d="M14.5 16.4H17.5" stroke="${BRAND.avatarNavy}" stroke-width="1.4"/></g>`;

/** The round favicon mark. */
export const MARK_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${BRAND.avatarRed}"/>${FIGURE}</svg>`;

/** Square, edge to edge: iOS and Android cut their own corners. */
export const MARK_SQUARE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${BRAND.avatarRed}"/><g transform="translate(16 16) scale(.86) translate(-16 -16)">${FIGURE}</g></svg>`;

export const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
