'use client';

import { useSetAtom } from 'jotai';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DetailsPageSideBackLink } from '../../Sidebar';
import HeaderDetailView from './header-detail-view';
import SectionMainContainer from './sections/section-main-container';
import Visualiser from './visualisation/Visualiser';

import { CircuitSchemaProps } from '@/components/explore-section/Circuit/type';
import { buildCircuitMap } from '@/components/explore-section/Circuit/utils/circuits-map';
import { brainRegionSidebarIsCollapsedAtom } from '@/state/brain-regions';

import { CircuitSchemaProps } from '@/components/explore-section/Circuit/type';
import { buildCircuitMap } from '@/components/explore-section/Circuit/utils/circuits-map';
import { brainRegionSidebarIsCollapsedAtom } from '@/state/brain-regions';

function MainDetailViewCore({
  content,
  parentCircuit,
  derivedCircuits,
}: {
  content: CircuitSchemaProps;
  parentCircuit: CircuitSchemaProps | null;
  derivedCircuits: CircuitSchemaProps[] | null;
}) {
  return (
    <div className="py-10 pl-20 pr-10 text-primary-9">
      <HeaderDetailView content={content} />
      <Visualiser content={content} />
      <SectionMainContainer
        content={content}
        parentCircuit={parentCircuit}
        derivedCircuits={derivedCircuits}
      />
    </div>
  );
}

export default function CircuitDetailPage() {
  const setBrainRegionSidebarIsCollapsed = useSetAtom(brainRegionSidebarIsCollapsedAtom);
  const params = useParams();

  const [circuitData, setCircuitData] = useState<CircuitSchemaProps | null>(null);
  const [parentCircuitData, setParentCircuitData] = useState<CircuitSchemaProps | null>(null);
  const [derivedCircuitsData, setDerivedCircuitsData] = useState<CircuitSchemaProps[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const circuitKey = params.id as string | undefined;

  useEffect(() => {
    const fetchCircuit = async () => {
      if (!circuitKey) {
        setError('No existing circuit');
        setLoading(false);
        return;
      }

      setBrainRegionSidebarIsCollapsed(true);

      try {
        setLoading(true);
        const response = await fetch('/api/explore-circuits/data', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error || !Array.isArray(data.circuits)) {
          throw new Error(data.error || 'Invalid response from API');
        }

        const { circuits } = data;
        const circuitMap = buildCircuitMap(circuits);

        // Current Circuit content
        const matchingCircuit = circuitMap.get(circuitKey);
        if (!matchingCircuit) {
          throw new Error(`Circuit with key ${circuitKey} not found!`);
        }

        // Parent Circuit content
        let parentCircuit: CircuitSchemaProps | null = null;
        if (matchingCircuit.parent) {
          parentCircuit = circuitMap.get(matchingCircuit.parent) || null;
        }

        // Derived Circuit content
        const derivedCircuits: CircuitSchemaProps[] = matchingCircuit.derivedFrom
          .map((key: string) => circuitMap.get(key))
          .filter(
            (circuit: CircuitSchemaProps | undefined): circuit is CircuitSchemaProps => !!circuit
          );

        setCircuitData(matchingCircuit);
        setParentCircuitData(parentCircuit);
        setDerivedCircuitsData(derivedCircuits);
      } catch (er) {
        setError(
          er instanceof Error ? er.message : 'An error occurred while fetching the circuit data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCircuit();
  }, [circuitKey, setBrainRegionSidebarIsCollapsed]);

  if (loading) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center text-lg font-normal text-primary-9">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center text-lg font-normal text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="relative overflow-y-scroll bg-white">
      <DetailsPageSideBackLink />
      {circuitData && (
        <MainDetailViewCore
          content={circuitData}
          parentCircuit={parentCircuitData}
          derivedCircuits={derivedCircuitsData}
        />
      )}
    </div>
  );
}
