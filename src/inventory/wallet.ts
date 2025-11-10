export type Wallet = { points: number; gold: number; materials: number };
export type CostVector = Partial<Record<keyof Wallet, number>>;

export const WALLET_KEYS: (keyof Wallet)[] = ["points", "gold", "materials"];

export function addCost(into: CostVector, add: CostVector) {
  for (const k of WALLET_KEYS) into[k] = (into[k] ?? 0) + (add[k] ?? 0);
}
export function geWallet(w: Wallet, need: CostVector): boolean {
  for (const k of WALLET_KEYS) if ((w[k] ?? 0) < (need[k] ?? 0)) return false;
  return true;
}
export function subWallet(w: Wallet, cost: CostVector) {
  for (const k of WALLET_KEYS) w[k] = (w[k] ?? 0) - (cost[k] ?? 0);
}
