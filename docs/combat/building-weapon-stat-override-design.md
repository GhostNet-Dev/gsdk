# 방어 건물 무기 스탯 우선순위 설계서

## 목표
방어용 건물(`BuildingType.DefenseTurret`)이 사용하는 `weapons` 정의와 건물 자체의 `combat.stats`가 같은 의미의 전투 수치를 동시에 제공할 때, 건물 정의에 명시된 스탯을 전투 계산의 기준값으로 사용할 수 있도록 설계합니다.

현재 `buildingdefs.ts`의 타워들은 `combat.stats.attackRange`를 가지고 있지만, 런타임 사거리 계산은 `ProjectileWeaponDef.range`가 존재하면 weapon 값을 우선 사용합니다. 그 결과 `TowerA`, `TowerB`, `TowerCatapult`의 사거리를 건물 정의에서 조정해도 실제 공격 범위가 weapon 샘플 정의에 묶이는 문제가 생깁니다.

## 핵심 수정 대상 (대안 B 기준)

### 수정
- `src/gsdk/src/interactives/building/buildingobjs/defenseturret.ts` — `GetDebugInfo()`, `findTarget()`, `shoot()`, `getSpecificProgress()`, `getAttackRange()` 5곳이 resolved weapon을 쓰도록 변경.
- `src/gsdk/src/world/cityview/readonlycityruntime.ts` — `update()`의 발사부, `getAttackRange()` 2곳이 resolved weapon을 쓰도록 변경.

### 신규 추가
- `src/gsdk/src/interactives/building/buildingweaponstats.ts` — override 해석 헬퍼 + `BuildingWeaponStatOverride` enum.

### 변경 불필요 (검토 결과)
- `src/gsdk/src/interactives/building/buildingdefs.ts` — `BuildingCombatProperty.stats`가 이미 `Partial<Record<StatKey, number>>`이라 override 여부 판단에 그대로 쓸 수 있음. 데이터/타입 변경 없음.
- `src/gsdk/src/actors/controllable/projectileweaponcontroller.ts` — 대안 B는 controller 밖에서 resolved `ProjectileWeaponDef`를 만들어 기존 `fireAtTarget`/`getEffectiveRange`/`getCooldownProgress`에 그대로 넘기므로 controller 자체는 손댈 필요 없음. (대안 A를 택했다면 이 파일이 핵심 수정 대상이 됨.)
- `src/gsdk/src/actors/projectile/projectiletypes.ts` — resolved weapon도 기존 `ProjectileWeaponDef` 타입을 그대로 따르므로 타입 변경 불필요.

## 현재 동작 분석

### 1. 건물 스탯 초기화
`BaseBuilding`은 생성 시 아래 값을 `BaseSpec`에 반영합니다.

```typescript
this.baseSpec = new BaseSpec({
    attackRanged: 0,
    attackRange: 1,
    defense: 0,
    ...(this.property.combat?.stats ?? {}),
    hp: this.property.hp,
}, this);
```

따라서 `combat.stats.attackRanged`, `combat.stats.attackRange`, `combat.stats.attackSpeedRanged` 등은 건물의 `BaseSpec` 안에 이미 들어갑니다.

### 2. 사거리 계산
`DefenseTurret.getAttackRange()`는 `ProjectileWeaponController.getEffectiveRange(weapon, this.baseSpec.AttackRange)`를 호출합니다.

현재 controller는 다음 규칙을 사용합니다.

- `weapon.range`가 있으면 weapon range 사용
- 없으면 `defaultRange` 사용

즉 `TowerA.combat.stats.attackRange = 9`여도 `shipWeaponDefs.AllySupportGun.range = 42`가 있으면 실제 사거리는 42가 됩니다.

### 3. 피해량 계산
`ProjectileWeaponController.fireAtTarget()`는 피해량을 아래처럼 계산합니다.

```typescript
damage: this.ownerSpec.Damage * (weapon.damageMultiplier ?? 1) * damageMultiplier
```

방어 건물은 `lastUsedWeaponMode = WeaponMode.Ranged`이므로 `ownerSpec.Damage`는 `combat.stats.attackRanged`를 기반으로 합니다. 다만 weapon의 `damageMultiplier`가 추가로 곱해지므로, 건물 정의가 피해량의 완전한 기준값이 되지는 않습니다.

### 4. 발사 쿨다운
쿨다운은 `weapon.fireCooldownSec`를 우선 사용합니다. 건물 `combat.stats.attackSpeedRanged`가 있더라도 현재 방어 건물 투사체 쿨다운에는 반영되지 않습니다.

