/** Motion curves and springs. Easing curves mirror the CSS custom properties in globals.css. */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Press feedback on tappable surfaces. */
export const SPRING_PRESS = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 } as const;
/** Shared-layout glides between positions. */
export const SPRING_LAYOUT = { type: 'spring', stiffness: 360, damping: 32, mass: 0.6 } as const;
