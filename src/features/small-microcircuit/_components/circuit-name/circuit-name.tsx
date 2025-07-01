import React from 'react';
import { InfoCircleFilled } from '@ant-design/icons';

import { useCircuit } from '../hooks/circuit';

import { classNames } from '@/util/utils';

import styles from './circuit-name.module.css';

export interface CircuitNameProps {
  className?: string;
  circuitId: string;
}

export default function CircuitName({ className, circuitId }: CircuitNameProps) {
  const { name, description } = useCircuitNameAndDescription(circuitId);

  return (
    <div className={classNames(className, styles.circuitName)}>
      <div className={styles.name}>
        <strong>{name}</strong> <InfoCircleFilled />
      </div>
      <div className={styles.description}>{description}</div>
    </div>
  );
}

function useCircuitNameAndDescription(circuitId: string) {
  const [name, setName] = React.useState(circuitId);
  const [description, setDescription] = React.useState('');
  const circuit = useCircuit(circuitId);
  React.useEffect(() => {
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
