import * as THREE from "three"

export enum MonsterAdvancePhase {
    RoadMarch = "road-march",
    SiegeApproach = "siege-approach",
    Combat = "combat",
}

/**
 * 일반 전투 타겟과 구분되는 전략 이동 명령.
 * aggroRange 안에 적이 없을 때 도로 waypoint → 공성 목표 순으로 이동한다.
 */
export interface MarchOrder {
    /** 진입점 → 도로 꺾임점 → 빈터 경계 */
    waypoints: readonly THREE.Vector3[]
    /** 최종 공성 목표 target id (PlayerDefense의 CC) */
    siegeTargetId: string
}
