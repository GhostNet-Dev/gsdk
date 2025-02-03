import * as THREE from 'three'

export default class Grid {

    createGrid(size: number, divisions: number) {
        const gridLines = [];
        const step = size / divisions;
        const halfSize = size / 2;

        for (let i = 0; i <= divisions; i++) {
            const position = -halfSize + i * step;

            // 수직선
            gridLines.push(new THREE.Vector3(position, 0, -halfSize));
            gridLines.push(new THREE.Vector3(position, 0, halfSize));

            // 수평선
            gridLines.push(new THREE.Vector3(-halfSize, 0, position));
            gridLines.push(new THREE.Vector3(halfSize, 0, position));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(gridLines);
        const material = new THREE.LineBasicMaterial({ color: 0x000000 });
        return new THREE.LineSegments(geometry, material);
    }
    createGridMesh(size: number, divisions: number, color: number) {
        // 🔷 사각형 타일 설정
        const rectWidth = size / divisions; // 사각형 가로 길이
        const rectHeight = size / divisions; // 사각형 세로 길이

        // 맵 크기
        const mapWidth = divisions; // 가로 타일 개수
        const mapHeight = divisions; // 세로 타일 개수

        // 🔷 사각형 InstancedMesh 생성
        const rectGeometry = new THREE.PlaneGeometry(rectWidth, rectHeight);
        const rectMaterial = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
        const rectMesh = new THREE.InstancedMesh(rectGeometry, rectMaterial, mapWidth * mapHeight);

        // 🔲 개별적인 `LineSegments`를 추가하는 함수 (사각형 경계선)
        const createSquareOutline = (x: number, y: number) => {
            const edgesGeometry = new THREE.EdgesGeometry(rectGeometry);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 }); // 검은색 외곽선
            const line = new THREE.LineSegments(edgesGeometry, lineMaterial);

            line.position.set(x, y, 0.01); // 약간 위로 배치하여 겹침 방지
            return line
        }
        // 위치 행렬 설정
        const dummy = new THREE.Object3D();
        const lines: THREE.LineSegments[] = []
        let rectIndex = 0;

        for (let row = 0; row < mapHeight; row++) {
            for (let col = 0; col < mapWidth; col++) {
                // 🔷 사각형 위치 계산 (격자 형태)
                const rectX = col * rectWidth;
                const rectY = -row * rectHeight;

                dummy.position.set(rectX, rectY, 0);
                dummy.updateMatrix();
                rectMesh.setMatrixAt(rectIndex++, dummy.matrix);
                lines.push(createSquareOutline(rectX, rectY))
            }
        }
        const grp = new THREE.Group()
        grp.add(rectMesh, ...lines)
        grp.rotation.x = -Math.PI / 2; // 땅에 평행하게 회전
        grp.position.x -= size * rectWidth / 2
        grp.position.z -= size * rectWidth / 2
        return grp
    }


    // 🔷 중복 없이 헥사곤 확장 방식으로 그리기
    createOptimizedHexGrid(rows: number, cols: number, size: number) {
        const sqrt3 = Math.sqrt(3);
        const width = size * 2;         // 육각형 한 칸의 가로 길이
        const height = sqrt3 * size;    // 육각형 한 칸의 세로 길이

        const hexLines = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let x = col * width * 0.75;  // 가로로 3/4씩 이동
                let y = row * height;

                if (col % 2 === 1) {
                    y += height / 2; // 짝수 행은 반칸 아래로 이동
                }

                // 육각형 꼭지점 계산 (중복 방지)
                let A = new THREE.Vector3(x - size, y, 0);
                let B = new THREE.Vector3(x - size / 2, y - height / 2, 0);
                let C = new THREE.Vector3(x + size / 2, y - height / 2, 0);
                let D = new THREE.Vector3(x + size, y, 0);
                let E = new THREE.Vector3(x + size / 2, y + height / 2, 0);
                let F = new THREE.Vector3(x - size / 2, y + height / 2, 0);

                // 각 육각형이 확장하면서 새로운 선만 추가
                if (col === 0) { // 첫 번째 열은 왼쪽 선 추가
                    hexLines.push(A, B);
                    hexLines.push(F, A);
                }
                if (row === 0 || col % 2 === 1) { // 첫 번째 행과 홀수열에는 상단 추가
                    hexLines.push(B, C);
                }
                hexLines.push(C, D);
                hexLines.push(D, E);
                hexLines.push(E, F);
            }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(hexLines);
        const material = new THREE.LineBasicMaterial({ color: 0x000000 });
        const hex = new THREE.LineSegments(geometry, material);
        hex.rotation.x = -Math.PI / 2; // 땅에 평행하게 회전
        const hexWidth = size * cols
        const hexheight = size * rows
        hex.position.x -= hexWidth
        hex.position.z += hexheight

        return hex
    }

    createOptimizedHexGridMesh(rows: number, cols: number, size: number, color: number) {
        // 헥사타일 설정
        const hexRadius = size; // 육각형 한 변의 길이
        const x = 0.86
        const hexWidth = Math.sqrt(3) * hexRadius * x; // 육각형 가로 크기
        const hexHeight = 2 * hexRadius * x; // 육각형의 세로 크기

        // 맵 크기 (육각형 개수)
        const mapWidth = cols; // 가로 육각형 개수
        const mapHeight = rows; // 세로 육각형 개수

        // 육각형 Geometry & Material (InstancedMesh용)
        const hexGeometry = new THREE.CircleGeometry(hexRadius, 6); // 6면체 원형 → 육각형
        const hexMaterial = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
        // 🔲 개별적인 `LineSegments`를 추가하는 함수
        const createHexOutline = (x: number, y: number) => {
            const edgesGeometry = new THREE.EdgesGeometry(hexGeometry);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
            const line = new THREE.LineSegments(edgesGeometry, lineMaterial);

            line.position.set(x, y, 0);
            return line;
        }
        // InstancedMesh 생성 (mapWidth * mapHeight 크기)
        const hexCount = mapWidth * mapHeight;
        const hexMesh = new THREE.InstancedMesh(hexGeometry, hexMaterial, hexCount);

        // 행렬(Matrix) 생성하여 위치 설정
        const dummy = new THREE.Object3D();
        let index = 0;
        const lines: THREE.LineSegments[] = []

        for (let row = 0; row < mapHeight; row++) {
            for (let col = 0; col < mapWidth; col++) {
                // 육각형의 x, y 위치 계산
                const x = col * hexWidth;
                const y = -row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0); // 홀수 열(col)은 y 좌표를 반 칸 이동

                dummy.position.set(x, y, 0);
                dummy.updateMatrix();
                hexMesh.setMatrixAt(index++, dummy.matrix);
                lines.push(createHexOutline(x, y))
            }
        }
        // hexMesh.rotation.x = -Math.PI / 2; // 땅에 평행하게 회전
        // hexMesh.position.x -= size * cols
        // hexMesh.position.z -= size * rows
        const grp = new THREE.Group()
        grp.add(hexMesh, ...lines)
        grp.rotation.x = -Math.PI / 2; // 땅에 평행하게 회전
        grp.position.x -= size * cols
        grp.position.z -= size * rows
        return grp
    }



}
