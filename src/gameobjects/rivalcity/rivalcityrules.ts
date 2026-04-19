import { RivalBuildTask, RivalBuildingState, RivalResourceBag } from "./rivalcitytypes";

export interface BuildQueueResult {
  updated: RivalBuildTask[];
  completed: string[];
}

export function advanceBuildQueue(tasks: RivalBuildTask[]): BuildQueueResult {
  const updated: RivalBuildTask[] = [];
  const completed: string[] = [];

  for (const task of tasks) {
    if (task.remainingTurns <= 1) {
      completed.push(task.buildingId);
    } else {
      updated.push({ ...task, remainingTurns: task.remainingTurns - 1 });
    }
  }

  return { updated, completed };
}

export function applyCompletedBuildings(
  existing: RivalBuildingState[],
  completedBuildingIds: string[],
  turn: number,
): RivalBuildingState[] {
  const result = [...existing];

  for (const buildingId of completedBuildingIds) {
    const sameKind = result.filter((b) => b.buildingId === buildingId);
    const existing2 = sameKind.length > 0 ? sameKind[sameKind.length - 1] : null;

    if (existing2 && existing2.level < 3) {
      existing2.level += 1;
    } else {
      result.push({
        id: `${buildingId}-${turn}-${Math.random().toString(36).slice(2, 7)}`,
        buildingId,
        level: 1,
        builtTurn: turn,
      });
    }
  }

  return result;
}

export function canAfford(resources: RivalResourceBag, cost: RivalResourceBag): boolean {
  for (const [key, required] of Object.entries(cost)) {
    if ((resources[key as keyof RivalResourceBag] ?? 0) < (required ?? 0)) {
      return false;
    }
  }
  return true;
}

export function deductCost(resources: RivalResourceBag, cost: RivalResourceBag): RivalResourceBag {
  const result = { ...resources };
  for (const [key, amount] of Object.entries(cost)) {
    const k = key as keyof RivalResourceBag;
    result[k] = Math.max(0, (result[k] ?? 0) - (amount ?? 0));
  }
  return result;
}

export function addResources(a: RivalResourceBag, b: RivalResourceBag): RivalResourceBag {
  const result = { ...a };
  for (const [key, amount] of Object.entries(b)) {
    const k = key as keyof RivalResourceBag;
    result[k] = (result[k] ?? 0) + (amount ?? 0);
  }
  return result;
}
