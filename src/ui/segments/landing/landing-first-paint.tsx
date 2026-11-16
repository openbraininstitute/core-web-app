import ObiLogo from '@/features/learn/components/ui/ObiLogo';

import { informationFont } from './information-font';

import styles from './landing-first-paint.module.css';

/**
 * The landing's logo and words as the server sends them, where the live landing draws them, so they come in
 * the moment the page shows rather than once the app has loaded. The live landing hides it once it has taken
 * over (first-paint-handoff.ts). Not drawn on phones, whose landing is laid out differently.
 */
export function LandingFirstPaint() {
  return (
    <div
      className={`${styles.firstPaint} ${informationFont.variable}`}
      data-landing-first-paint
      aria-hidden="true"
    >
      <ObiLogo className={styles.logo} />
      <p className={styles.words}>
        <span>Neuroscience at the</span>
        <span>Speed of Thought</span>
      </p>
      {/* (a picture of the live one, which is the link: it takes over as this goes) */}
      <span className={styles.cta}>Try it now</span>
    </div>
  );
}
