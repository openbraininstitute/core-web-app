import type { CAPABILITY_REGISTRY } from './registry';

type Registry = typeof CAPABILITY_REGISTRY;

export type GrantedCapabilities = {
  [Group in keyof Registry]: { [Leaf in keyof Registry[Group]]: boolean };
};

// The only form of a user's groups that reaches the browser. Each leaf maps to a concrete
// service gate: see `registry.ts`.
export type OperatorCapabilities = GrantedCapabilities & { admin: { access: boolean } };

export type CapabilityPath = {
  [Group in keyof OperatorCapabilities]: {
    [Leaf in keyof OperatorCapabilities[Group]]: `${Group & string}.${Leaf & string}`;
  }[keyof OperatorCapabilities[Group]];
}[keyof OperatorCapabilities];
