export const brandSpring = { type: 'spring', stiffness: 420, damping: 22, mass: 1 } as const;
/** Large moves (a card becoming a whole page and back) settle without overshoot: critically damped, no bounce. */
export const morphSpring = { type: 'spring', stiffness: 260, damping: 34, mass: 1 } as const;
export const liquidSettle = { duration: 0.38, ease: [0.16, 1, 0.3, 1] } as const;
export const hoverSwell = { duration: 0.38, ease: [0.3, 1.6, 0.4, 1] } as const;
export const press = { duration: 0.28, ease: [0.16, 1, 0.3, 1] } as const;
export const liquidBreathe = { ease: [0.42, 0, 0.58, 1] } as const;
export const sectionEntry = { duration: 0.7, ease: [0.2, 0.7, 0.2, 1] } as const;
export const reducedMotionCrossfade = { duration: 0.15 } as const;
export const EASE = { liquidSettle: 'cubic-bezier(.16,1,.3,1)', hoverSwell: 'cubic-bezier(.3,1.6,.4,1)', liquidBreathe: 'cubic-bezier(.42,0,.58,1)', sectionEntry: 'cubic-bezier(.2,.7,.2,1)' } as const;
export const DURATION_MS = { press: 280, settle: 380, swell: 380, sectionEntry: 700, columnStagger: 120, detailStagger: 60, morphLand: 250, reducedCrossfadeMax: 150, readingHold: 1500 } as const;
export const SECTION_RISE_PX = 28;
