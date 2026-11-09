import type { CSSProperties } from 'react';

import styles from './information-text.module.css';

/** Replay the export's letter turn without changing the page's title or its wrapping. */
export function InformationTitle({ text, cycle }: { text: string; cycle: number }) {
  let character = 0;
  const outEnd = Math.max(0, Array.from(text).length - 1) * 27 + 280;
  return (
    <span key={cycle} data-text-cycle={cycle} aria-hidden="true">
      {text.split(/(\s+)/).map((word) => {
        if (/^\s+$/.test(word)) {
          character += word.length;
          return <span key={`${character}-space`}>{word}</span>;
        }
        return (
          <span key={`${character}-${word}`} className={styles.word}>
            {Array.from(word).map((letter) => {
              const at = character++;
              return (
                <span
                  key={`${at}-${letter}`}
                  className={styles.letter}
                  style={
                    {
                      '--letter-out-delay': `${at * 27}ms`,
                      '--letter-in-delay': `${outEnd + at * 45}ms`,
                    } as CSSProperties
                  }
                >
                  {letter}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

export function InformationDescription({ text, cycle }: { text: string; cycle: number }) {
  return (
    <span key={cycle} className={styles.description} data-description-cycle={cycle}>
      {text}
    </span>
  );
}
