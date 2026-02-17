import { isType } from '@/util/type-guards';
import { classNames } from '@/util/utils';

import Error from '../../Error';

import styles from './spacer.module.css';

interface SpacerProps {
  className?: string;
  value: unknown;
}

export default function Spacer({ className, value }: SpacerProps) {
  if (isSpacerDef(value)) {
    return <div className={classNames(className, styles.spacer, styles[value.value.size])} />;
  }
  return (
    <Error>
      <details>
        <summary>
          Unknown <strong>spacer</strong> attributes:
        </summary>
        <pre>{JSON.stringify(value, null, '  ')}</pre>
      </details>
    </Error>
  );
}

interface SpacerDef {
  value: {
    size: 'small' | 'medium' | 'large';
  };
}

function isSpacerDef(data: unknown): data is SpacerDef {
  return isType(data, {
    value: {
      size: ['literal', 'small', 'medium', 'large'],
    },
  });
}
