/**
 * The section kinds a morphology tree item can be, imported past the barrel.
 *
 * Deliberately a deep import. The package's root module pulls in tgd, which
 * reads WebGL constants off `globalThis` and instantiates a WASM module while
 * its module body runs — so importing the enum through it costs a renderer, and
 * outside a browser it throws outright. This module is a bare enum declaration
 * with no imports of its own, so code that only needs to tell a soma from an
 * axon (the synapse pipeline, the section schema) can say so without any of it.
 *
 * The coupling to the package's internal layout is the price, which is why it
 * is spent here, once, rather than at each call site.
 */
export { MorphoViewerTreeItemType } from '@openbraininstitute/morphoviewer/dist/components/morpho-viewer-simul/types/public';

export type { MorphoViewerTreeItem } from '@openbraininstitute/morphoviewer/dist/components/morpho-viewer-simul/types/public';
