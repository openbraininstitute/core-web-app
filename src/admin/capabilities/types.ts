// The only form of a user's groups that reaches the browser. Each leaf maps to a concrete
// service gate: see `registry.ts`.
export type OperatorCapabilities = {
  entitycore: { admin: boolean; assetWrite: boolean };
  virtualLab: { read: boolean; admin: boolean };
  promotions: { admin: boolean };
  accounting: { admin: boolean };
  simulator: { admin: boolean };
  launchSystem: { admin: boolean };
  ops: { view: boolean };
};

export type CapabilityPath = {
  [Group in keyof OperatorCapabilities]: {
    [Leaf in keyof OperatorCapabilities[Group]]: `${Group & string}.${Leaf & string}`;
  }[keyof OperatorCapabilities[Group]];
}[keyof OperatorCapabilities];