## 설계 원칙

1. **건물 정의 우선:** `BuildingCombatProperty.stats`에 명시된 전투 스탯은 같은 의미의 weapon 수치보다 우선합니다.
2. **무기 정체성 유지:** projectile id, damage type, hitscan, homing, tracer, muzzle offset 같은 발사체/시각/동작 특성은 weapon 정의를 유지합니다.
3. **타워 한정 적용:** 전역 weapon controller의 의미를 갑자기 바꾸기보다 방어 건물 전투 경로에서 우선순위를 명시합니다.
4. **엄격한 타입 사용:** string literal 분기 대신 enum 또는 좁은 union 타입으로 override 가능한 스탯을 선언합니다.
5. **readonly city 동기화:** 플레이어 도시의 `DefenseTurret`과 라이벌/readonly city의 `ReadonlyCityDefenseCombatant`가 같은 계산 규칙을 사용해야 합니다.

## 스탯 매핑 정책

| 건물 스탯 | 대응 weapon 필드 | 권장 우선순위 | 비고 |
| --- | --- | --- | --- |
| `attackRanged` | `damageMultiplier` | 건물 스탯 우선 | 건물 피해량을 기준값으로 쓰려면 multiplier는 1로 해석합니다. |
| `attackRange` | `range` | 건물 스탯 우선 | 정의값을 정확히 쓰려면 `BaseSpec.AttackRange`의 +0.5 보정 여부를 별도로 결정해야 합니다. |
| `attackSpeedRanged` | `fireCooldownSec` | 건물 스탯 우선 | 현재 코드 관례상 attack speed는 초 단위 공격 간격으로 사용됩니다. |
| `projectileSpeed` | projectile runtime speed 보정 | 기존 BaseSpec 사용 | `ProjectileCtrl`이 creator spec에서 조회하므로 별도 override 불필요. |
| `turnSpeed` | `turnSpeed` | 보류 | 현재 `ProjectileWeaponController` 발사 메시지에 반영되지 않는 필드입니다. |

## 권장 구현안

### 1. 방어 건물 전용 해석 헬퍼 추가
신규 파일을 추가합니다.

- `src/gsdk/src/interactives/building/buildingweaponstats.ts`

예상 역할은 다음과 같습니다.

- weapon 정의와 building `combat.stats`를 입력받습니다.
- override 가능한 stat key를 enum으로 제한합니다.
- 건물 스탯이 명시된 항목만 weapon 필드를 대체합니다.
- projectile id, damage type, muzzle offset 등은 원본 weapon 값을 유지합니다.

타입 예시는 다음과 같습니다.

```typescript
export enum BuildingWeaponStatOverride {
    AttackRanged = "attackRanged",
    AttackRange = "attackRange",
    AttackSpeedRanged = "attackSpeedRanged",
}
```

### 2. 사거리 기준 결정
`attackRange` override는 두 가지 선택지가 있습니다.

- **정의값 정확 사용 (권장):** `baseSpec.stats.getStat("attackRange")`를 사용합니다. `buildingdefs.ts`에 적힌 값이 실제 사거리와 일치합니다. 기존 getter의 `+ 0.5` 보정은 무시합니다.
- **기존 BaseSpec 호환:** `baseSpec.AttackRange`를 사용합니다. 기존 getter의 `+ 0.5` 보정을 유지합니다.

권장안은 **정의값 정확 사용**입니다. 건물 데이터에서 `attackRange: 9`라고 정의했으면 실제 타워 탐색/발사 사거리도 9가 되는 편이 밸런싱과 디버깅에 더 명확합니다.

### 3. 피해량 기준 결정
`attackRanged`가 건물 `combat.stats`에 명시되어 있으면 weapon의 `damageMultiplier`는 1로 해석합니다.

예시:

- `attackRanged: 3`
- `shipWeaponDefs.FighterAutocannon.damageMultiplier: 1.15`

권장 결과는 `3 * 1 = 3`입니다. 이렇게 해야 건물 정의의 공격력이 완전한 기준값이 됩니다. weapon별 보정이 필요하면 별도 건물 스탯이나 weapon 선택 자체로 표현합니다. 단, 무기 정의에 포함된 특수 효과(관통 등)가 있다면 이는 유지되도록 설계합니다.

### 4. 쿨다운 기준 결정
`attackSpeedRanged`가 건물 `combat.stats`에 명시되어 있으면 `weapon.fireCooldownSec` 대신 사용합니다.

현재 `AttackAllyState`도 `attackSpeed`를 공격 간격 시간처럼 다루고 있으므로, 방어 건물에서도 `attackSpeedRanged`를 초 단위 쿨다운으로 해석하는 것이 일관적입니다.

