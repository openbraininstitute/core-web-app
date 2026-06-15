// Block-scoped so the `require`-based bindings don't collide with other
// global-script *.nodetest.ts files (e.g. assets.nodetest.ts). Uses `require`
// (not ESM import) because node --experimental-strip-types runs this as
// CommonJS and resolves the explicit `.ts` extension.
{
  const assert: typeof import('node:assert/strict') = require('node:assert/strict');
  const test: typeof import('node:test') = require('node:test');
  const { resolveManifestPath, normalizeRelativePath }: typeof import('./circuit-manifest') =
    require('./circuit-manifest.ts');

  const { describe, it } = test;

  const MANIFEST = {
    $BASE_DIR: '.',
    $COMPONENTS_DIR: '$BASE_DIR/components',
    $NETWORK_NODES_DIR: '$BASE_DIR/networks/nodes',
    $NETWORK_EDGES_DIR: '$BASE_DIR/networks/edges/functional',
  } as const;

  describe('resolveManifestPath', () => {
    it('resolves a nested node variable to a clean relative path', () => {
      assert.equal(
        resolveManifestPath('$NETWORK_NODES_DIR/hippocampus_neurons/nodes.h5', MANIFEST),
        'networks/nodes/hippocampus_neurons/nodes.h5'
      );
    });

    it('resolves a nested edge variable', () => {
      assert.equal(
        resolveManifestPath(
          '$NETWORK_EDGES_DIR/CA3_projections__hippocampus_neurons__chemical_synapse/edges.h5',
          MANIFEST
        ),
        'networks/edges/functional/CA3_projections__hippocampus_neurons__chemical_synapse/edges.h5'
      );
    });

    it('resolves $BASE_DIR = "." away to an empty prefix', () => {
      assert.equal(resolveManifestPath('$COMPONENTS_DIR/x.h5', MANIFEST), 'components/x.h5');
    });

    it('sanitizes only when the manifest is empty', () => {
      assert.equal(resolveManifestPath('./a/b.h5', {}), 'a/b.h5');
    });

    it('sanitizes only when the manifest is undefined', () => {
      assert.equal(resolveManifestPath('/a/b.h5'), 'a/b.h5');
    });

    it('strips a leading ./ and leading slashes', () => {
      assert.equal(resolveManifestPath('.//a/b.h5', MANIFEST), 'a/b.h5');
    });

    it('terminates on a cyclic manifest without hanging', () => {
      const cyclic = { $A: '$B/a', $B: '$A/b' };
      // Should not throw or loop forever; exact output is unspecified but bounded.
      const result = resolveManifestPath('$A/file.h5', cyclic);
      assert.equal(typeof result, 'string');
    });

    // Manifests where one variable's value references another variable, and
    // where a short key (`$NETWORK`) is a prefix of a longer one
    // (`$NETWORK_NODES_DIR`). Matching whole `$VAR` tokens must resolve these
    // without the prefix corrupting the longer key.
    const NESTED_MANIFEST = {
      $BASE_DIR: '.',
      $COMPONENTS_DIR: '$BASE_DIR/components',
      $NETWORK: '$BASE_DIR/networks',
      $NETWORK_NODES_DIR: '$NETWORK/nodes',
      $NETWORK_EDGES_DIR: '$NETWORK/edges/functional',
    } as const;

    it('resolves transitive variable references (nodes)', () => {
      assert.equal(
        resolveManifestPath('$NETWORK_NODES_DIR/hippocampus_neurons/nodes.h5', NESTED_MANIFEST),
        'networks/nodes/hippocampus_neurons/nodes.h5'
      );
    });

    it('resolves transitive variable references (edges)', () => {
      assert.equal(
        resolveManifestPath('$NETWORK_EDGES_DIR/foo/edges.h5', NESTED_MANIFEST),
        'networks/edges/functional/foo/edges.h5'
      );
    });

    it('does not let a prefix key collide with a sibling', () => {
      assert.equal(resolveManifestPath('$COMPONENTS_DIR/x.h5', NESTED_MANIFEST), 'components/x.h5');
    });
  });

  describe('normalizeRelativePath', () => {
    it('collapses . and .. segments', () => {
      assert.equal(normalizeRelativePath('a/./b/../c'), 'a/c');
    });

    it('drops leading ./ and empty segments', () => {
      assert.equal(normalizeRelativePath('.//a//b'), 'a/b');
    });

    it('treats a leading .. with nothing to pop as a no-op', () => {
      assert.equal(normalizeRelativePath('../a/b'), 'a/b');
    });
  });
}
