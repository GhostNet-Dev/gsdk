import IEventController from "@Glibs/interface/ievent";
import { CurrencyType, WALLET_KEYS, WalletManager } from "@Glibs/inventory/wallet";
import { EventTypes } from "@Glibs/types/globaltypes";
import { ResourceAmountChangedPayload, ResourceChangeRequest } from "./resourcetypes";

export default class ResourceManager {
  constructor(
    private eventCtrl: IEventController,
    private wallet: WalletManager,
  ) {
    this.eventCtrl.RegisterEventListener(EventTypes.CurrencyChangeRequested, this.onResourceChangeRequested);

    for (const type of WALLET_KEYS) {
      this.eventCtrl.RegisterEventListener(type, (amount: number) => {
        this.applyChange({ type, amount, reason: "system" });
      });
    }

    this.eventCtrl.RegisterEventListener(EventTypes.Stone, (amount: number) => {
      this.applyChange({ type: CurrencyType.Materials, amount, reason: "system", source: "stone" });
    });
    this.eventCtrl.RegisterEventListener(EventTypes.AddSkillPoint, (amount: number) => {
      this.applyChange({ type: CurrencyType.Points, amount, reason: "reward", source: "skill" });
    });
  }

  add(request: ResourceChangeRequest) {
    this.applyChange(request);
  }

  private onResourceChangeRequested = (request: ResourceChangeRequest) => {
    this.applyChange(request);
  };

  private applyChange(request: ResourceChangeRequest) {
    if (!request || !Number.isFinite(request.amount) || request.amount === 0) return;

    const previous = this.wallet.getAmount(request.type);

    if (request.amount > 0) {
      this.wallet.add(request.type, request.amount);
    } else {
      const ok = this.wallet.subtract(request.type, Math.abs(request.amount));
      if (!ok) {
        this.eventCtrl.SendEventMessage(EventTypes.Toast, "자원이 부족합니다.");
        return;
      }
    }

    const total = this.wallet.getAmount(request.type);
    const delta = total - previous;
    if (delta === 0) return;

    const payload: ResourceAmountChangedPayload = {
      type: request.type,
      delta,
      previous,
      total,
      requestedAmount: request.amount,
      source: request.source,
      reason: request.reason,
    };

    this.eventCtrl.SendEventMessage(EventTypes.CurrencyAmountChanged, payload);
  }
}