최소 쿨다운은 기존 controller와 동일하게 `0.05`초로 clamp합니다.

### 5. 성능 및 캐싱
매 발사 시마다 해석하지 않고, 건물 생성자에서 1회 계산해 `private readonly resolvedWeapon` 필드로 보관합니다.

현재 `completeUpgrade()`([basebuilding.ts:191-203](../../../src/gsdk/src/interactives/building/buildingobjs/basebuilding.ts))는 레벨과 HP만 갱신하고 `combat.stats`는 변경하지 않으므로, 지금 시점에는 캐시 무효화 로직이 필요 없습니다. 이후 업그레이드/버프가 `combat.stats`를 실시간으로 바꾸는 기능이 추가되면, 그때 이미 존재하는 `EventTypes.UpgradeComplete` 이벤트 리스너에서 `resolvedWeapon`을 재계산하면 됩니다. 지금 단계에서 범용 무효화 정책을 미리 설계하지 않습니다.

### 6. 적용 위치
`DefenseTurret`에서는 아래 경로가 모두 같은 resolved weapon을 사용해야 합니다.

- `GetDebugInfo()`의 weapon 존재 여부 체크
- `findTarget()`의 공격 가능 여부 체크
- `shoot()`의 실제 발사
- `getSpecificProgress()`의 쿨다운 UI
- `getAttackRange()`의 타겟 탐색/유효성 검사

`ReadonlyCityDefenseCombatant`도 같은 helper를 사용해야 합니다.

- `update()`의 실제 발사
- `getAttackRange()`의 타겟 탐색/유효성 검사

## 대안 검토

### 대안 A. `ProjectileWeaponController` 자체에 override 옵션 추가
`ProjectileWeaponFireOptions`에 `overrideRange`, `overrideDamageMultiplier`, `overrideCooldownSec` 같은 필드를 추가할 수 있습니다.

장점:
- weapon 객체를 매 프레임 복사하지 않아도 됩니다.
- 우선순위가 controller 내부에서 명시됩니다.

단점:
- 전투기/controllable ship 등 다른 사용자에게 옵션 의미가 노출됩니다.
- 방어 건물만의 데이터 정책이 공용 controller에 섞입니다.

### 대안 B. 방어 건물 전용 resolved weapon 생성
방어 건물 쪽에서 `ProjectileWeaponDef`를 해석해 controller에 넘깁니다.

장점:
- 변경 범위가 작고, 다른 전투 시스템에 영향이 적습니다.
- helper 단위로 테스트하기 쉽습니다.

단점:
- 매 호출마다 객체를 만들면 작은 할당이 발생할 수 있습니다.
- 추후 버프/업그레이드로 스탯이 동적으로 바뀌는 경우 캐시 무효화 정책이 필요합니다.

### 대안 C. 런타임 override 없이 `buildingdefs.ts` 데이터에서 weapon을 직접 spread-override

```typescript
combat: {
    stats: { attackRanged: 1, attackRange: 9, defense: 8 },
    weapons: [{ ...shipWeaponDefs.AllySupportGun, range: 9, damageMultiplier: 1 }]
}
```

장점:
- 신규 파일, enum, 우선순위 해석 로직이 전혀 필요 없습니다. `DefenseTurret`/`ReadonlyCityDefenseCombatant`는 이미 `property.combat.weapons[0]`을 그대로 읽으므로 호출부 코드 변경이 없습니다.
- "명시값 vs 기본값" 모호성(아래 구현 시 주의사항 참고) 문제 자체가 생기지 않습니다.

단점:
- `combat.stats`와 `combat.weapons[0]`에 값이 중복됩니다. `attackRange`만 바꾸고 weapon 쪽 갱신을 잊으면 다시 원래 문제가 재발합니다.
- 방어 건물 종류가 늘어날수록(현재는 `TowerA`/`TowerB`/`TowerCatapult` 3개) 중복 관리 비용이 커집니다.

현재 규모(3개 타워)만 고려하면 대안 C가 훨씬 적은 리스크로 문제를 해결합니다. **방어 건물이 소수로 유지된다면 대안 C를 우선 검토할 가치가 있습니다.** 방어 건물 종류가 계속 늘어나고 `combat.stats` 하나만 조정해서 weapon에 자동 반영되길 원한다면 대안 B가 낫습니다.

