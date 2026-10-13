// Layout and its scroll/renderer lifecycle must enter the wide mode together.
export const homeWideQuery = '(min-width: 1200px)';
export const homeMotionQuery = `${homeWideQuery} and (prefers-reduced-motion: no-preference)`;
