import { DAPP_REGISTRY } from './constants';
import type { Dapp } from '@/types/dapp';

export function getDapps(): Dapp[] {
  return DAPP_REGISTRY;
}

export function getDappById(id: string): Dapp | undefined {
  return DAPP_REGISTRY.find((d) => d.id === id);
}

export function getDappByContract(address: string): Dapp | undefined {
  const needle = address.toLowerCase();
  return DAPP_REGISTRY.find((dapp) =>
    dapp.contracts?.some((c) => c.address.toLowerCase() === needle)
  );
}

