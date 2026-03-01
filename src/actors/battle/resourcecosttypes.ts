export type ResourceKey = string;

export type CostAtom = {
  key: ResourceKey;
  amount: number;
};

export type CostNode =
  | { type: "atom"; atom: CostAtom }
  | { type: "all"; nodes: CostNode[] }
  | { type: "any"; nodes: CostNode[] }
  | { type: "optional"; node: CostNode };

export type ActionCostSpec = {
  id: string;
  cost: CostNode;
};

export const cost = {
  atom: (key: ResourceKey, amount: number): CostNode => ({ type: "atom", atom: { key, amount } }),
  all: (...nodes: CostNode[]): CostNode => ({ type: "all", nodes }),
  any: (...nodes: CostNode[]): CostNode => ({ type: "any", nodes }),
  optional: (node: CostNode): CostNode => ({ type: "optional", node }),
};
