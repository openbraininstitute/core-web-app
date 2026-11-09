import type { CSSProperties } from 'react';

import styles from './information-text.module.css';

/** Animate once on mount without changing the page's title or its wrapping. */
export function InformationTitle({ text }: { text: string }) {
  let character = 0;
  return (
    <span data-information-title aria-hidden="true">
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
                      '--letter-in-delay': `${at * 45}ms`,
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

export function InformationDescription({ text }: { text: string }) {
  return (
    <span className={styles.description} data-information-description>
      {text}
    </span>
  );
}
