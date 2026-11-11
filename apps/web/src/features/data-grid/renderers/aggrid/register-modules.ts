import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

let registered = false;

/** Register AG Grid Community modules exactly once (idempotent). */
export function registerDataGridModules(): void {
  if (registered) return;
  ModuleRegistry.registerModules([AllCommunityModule]);
  registered = true;
}
