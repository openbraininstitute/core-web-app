import { classNames } from '@/util/utils';

import type { FlatValidationResult } from '@/features/model-analysis/viewer/container/hooks';

import styles from './documentation.module.css';

export interface DocumentationProps {
  className?: string;
  value: FlatValidationResult;
}

export default function Documentation({ className, value }: DocumentationProps) {
  const { documentation } = value;

  if (!documentation) return null;

  const { protocol } = documentation;
  return (
    <div
      id={`${documentation}_${value.assetId}`}
      className={classNames(className, styles.documentation)}
    >
      {value.extraVariables && (
        <>
          <ul>
            {Object.keys(value.extraVariables).map((key) => (
              <li key={key}>
                <span>{key}: </span>
                <strong>{value.extraVariables?.[key].value}</strong>{' '}
                <span>{value.extraVariables?.[key].unit}</span>
              </li>
            ))}
          </ul>
          <hr />
        </>
      )}
      <p>{documentation.description}</p>
      <div className={styles.grid}>
        {protocol?.type && (
          <>
            <div>Type:</div>
            <div>{protocol.type}</div>
          </>
        )}
        {protocol?.delay && (
          <>
            <div>Delay:</div>
            <div>{protocol.delay}</div>
          </>
        )}
        {protocol?.duration && (
          <>
            <div>Duration:</div>
            <div>{protocol?.duration}</div>
          </>
        )}
        {protocol?.amplitude && (
          <>
            <div>Amplitude:</div>
            <div>{protocol.amplitude}</div>
          </>
        )}
        {protocol?.totalDuration && (
          <>
            <div>Total duration:</div>
            <div>{protocol.totalDuration}</div>
          </>
        )}
      </div>
      <div className="py-5">
        <h4 className="text-primary-8 font-black">Validation condition: </h4>
        {documentation.validation_condition}
      </div>
    </div>
  );
}
