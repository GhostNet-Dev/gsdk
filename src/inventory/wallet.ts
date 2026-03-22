export enum CurrencyType {
  Points = "points",
  Gold = "gold",
  Materials = "materials",
  Gems = "gems",
  Exp = "exp",
  People = "people",
  Wood = "wood",
  Water = "water",
  Electric = "electric",
  Food = "food"
}

export type Wallet = Record<CurrencyType, number>;
export type CostVector = Partial<Record<CurrencyType, number>>;

export const WALLET_KEYS: CurrencyType[] = Object.values(CurrencyType);

export function createEmptyWallet(): Wallet {
  const wallet = {} as Wallet;
  for (const key of WALLET_KEYS) {
    wallet[key] = 0;
  }
  return wallet;
}

export type WalletChangeListener = (type: CurrencyType, newValue: number, delta: number) => void;

export class WalletManager {
  private wallet: Wallet;
  private listeners: Set<WalletChangeListener> = new Set();

  constructor(initialWallet?: Wallet) {
    this.wallet = initialWallet ?? createEmptyWallet();
  }

  getWallet(): Readonly<Wallet> {
    return this.wallet;
  }

  getAmount(type: CurrencyType): number {
    return this.wallet[type] ?? 0;
  }

  hasEnough(cost: CostVector): boolean {
    return geWallet(this.wallet, cost);
  }

  add(type: CurrencyType, amount: number) {
    if (amount === 0) return;
    const oldVal = this.wallet[type];
    this.wallet[type] += amount;
    this.notify(type, this.wallet[type], amount);
  }

  addMany(cost: CostVector) {
    for (const k of WALLET_KEYS) {
      if (cost[k] !== undefined && cost[k] !== 0) {
        this.add(k, cost[k]!);
      }
    }
  }

  subtract(type: CurrencyType, amount: number): boolean {
    if (amount === 0) return true;
    if ((this.wallet[type] ?? 0) < amount) return false;
    
    const oldVal = this.wallet[type];
    this.wallet[type] -= amount;
    this.notify(type, this.wallet[type], -amount);
    return true;
  }

  subtractMany(cost: CostVector): boolean {
    if (!this.hasEnough(cost)) return false;
    
    for (const k of WALLET_KEYS) {
      if (cost[k] !== undefined && cost[k] !== 0) {
        this.subtract(k, cost[k]!);
      }
    }
    return true;
  }

  addListener(listener: WalletChangeListener) {
    this.listeners.add(listener);
  }

  removeListener(listener: WalletChangeListener) {
    this.listeners.delete(listener);
  }

  private notify(type: CurrencyType, newValue: number, delta: number) {
    for (const listener of this.listeners) {
      listener(type, newValue, delta);
    }
  }
}

export function addCost(into: CostVector, add: CostVector) {
  for (const k of WALLET_KEYS) {
    if (add[k] !== undefined) {
      into[k] = (into[k] ?? 0) + add[k]!;
    }
  }
}

export function geWallet(w: Wallet, need: CostVector): boolean {
  for (const k of WALLET_KEYS) {
    if (need[k] !== undefined && (w[k] ?? 0) < need[k]!) {
      return false;
    }
  }
  return true;
}

export function subWallet(w: Wallet, cost: CostVector) {
  for (const k of WALLET_KEYS) {
    if (cost[k] !== undefined) {
      w[k] = (w[k] ?? 0) - cost[k]!;
    }
  }
}
