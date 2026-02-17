import { classNames } from '@/util/utils';

import ProgressiveImage from '../../components/ProgressiveImage';
import { Text } from '../../components/Text';
import { styleBlockMedium, styleLayout } from '../../styles';
import { gotoSection } from '../../utils';
import { useContentForHero } from './hooks';

import styles from './Hero.module.css';

interface WidgetHeroProps {
  className?: string;
}

export function WidgetHero({ className }: WidgetHeroProps) {
  const data = useContentForHero();

  if (!data) return null;

  const { title, text, button, background } = data;

  return (
    <div
      className={classNames(className, styles.hero, styleLayout)}
      style={{
        '--custom-aspect-ratio': background ? `${background.width}/${background.height}` : '1/1',
      }}
    >
      {background && (
        <ProgressiveImage
          className={styles.background}
          alt="Background"
          src={background.url}
          width={background.width}
          height={background.height}
        />
      )}
      <div className={classNames(styles.body, styleBlockMedium)}>
        <div>
          <h1>{title}</h1>
          <Text value={text} />
          {button && (
            <button
              type="button"
              className={styles.button}
              onClick={() => gotoSection(button.link)}
            >
              {button.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
