# 방어 건물 데미지 박스 시각화 개선 설계 (Building Damage Box Fix)

## 1. 개요 (Overview)

본 문서는 컴뱃 디버그 모드(F9) 활성화 시 방어 건물(`DefenseTurret`)의 모델 표면이 아군 팀 색상(초록색)으로 직접 칠해지는 현상을 해결하고, `TargetRegistrySystem`에 등록된 실제 구조물 데미지 판정 영역(AABB)을 정확하게 시각화하기 위한 설계입니다.

기존 방식은 건물의 실제 3D 모델 메쉬 중 하나를 히트박스로 오용하여 모델의 외관을 훼손했으나, 개선된 방식은 별도의 와이어프레임 박스 메쉬를 생성하여 시각적 혼동을 제거합니다.

---

## 2. 문제 분석 (Problem Analysis)

### 2.1 현상
- `F9` 키를 눌러 디버그 모드 진입 시, 건물을 감싸는 박스가 나타나는 대신 건물의 벽면이나 표면 자체가 초록색으로 변함.
- 사용자는 이를 보고 데미지 판정이 모델 표면 정밀도로 이루어지는 것으로 오해하거나, 시각적 불쾌감을 느낌.

### 2.2 원인
- `DefenseTurret.ts`의 `GetDebugInfo()` 메서드가 `findDebugMesh()`를 통해 모델 내부의 실제 `THREE.Mesh` 객체를 찾아 `damageBox`로 반환함.
- `CombatDebugSystem`은 전달받은 `damageBox`의 머티리얼 색상을 팀 색상으로 강제 변경하고 `visible = true`로 설정함.
- 결과적으로 모델의 일부인 메쉬가 직접 초록색으로 렌더링됨.

### 2.3 논리적 판정 상태
- 구조물의 실제 데미지 판정 영역은 `TargetRegistrySystem`에 등록된 `bounds`(`THREE.Box3`)를 기준으로 합니다.
- 터렛 모델의 회전은 선택적 시각 애니메이션이며, 구조물 데미지 AABB를 다시 정의하지 않습니다.
- 따라서 디버그 시각화도 현재 렌더링 모델에서 다시 계산한 AABB가 아니라 등록된 고정 bounds를 우선 사용해야 합니다.

---

## 3. 개선 설계 (Design)

### 3.1 디버그 전용 박스 도입
방어 건물(`DefenseTurret`) 클래스 내부에 디버그 시각화만을 위한 별도의 메쉬를 관리합니다.

- **속성:** `private debugBox?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;`
- **생성 로직:**
    - `TargetRegistrySystem`에 등록된 구조물 bounds를 우선 조회합니다.
    - registry bounds가 없으면 `this.mesh.userData.bounds`를 사용합니다.
    - 둘 다 없을 때만 `new THREE.Box3().setFromObject(this.mesh)`를 fallback으로 사용합니다.
    - 해당 박스의 크기(`getSize`)를 기반으로 `THREE.BoxGeometry` 생성.
    - 와이어프레임 재질(`THREE.MeshBasicMaterial({ wireframe: true, ... })`) 생성.
    - 초기 `visible = false` 상태로 설정.

### 3.2 좌표계 정합성 유지
건물의 `scale`이나 `rotation`이 디버그 박스에 이중으로 적용되는 것을 방지하고, 타겟 시스템이 사용하는 축 정렬 바운딩 박스(AABB)와 시각적으로 완벽히 일치시키기 위해 다음 규칙을 따릅니다.

- **부모 설정:** `this.debugBox`를 `this.mesh`의 자식이 아닌 `this.mesh.parent` (즉, Scene)에 직접 추가합니다.
- **위치 설정:** `GetDebugInfo()` 호출 시마다 선택된 판정 bounds의 중심점(`getCenter`)을 구하여 `debugBox.position`을 갱신합니다.
- **크기 고정:** 구조물 데미지 bounds는 등록 시점 기준으로 의도적으로 고정합니다. 다만 씬 재부착이나 타겟 재등록으로 bounds 크기가 바뀌면 debug box를 재생성합니다.

### 3.3 터렛 회전 정책
`buildingDefs.ts`에 회전 모드를 명시합니다.

```typescript
export enum BuildingRotationMode {
    Fixed = "fixed",
    TrackTarget = "track_target",
}
```

- `BuildingCombatProperty`는 `rotationMode?: BuildingRotationMode`를 가집니다.
- 현재 방어 터렛(`TowerA`, `TowerB`, `TowerCatapult`)은 `BuildingRotationMode.Fixed`로 설정합니다.
- `rotationMode`가 생략된 경우 런타임 기본값은 `BuildingRotationMode.TrackTarget`으로 두어 기존 확장 동작을 유지합니다.
- `DefenseTurret`과 `ReadonlyCityDefenseCombatant`는 `TrackTarget`일 때만 `lookAt()`을 호출합니다.

