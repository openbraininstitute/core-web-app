'use client';

import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';

export function NoScrollEffect() {
  useDisableElementOverflow({ id: 'workspace-body' });
  return null;
}

export default NoScrollEffect;