권장안은 **대안 B**이나, 방어 건물이 현재처럼 소수(3개)로 유지된다면 **대안 C**로 범위를 줄이는 것도 합리적인 선택입니다. 방어 건물 확장 계획에 따라 결정합니다. 대안 B를 택할 경우, 공용 controller보다 building combat 계층에서 해결하는 편이 영향 범위가 명확합니다.

## 구현 시 주의사항

- **override 여부 판단은 반드시 raw `property.combat?.stats`로 합니다.** `basebuilding.ts`/`readonlycityruntime.ts`는 `BaseSpec` 생성 시 `attackRanged: 0, attackRange: 1, defense: 0`을 기본값으로 먼저 깔고 `combat.stats`를 덮어씁니다. 따라서 `baseSpec.stats.getStat("attackRange")`는 건물이 `attackRange`를 정의하지 않아도 항상 `1`을 반환합니다 (`statsystem.ts`의 `getStat`은 병합된 `baseStats`에서 읽으므로 "정의 안 함"과 "기본값 1"을 구분하지 못함). override 여부는 `property.combat?.stats?.attackRange !== undefined`처럼 원본 정의 객체로 검사하고, 값 계산에만 `baseSpec`/`stats.getStat`을 사용해야 합니다. 이 구분을 놓치면 `attackRange`를 정의하지 않은 건물도 weapon range가 `1`로 덮어써지는 버그가 생깁니다.
- `buildingdefs.ts`의 데이터 구조는 그대로 유지합니다. 기존 `combat.stats`와 `combat.weapons` 조합을 해석하는 런타임 규칙만 추가합니다.
- `attackRange` override는 타겟 탐색 범위와 발사체 range에 모두 동일하게 적용해야 합니다.
- `attackSpeedRanged` override는 실제 발사 쿨다운과 UI progress 계산에 모두 동일하게 적용해야 합니다.
- `attackRanged` override는 `ownerSpec.Damage` 계산과 중복 곱셈이 생기지 않도록 `damageMultiplier`를 1로 해석합니다.
- helper를 만든다면 반환 타입은 `ProjectileWeaponDef | undefined`처럼 기존 controller와 직접 연결 가능한 타입으로 둡니다.
- enum 이름은 `BuildingWeaponStatOverride`처럼 정책의 의도를 드러내는 이름을 사용합니다.

## 검증 방법

1. 코드 수정 후 `npm run build`를 실행합니다.
2. `TowerA.combat.stats.attackRange`를 작은 값으로 설정했을 때, weapon range가 더 커도 해당 값 기준으로 타겟을 찾는지 확인합니다.
3. `TowerB`와 `TowerCatapult`도 각 건물 `attackRange` 기준으로 debug range와 실제 발사 range가 일치하는지 확인합니다.
4. `attackRanged`를 변경했을 때 weapon의 `damageMultiplier`가 추가로 곱해지지 않는지 확인합니다.
5. `attackSpeedRanged`를 추가했을 때 쿨다운 UI와 실제 발사 간격이 같은 값을 따르는지 확인합니다.
6. readonly city 방어 전투에서도 같은 타워 데이터가 동일하게 동작하는지 확인합니다.
7. `combat.stats`에 해당 스탯이 없으면 기존 weapon 정의 기반 동작이 유지되는지 확인합니다.

## 결정 필요 사항

- **대안 B(런타임 override 헬퍼) vs 대안 C(데이터에서 weapon 직접 spread-override) 중 어느 쪽으로 갈지** 먼저 결정해야 합니다. 방어 건물이 현재 3종(`TowerA`/`TowerB`/`TowerCatapult`)에서 크게 늘어나지 않는다면 대안 C가 구현/검증 비용이 훨씬 낮습니다. 방어 건물 종류가 계속 늘고 `combat.stats`만 조정해 weapon에 자동 반영되길 원하면 대안 B를 선택합니다.
- `attackRange`를 정확히 `stats.getStat("attackRange")`로 사용할지, 기존 `BaseSpec.AttackRange`의 `+0.5` 보정을 유지할지 결정해야 합니다.
- `attackRanged`가 명시된 경우 weapon `damageMultiplier`를 완전히 무시할지, 별도 opt-in 필드로 곱셈을 허용할지 결정해야 합니다.
- (대안 B 선택 시) 향후 업그레이드/버프가 건물 `BaseSpec`에 실시간으로 반영되는 기능이 추가되면, 그 시점에 `EventTypes.UpgradeComplete` 리스너에서 `resolvedWeapon`을 재계산하는 정도로 충분한지, 별도 invalidation 체계가 필요한지 결정해야 합니다. 현재 `completeUpgrade()`는 `combat.stats`를 바꾸지 않으므로 지금 당장 결정할 필요는 없습니다.