### 3.4 리소스 수명 주기 관리
- **생성:** `GetDebugInfo()`가 처음 호출될 때 Lazy 로딩 방식으로 생성합니다.
- **파괴:** 건물이 파괴되거나 제거될 때(`destroy()`), `debugBox`의 geometry와 material을 `dispose()` 하고 씬에서 제거(`removeFromParent()`)하여 메모리 누수를 방지합니다. cleanup은 반드시 `super.destroy()` **이전**에 수행합니다.

### 3.5 CombatDebugSystem 변경 없음
`CombatDebugSystem`은 `damageBox`의 `visible` 상태와 material color만 제어합니다. 전용 와이어프레임 박스로 교체해도 동작 방식이 동일하므로 `CombatDebugSystem` 수정은 불필요합니다.

---

## 4. 구현 가이드 (Implementation Guide)

### 4.1 GetDebugInfo 수정
`findDebugMesh()` 호출 및 `if (!damageBox) return undefined;` 체크를 제거하고, `getOrCreateDebugBox()`를 호출하도록 교체합니다. `box.isEmpty()` 체크는 유지합니다.

```typescript
GetDebugInfo(): CombatDebugInfo | undefined {
    const weapon = this.property.combat?.weapons?.[0];
    if (this.isDestroyed || !this.mesh.parent || !this.isAttacking || !weapon) return undefined;

    const box = this.getDebugBounds();
    if (box.isEmpty()) return undefined;

    const damageBox = this.getOrCreateDebugBox(box);

    // 디버그 박스 위치 업데이트 (등록된 판정 bounds 중심점)
    const center = box.getCenter(new THREE.Vector3());
    damageBox.position.copy(center);

    const targetBounds = this.getDebugTargetBounds(this.target);
    const targetCenter = targetBounds
        ? targetBounds.getCenter(new THREE.Vector3())
        : this.target?.object.position.clone();

    return {
        team: CombatDebugTeam.Ally,
        targetId: this.id,
        damageBox,
        box,
        centerPos: this.mesh.position.clone(),
        moveDirection: new THREE.Vector3(0, 0, 0),
        attackRange: this.getAttackRange(),
        currentTargetId: this.target?.id,
        currentTargetBounds: targetBounds,
        currentTargetCenter: targetCenter,
    };
}
```

### 4.2 getDebugBounds 구현
```typescript
private getDebugBounds(): THREE.Box3 {
    const registeredBounds = this.targetRegistry?.get(this.id)?.bounds;
    if (registeredBounds && !registeredBounds.isEmpty()) return registeredBounds.clone();

    const userDataBounds = this.mesh.userData.bounds;
    if (userDataBounds instanceof THREE.Box3 && !userDataBounds.isEmpty()) {
        return userDataBounds.clone();
    }

    this.mesh.updateWorldMatrix(true, true);
    return new THREE.Box3().setFromObject(this.mesh);
}
```

### 4.3 getOrCreateDebugBox 구현
```typescript
private getOrCreateDebugBox(box: THREE.Box3): THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> {
    const size = box.getSize(new THREE.Vector3());
    const needsCreate = !this.debugBox || !this.debugBoxSize.equals(size);

    if (needsCreate) {
        this.disposeDebugBox();

        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            depthTest: false,
        });

        this.debugBox = new THREE.Mesh(geometry, material);
        this.debugBox.visible = false;
        this.debugBox.renderOrder = 1000;
        this.debugBoxSize.copy(size);
    }

    if (this.mesh.parent && this.debugBox.parent !== this.mesh.parent) {
        this.mesh.parent.add(this.debugBox);
    }

    return this.debugBox;
}
```

### 4.4 destroy() 수정
`debugBox` 정리를 `super.destroy()` **이전**에 수행합니다. `super.destroy()` 실행 후에는 `this.mesh.parent`가 `null`이 될 수 있으므로 순서가 중요합니다.

```typescript
destroy(): void {
    this.disposeDebugBox();
    this.eventCtrl.DeregisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry);
    super.destroy();
}
```

### 4.5 불필요 메서드 제거
`getOrCreateDebugBox()` 도입으로 아래 두 메서드는 더 이상 필요하지 않습니다. 삭제합니다.

- `findDebugMesh(root: THREE.Object3D): THREE.Mesh | undefined`
- `hasColorMaterial(material: THREE.Material | THREE.Material[]): boolean`

---

## 5. 검증 항목 (Verification)

1. **시각적 정확성:** `F9` 작동 시 건물 모델 표면이 초록색으로 변하지 않고, 건물을 감싸는 초록색 와이어프레임 박스가 표시되는가?
2. **좌표 일치:** 표시되는 와이어프레임 박스가 `TargetRegistrySystem`에 등록된 실제 충돌 영역(AABB)과 일치하는가?
3. **가시성:** 와이어프레임 박스가 건물 내부 지오메트리에 가려지지 않고 항상 보이는가? (`depthTest: false` 효과)
4. **리소스 해제:** 건물 파괴 시 `scene.children`에 debug box가 잔류하지 않고, geometry와 material이 메모리에서 정상적으로 정리되는가?
5. **회전 정책:** 현재 방어 터렛이 타겟 방향으로 회전하지 않지만 타겟 탐색과 발사는 계속 수행하는가?
6. **빌드 확인:** 코드 수정 후 `npm run build`가 성공하는가?
