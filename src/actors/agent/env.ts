
// 환경 설정 (사용자가 구현)
interface IEnvironment {
    reset(): number[]; // 상태 초기화
    step(action: number): Promise<[number[], number, boolean]>
    eventStep(action: number): Promise<[number[], number, boolean]>
    actionSpace: number; // 가능한 행동의 개수
    enable: boolean
}

