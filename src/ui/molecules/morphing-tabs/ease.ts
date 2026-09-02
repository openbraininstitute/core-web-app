// Motion tokens for `morphing-tabs`, from beui.dev/components/blocks/morphing-tabs.

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Press feedback on buttons and other tappable surfaces. */
export const SPRING_PRESS = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.6,
} as const;

/** Dragged handles and fills — critically damped, so the value follows the
 * pointer butterily and never rebounds off an end. */
export const SPRING_GLIDE = {
  stiffness: 700,
  damping: 50,
  mass: 0.5,
} as const;
