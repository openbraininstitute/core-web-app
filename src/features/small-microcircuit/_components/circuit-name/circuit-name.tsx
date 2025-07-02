import React from 'react';
import { InfoCircleFilled } from '@ant-design/icons';

import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { classNames } from '@/util/utils';

import styles from './circuit-name.module.css';

export interface CircuitNameProps {
  className?: string;
  circuit: ICircuit | undefined | null;
}

export default function CircuitName({ className, circuit }: CircuitNameProps) {
  const { name, description } = useCircuitNameAndDescription(circuit);

  return (
    <div className={classNames(className, styles.circuitName)}>
      <div className={styles.name}>
        <strong>{name}</strong> <InfoCircleFilled />
      </div>
      <div className={styles.description}>{description}</div>
    </div>
  );
}

function useCircuitNameAndDescription(circuit: ICircuit | undefined | null) {
  const [name, setName] = React.useState(circuit?.id ?? '');
  const [description, setDescription] = React.useState('');
  React.useEffect(() => {
    if (!circuit) return;

    const action = async () => {
      if (circuit) {
        setName(circuit.name);
        setDescription(circuit.description);
      }
    };
    action();
  }, [circuit]);
  return { name, description };
}
