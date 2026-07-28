import { describe, expect, it } from 'vitest';

import {
  extractRecordingIds,
  parseElectricalCellRecordingProperties,
  resolveRecordingPropertiesEndpoint,
} from '@/features/scan-config/components/hooks/electrical-cell-recording-properties';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const recordingRef = (id: string) => ({ type: 'ElectricalCellRecordingFromID', id_str: id });

const FIRST = '3f1a1b2c-4d5e-4f60-8a9b-0c1d2e3f4a5b';
const SECOND = '7c2b3d4e-5f60-4712-9abc-1d2e3f4a5b6c';

describe('extractRecordingIds', () => {
  it('collects every recording id from the initialize block', () => {
    const config = {
      initialize: {
        electrical_cell_recording: [recordingRef(FIRST), recordingRef(SECOND)],
      },
    } as unknown as Config;

    expect(extractRecordingIds(config)).toEqual([FIRST, SECOND]);
  });

  it('accepts a single ref that is not wrapped in an array', () => {
    const config = {
      initialize: { electrical_cell_recording: recordingRef(FIRST) },
    } as unknown as Config;

    expect(extractRecordingIds(config)).toEqual([FIRST]);
  });

  it('ignores refs of other FromID types', () => {
    const config = {
      initialize: {
        electrical_cell_recording: [recordingRef(FIRST)],
        circuit: { type: 'CircuitFromID', id_str: SECOND },
      },
    } as unknown as Config;

    expect(extractRecordingIds(config)).toEqual([FIRST]);
  });

  it('returns nothing when initialize is missing or empty', () => {
    expect(extractRecordingIds({} as Config)).toEqual([]);
    expect(extractRecordingIds({ initialize: {} } as unknown as Config)).toEqual([]);
  });
});

describe('resolveRecordingPropertiesEndpoint', () => {
  it('reads the endpoint declared for ElectricalCellRecordings', () => {
    const schema = {
      property_endpoints: {
        ElectricalCellRecordings: 'declared/mapped-electrical-cell-recording-properties',
      },
    } as unknown as ConfigSchema;

    expect(resolveRecordingPropertiesEndpoint(schema)).toBe(
      'declared/mapped-electrical-cell-recording-properties'
    );
  });

  it('returns null when the schema declares no such endpoint', () => {
    const schema = { property_endpoints: { Circuit: '/declared/x' } } as unknown as ConfigSchema;

    expect(resolveRecordingPropertiesEndpoint(schema)).toBeNull();
  });
});

describe('parseElectricalCellRecordingProperties', () => {
  it('parses the declared endpoint response', () => {
    const parsed = parseElectricalCellRecordingProperties({
      Protocols: ['IDrest', 'IV'],
      ProtocolsByRecording: { [FIRST]: ['IDrest'], [SECOND]: ['IV'] },
      AmplitudesByProtocol: { IDrest: [0.1, 0.2], IV: [-0.02] },
    });

    expect(parsed.Protocols).toEqual(['IDrest', 'IV']);
    expect(parsed.AmplitudesByProtocol.IDrest).toEqual([0.1, 0.2]);
  });

  it('rejects a response missing the amplitude map', () => {
    expect(() =>
      parseElectricalCellRecordingProperties({
        Protocols: [],
        ProtocolsByRecording: {},
      })
    ).toThrow();
  });
});
