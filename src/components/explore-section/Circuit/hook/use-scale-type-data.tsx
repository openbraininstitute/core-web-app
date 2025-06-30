import { useEffect, useState } from 'react';
import { CircuitSchemaProps } from '../type';

export function useCircuitScales() {
  const [scales, setScales] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCircuits = async () => {
      function extractScales(circuit: CircuitSchemaProps, uniqueScales: Set<string>) {
        if (circuit.scale) {
          uniqueScales.add(circuit.scale);
        }
        if (circuit.subcircuits && circuit.subcircuits.length > 0) {
          circuit.subcircuits.forEach((subcircuit) => extractScales(subcircuit, uniqueScales));
        }
      }

      try {
        setLoading(true);
        const response = await fetch('/circuits/ALL_CIRCUITS.json');

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data: CircuitSchemaProps[] = await response.json();

        const uniqueScales = new Set<string>();

        data.forEach((circuit) => extractScales(circuit, uniqueScales));

        setScales(Array.from(uniqueScales));
      } catch (er) {
        setError(er instanceof Error ? er.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCircuits();
  }, []);

  return { scales, loading, error };
}
