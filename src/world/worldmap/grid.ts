function createGrid(size: number, divisions: number) {
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
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    return new THREE.LineSegments(geometry, material);
}


// 🔷 중복 없이 헥사곤 확장 방식으로 그리기
function createOptimizedHexGrid(rows: number, cols: number, size: number) {
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
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    return new THREE.LineSegments(geometry, material);
}
