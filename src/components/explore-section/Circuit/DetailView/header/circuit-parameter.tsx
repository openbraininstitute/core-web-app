'use client';

import { CircuitSchemaProps } from '../../type';
import formatNumberWithComma from '../../utils/format-number-with-comma';
import ParameterBox from '../global/ParameterBox';

export default function CircuitParameters({ content }: { content: CircuitSchemaProps }) {
  const parentCircuitLink = `./${content.parent}`;
  const licenseLink = content.metadata.license?.url;

  return (
    <div className="relative grid grid-cols-3 gap-12">
      {/* COLUMN 1 */}
      <div className="relative flex flex-col gap-y-4">
        <ParameterBox name="Brain Region" value={content.brainRegion ?? '–'} />
        <ParameterBox name="Subcircuit of" value={content.parent ?? '–'} link={parentCircuitLink} />
        <ParameterBox name="Scale" value={content.scale ?? '–'} />
        <ParameterBox
          name="License"
          value={content.metadata.license?.name ?? '–'}
          link={licenseLink}
        />
      </div>
      {/* COLUMN 2 */}
      <div className="relative flex flex-col gap-y-4">
        <ParameterBox
          name="Number of neurons"
          value={formatNumberWithComma(content.numberOfNeurons)}
        />
        <ParameterBox
          name="Number of connections"
          value={formatNumberWithComma(content.numberOfConnections)}
        />
        <ParameterBox
          name="Number of synapses"
          value={formatNumberWithComma(content.numberOfSynapses)}
        />
      </div>
      {/* COLUMN 3 */}
      <div className="relative flex flex-col gap-y-4">
        <ParameterBox name="Published in" value={content.metadata.publishedIn ?? '–'} />
        <ParameterBox name="Registration date" value={content.metadata.registrationDate ?? '–'} />
        <ParameterBox
          name="Contact"
          value={content.metadata.contact ?? '–'}
          link={`mailto:${content.metadata.contact}`}
        />
      </div>
    </div>
  );
}
