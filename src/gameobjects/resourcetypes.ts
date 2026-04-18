import { CurrencyType } from "@Glibs/inventory/wallet";

export type ResourceChangeReason =
  | "production"
  | "reward"
  | "cost"
  | "debug"
  | "levelup"
  | "system"
  | string;

export interface ResourceChangeRequest {
  type: CurrencyType;
  amount: number;
  source?: string;
  reason?: ResourceChangeReason;
}

export interface ResourceAmountChangedPayload {
  type: CurrencyType;
  delta: number;
  previous: number;
  total: number;
  requestedAmount: number;
  source?: string;
  reason?: ResourceChangeReason;
}

const RESOURCE_DISPLAY_NAMES: Record<CurrencyType, string> = {
  [CurrencyType.Points]: "포인트",
  [CurrencyType.Gold]: "골드",
  [CurrencyType.Materials]: "자재",
  [CurrencyType.Gems]: "보석",
  [CurrencyType.Exp]: "경험치",
  [CurrencyType.People]: "시민",
  [CurrencyType.Wood]: "나무",
  [CurrencyType.Water]: "물",
  [CurrencyType.Electric]: "전력",
  [CurrencyType.Food]: "식량",
};

export function getResourceDisplayName(type: CurrencyType) {
  return RESOURCE_DISPLAY_NAMES[type] ?? type;
}
