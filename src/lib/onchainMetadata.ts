import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const client = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
});

const erc20Abi = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;

const contractNameCache = new Map<string, string | null>();
const tokenMetaCache = new Map<string, { symbol: string; decimals: number } | null>();

export async function resolveContractName(address: string): Promise<string | null> {
  const key = address.toLowerCase();
  if (contractNameCache.has(key)) return contractNameCache.get(key) ?? null;
  try {
    const name = await client.readContract({
      address: key as `0x${string}`,
      abi: erc20Abi,
      functionName: 'name',
    });
    if (typeof name === 'string' && name.trim()) {
      contractNameCache.set(key, name);
      return name;
    }
  } catch (err) {
    // ignore and fallback
  }
  try {
    const symbol = await client.readContract({
      address: key as `0x${string}`,
      abi: erc20Abi,
      functionName: 'symbol',
    });
    if (typeof symbol === 'string' && symbol.trim()) {
      contractNameCache.set(key, symbol);
      return symbol;
    }
  } catch (err) {
    // ignore and fallback
  }
  contractNameCache.set(key, null);
  return null;
}

export async function resolveTokenMetadata(address: string): Promise<{ symbol: string; decimals: number } | null> {
  const key = address.toLowerCase();
  if (tokenMetaCache.has(key)) return tokenMetaCache.get(key) ?? null;
  try {
    const [symbolRaw, decimalsRaw] = await Promise.all([
      client.readContract({
        address: key as `0x${string}`,
        abi: erc20Abi,
        functionName: 'symbol',
      }),
      client.readContract({
        address: key as `0x${string}`,
        abi: erc20Abi,
        functionName: 'decimals',
      }),
    ]);
    const symbol = typeof symbolRaw === 'string' && symbolRaw.trim() ? symbolRaw : 'TOKEN';
    const decimals =
      typeof decimalsRaw === 'bigint' ? Number(decimalsRaw) : typeof decimalsRaw === 'number' ? decimalsRaw : 18;
    const meta = { symbol, decimals };
    tokenMetaCache.set(key, meta);
    return meta;
  } catch (err) {
    tokenMetaCache.set(key, null);
    return null;
  }
}

