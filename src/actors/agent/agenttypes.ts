
export type TrainingParam = {
    actionSize: number // 상, 하, 좌, 우
    gamma: number // 할인율
    epsilon: number // 탐험 비율
    epsilonDecay: number
    learningRate: number
    mapSize: number
    episode:number
    doneCount: number
    agentSkillLevel: number
    timeScale: number
    loss: string
}