import { IBuffItem } from "@Glibs/interface/ibuff";

export default interface IPlayerCtrl {
    UpdateBuff(buff: IBuffItem[]): void 
}