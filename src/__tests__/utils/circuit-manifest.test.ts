import { describe, expect, it } from 'vitest';

import {
  normalizeRelativePath,
  resolveCircuitAssetPath,
  resolveManifestPath,
} from '@/utils/circuit-manifest';

const MANIFEST = {
  $BASE_DIR: '.',
  $COMPONENTS_DIR: '$BASE_DIR/components',
  $NETWORK_NODES_DIR: '$BASE_DIR/networks/nodes',
  $NETWORK_EDGES_DIR: '$BASE_DIR/networks/edges/functional',
} as const;

describe('resolveManifestPath', () => {
  it('resolves a nested node variable to a clean relative path', () => {
    expect(resolveManifestPath('$NETWORK_NODES_DIR/hippocampus_neurons/nodes.h5', MANIFEST)).toBe(
      'networks/nodes/hippocampus_neurons/nodes.h5'
    );
  });

  it('resolves a nested edge variable', () => {
    expect(
      resolveManifestPath(
        '$NETWORK_EDGES_DIR/CA3_projections__hippocampus_neurons__chemical_synapse/edges.h5',
        MANIFEST
      )
    ).toBe(
      'networks/edges/functional/CA3_projections__hippocampus_neurons__chemical_synapse/edges.h5'
    );
  });

  it('resolves $BASE_DIR = "." away to an empty prefix', () => {
    expect(resolveManifestPath('$COMPONENTS_DIR/x.h5', MANIFEST)).toBe('components/x.h5');
  });

  it('sanitizes only when the manifest is empty', () => {
    expect(resolveManifestPath('./a/b.h5', {})).toBe('a/b.h5');
  });

  it('sanitizes only when the manifest is undefined', () => {
    expect(resolveManifestPath('/a/b.h5')).toBe('a/b.h5');
  });

  it('strips a leading ./ and leading slashes', () => {
    expect(resolveManifestPath('.//a/b.h5', MANIFEST)).toBe('a/b.h5');
  });

  it('terminates on a cyclic manifest without hanging', () => {
    const cyclic = { $A: '$B/a', $B: '$A/b' };
    // Should not throw or loop forever; exact output is unspecified but bounded.
    expect(typeof resolveManifestPath('$A/file.h5', cyclic)).toBe('string');
  });

  // Manifests where one variable's value references another variable, and where
  // a short key (`$NETWORK`) is a prefix of a longer one (`$NETWORK_NODES_DIR`).
  // Matching whole `$VAR` tokens must resolve these without the prefix
  // corrupting the longer key.
  const NESTED_MANIFEST = {
    $BASE_DIR: '.',
    $COMPONENTS_DIR: '$BASE_DIR/components',
    $NETWORK: '$BASE_DIR/networks',
    $NETWORK_NODES_DIR: '$NETWORK/nodes',
    $NETWORK_EDGES_DIR: '$NETWORK/edges/functional',
  } as const;

  it('resolves transitive variable references (nodes)', () => {
    expect(
      resolveManifestPath('$NETWORK_NODES_DIR/hippocampus_neurons/nodes.h5', NESTED_MANIFEST)
    ).toBe('networks/nodes/hippocampus_neurons/nodes.h5');
  });

  it('resolves transitive variable references (edges)', () => {
    expect(resolveManifestPath('$NETWORK_EDGES_DIR/foo/edges.h5', NESTED_MANIFEST)).toBe(
      'networks/edges/functional/foo/edges.h5'
    );
  });

  it('does not let a prefix key collide with a sibling', () => {
    expect(resolveManifestPath('$COMPONENTS_DIR/x.h5', NESTED_MANIFEST)).toBe('components/x.h5');
  });
});

describe('normalizeRelativePath', () => {
  it('collapses . and .. segments', () => {
    expect(normalizeRelativePath('a/./b/../c')).toBe('a/c');
  });

  it('drops leading ./ and empty segments', () => {
    expect(normalizeRelativePath('.//a//b')).toBe('a/b');
  });

  it('treats a leading .. with nothing to pop as a no-op', () => {
    expect(normalizeRelativePath('../a/b')).toBe('a/b');
  });
});

describe('resolveCircuitAssetPath', () => {
  // The shape this helper exists for: a manifest whose `$BASE` points into a
  // subdirectory, so expansion leaves a `..` that a server would match as a
  // literal path segment rather than a step up.
  const SIBLING_MANIFEST = {
    $BASE: 'sonata/circuits',
    $NETWORK_DIR: '$BASE/../networks',
  } as const;

  it('collapses a .. left behind by expansion', () => {
    expect(resolveCircuitAssetPath('$NETWORK_DIR/nodes.h5', SIBLING_MANIFEST)).toBe(
      'sonata/networks/nodes.h5'
    );
  });

  it('agrees with resolveManifestPath where there is nothing to normalise', () => {
    const path = '$NETWORK_NODES_DIR/hippocampus_neurons/nodes.h5';
    expect(resolveCircuitAssetPath(path, MANIFEST)).toBe(resolveManifestPath(path, MANIFEST));
  });

  it('normalises a path carrying no manifest variables at all', () => {
    expect(resolveCircuitAssetPath('./a/b/../c.h5')).toBe('a/c.h5');
  });
});
