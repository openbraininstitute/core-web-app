import type { CSSProperties } from 'react';

import styles from './information-text.module.css';

/** Animate once on mount without changing the page's title or its wrapping. */
export function InformationTitle({ text }: { text: string }) {
  return (
    <span data-information-title aria-hidden="true">
      {Array.from(text.matchAll(/\s+|\S+/g), ({ 0: word, index: start }) => {
        if (/^\s+$/.test(word)) {
          return <span key={`${start}-space`}>{word}</span>;
        }
        return (
          <span key={`${start}-${word}`} className={styles.word}>
            {Array.from(word).map((letter, index) => {
              const at = start + index;
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
