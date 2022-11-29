import { Address } from 'wagmi';

import { NATIVE_ASSETS_PER_CHAIN } from '~/core/references';
import { ChainId, ChainName } from '~/core/types/chains';

/**
 * @desc Checks if the given chain is a Layer 2.
 * @param chain The chain name to check.
 * @return Whether or not the chain is an L2 network.
 */
export const isL2Chain = (chain: ChainName | ChainId): boolean => {
  switch (chain) {
    case ChainName.arbitrum:
    case ChainName.bsc:
    case ChainName.optimism:
    case ChainName.polygon:
    case ChainId.arbitrum:
    case ChainId.bsc:
    case ChainId.optimism:
    case ChainId.polygon:
      return true;
    default:
      return false;
  }
};

export function isNativeAsset(address: Address, chain: ChainName) {
  return (
    NATIVE_ASSETS_PER_CHAIN[chain]?.toLowerCase() === address?.toLowerCase()
  );
}

export function chainIdFromChainName(chainName: ChainName) {
  return ChainId[chainName];
}

export function chainNameFromChainId(chainId: ChainId) {
  return Object.keys(ChainId)[
    Object.values(ChainId).indexOf(chainId)
  ] as ChainName;
}