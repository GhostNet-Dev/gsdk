# 아군 원거리 전투 지원 구현 계획 (Ally Ranged Combat Support)

이 문서는 Archer와 Mage 아군 유닛이 투사체 기반 원거리 전투를 수행하도록 확장한 설계와 구현 기준을 정리합니다.

## 1. 목표

- Warrior는 기존 근접 공격을 유지합니다.
- Archer는 물리 원거리 투사체를 사용합니다.
- Mage는 마법 원거리 투사체를 사용하며, 피해 계산 시 `magicDefense`를 적용합니다.
- `projectileDef`가 있는 아군만 원거리 공격 루트를 사용하고 근접 fallback은 하지 않습니다.

## 2. 공유 타입 및 데이터

- `ProjectileWeaponDef`는 `actors/projectile/projectiletypes.ts`에 둡니다.
- 기존 ship/controllable 코드는 `controllabletypes.ts`의 재export와 `ShipProjectileDef` alias로 호환성을 유지합니다.
- `WeaponMode` enum을 사용해 `BaseSpec.lastUsedWeaponMode`를 `Melee`/`Ranged`로 엄격하게 표현합니다.
- `ProjectileDamageType` enum을 사용해 투사체 피해 타입을 `Physical`/`Magic`으로 구분합니다.
- `AllyProperty`는 `projectileDef?: ProjectileWeaponDef`, `attackAction?: ActionType`을 가집니다.

## 3. 아군별 전투 정책

- Warrior
  - `projectileDef` 없음.
  - `ActionType.Punch`와 `AttackType.NormalSwing` 기반 근접 공격 유지.
- Archer
  - `allyProjectileDefs.ArcherKnife` 사용.
  - `attackRanged`, `attackSpeedRanged`, `attackRange` 기반.
  - `ActionType.Bow`와 `Ani.Shooting` 매핑 사용.
  - `ProjectileDamageType.Physical` 적용.
- Mage
  - `allyProjectileDefs.MageEnergyHoming` 사용.
  - `magicAttack`, `attackSpeedRanged`, `attackRange` 기반.
  - `ActionType.MagicH1`과 `Ani.MagicH1`/`Ani.Spellcasting` 매핑 사용.
  - `ProjectileDamageType.Magic` 적용.

## 4. 상태 머신 동작

- `NewDefaultAllyState`는 `AllyProperty`를 각 상태에 전달합니다.
- `AllyState.GetAttackDistance()`는 `projectileDef.range`를 우선 사용하고, 없으면 기존 근접 거리 계산을 사용합니다.
- `AllyCtrl`은 `projectileDef`가 있으면 `WeaponMode.Ranged`, 없으면 `WeaponMode.Melee`로 `BaseSpec`을 초기화합니다.
- `AttackAllyState.Init()`은 `property.attackAction ?? ActionType.Punch`를 공격 애니메이션으로 사용합니다.
- 공격 예약 후 실행 시점에 타겟 ID, 생존 여부, targetable/collidable 상태, 현재 사거리를 다시 검증합니다.
- 검증 실패 시 예약된 공격은 취소하고 투사체를 발사하지 않습니다.

## 5. 투사체 발사 정책

`AttackAllyState`는 `projectileDef`가 있을 때 `EventTypes.SpawnProjectile`로 다음 payload를 보냅니다.

- `id`: `projectileDef.id`
- `ownerSpec`: 아군 `BaseSpec`
- `damage`: Archer는 `spec.DamageRanged`, Mage는 `spec.stats.getStat("magicAttack")`
- `damageType`: `projectileDef.damageType`
- `src`: 아군 위치에 `projectileDef.muzzleOffset`을 회전 적용한 월드 좌표
- `dir`: 발사 시점의 타겟 중심점을 향하는 정규화 벡터
- `range`: `projectileDef.range ?? spec.AttackRange`
- `homing`, `hitscan`, `tracerLife`, `tracerRange`, `useRaycast`: `projectileDef` 값 그대로 전달

`ProjectileCtrl`은 투사체 충돌 시 `AttackOption.damageType`을 함께 전달하며, 수신 측은 `calculateCompositeDamage`에 이 값을 넘겨 물리/마법 방어 계산을 분기합니다.

## 6. 검증

- 코드 수정 후 `src/gsdk`에서 `npm run build`를 실행합니다.
- Warrior가 기존처럼 접근 후 근접 공격하는지 확인합니다.
- Archer가 사거리에서 투사체를 발사하는지 확인합니다.
- Mage가 homing 에너지 투사체를 발사하고 마법 피해 타입을 전달하는지 확인합니다.
- 예약된 공격 실행 전에 타겟이 죽거나 사거리 밖으로 나가면 발사하지 않는지 확인합니다.
- TargetRegistry 팀 판정에 따라 아군 투사체가 같은 Player 팀을 공격하지 않는지 확인합니다.
