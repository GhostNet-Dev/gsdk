import { TrainingParam } from '@Glibs/types/agenttypes';
import * as tf from '@tensorflow/tfjs';

// 하이퍼파라미터
const batchSize = 32;
const replayBufferSize = 10000;

// 신경망 생성 함수
function createModel(learningRate: number, stateSize: number, actionSize: number): tf.Sequential {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [stateSize], units: 24, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
  model.add(tf.layers.dense({ units: actionSize }));
  model.compile({ optimizer: tf.train.adam(learningRate), loss: 'meanSquaredError' });
  return model;
}

// DQN 주요 구성
export default class DQNAgent {
  private model: tf.Sequential;
  private targetModel: tf.Sequential;
  private replayBuffer: { state: number[]; action: number; reward: number; nextState: number[]; done: boolean }[];
  private epsilon: number;
  private steps: number;

  constructor(private stateSize: number, private param: TrainingParam) {
    this.model = createModel(param.learningRate, stateSize, param.actionSize);
    this.targetModel = createModel(param.learningRate, stateSize, param.actionSize);
    this.replayBuffer = [];
    this.epsilon = param.epsilonStart;
    this.steps = 0;
  }
  getRandomInt(max: number): number {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  }
  selectAction(state: number[]): number {
    if (Math.random() < this.epsilon) {
      // 탐험
      return this.getRandomInt(this.param.actionSize);
    } else {
      // 최적 행동 선택
      return tf.tidy(() => {
        const qValues = this.model.predict(tf.tensor2d([state], [1, this.stateSize])) as tf.Tensor;
        return qValues.argMax(-1).dataSync()[0]; // 여기에서 arraySync() 결과를 number[]로 처리
      });
    }
  }

  storeExperience(state: number[], action: number, reward: number, nextState: number[], done: boolean): void {
    if (this.replayBuffer.length >= replayBufferSize) {
      this.replayBuffer.shift();
    }
    this.replayBuffer.push({ state, action, reward, nextState, done });
  }

  async train(): Promise<tf.History | undefined> {
    if (this.replayBuffer.length < batchSize) return;

    const batch = this.sampleBatch(batchSize);
    const states = batch.map((e) => e.state);
    const actions = batch.map((e) => e.action);
    const rewards = batch.map((e) => e.reward);
    const nextStates = batch.map((e) => e.nextState);
    const dones = batch.map((e) => e.done);

    const stateTensor = tf.tensor2d(states, [batchSize, this.stateSize]);
    const nextStateTensor = tf.tensor2d(nextStates, [batchSize, this.stateSize]);
    const qValuesNext = this.targetModel.predict(nextStateTensor) as tf.Tensor;

    // arraySync()의 리턴 타입을 number[]로 명시
    const maxQValuesNext: number[] = qValuesNext.max(1).arraySync() as number[]; // number[]로 타입 지정

    const targets = stateTensor.arraySync().map((_, i) => {
      const target = rewards[i] + (dones[i] ? 0 : this.param.gamma * maxQValuesNext[i]);
      return target;
    });

    const actionMasks = tf.oneHot(tf.tensor1d(actions, 'int32'), this.param.actionSize).arraySync() as number[][];
    const targetQValues = targets.map((t, i) =>
      actionMasks[i].map((mask: number, j: number) => (mask === 1 ? t : 0))
    );

    const targetTensor = tf.tensor2d(targetQValues, [batchSize, this.param.actionSize]);
    const history = await this.model.fit(stateTensor, targetTensor, { epochs: 1, verbose: 0 });

    this.steps++;
    //this.updateEpsilon();
    if (this.steps % 10 === 0) {
      this.updateTargetModel();
    }
    return history
  }

  private sampleBatch(batchSize: number): any[] {
    const indices = Array.from({ length: batchSize }, () => Math.floor(Math.random() * this.replayBuffer.length));
    return indices.map((i) => this.replayBuffer[i]);
  }

  updateEpsilon(): void {
    this.epsilon = Math.max(this.param.epsilonEnd, this.epsilon * this.param.epsilonDecay)
    // this.epsilon = Math.max(this.param.epsilonEnd,
    //   this.param.epsilonStart - (this.steps / this.param.epsilonDecay) *
    //   (this.param.epsilonStart - this.param.epsilonEnd));
  }

  private updateTargetModel(): void {
    this.targetModel.setWeights(this.model.getWeights());
  }
}

// 학습 루프
async function trainAgent(env: IEnvironment, agent: DQNAgent, episodes: number): Promise<void> {
  for (let e = 0; e < episodes; e++) {
    let state = env.reset();
    let totalReward = 0;

    for (let t = 0; t < 1000; t++) {
      const action = agent.selectAction(state);
      const [nextState, reward, done] = await Promise.race([
        env.step(action),
        env.eventStep(action)
      ])

      agent.storeExperience(state, action, reward, nextState, done);
      state = nextState;
      totalReward += reward;

      await agent.train();

      if (done) break;
    }
    console.log(`Episode ${e + 1}: Total Reward = ${totalReward}`);
  }
}

// 실행
// const stateSize = env.reset().length;
// const actionSize = env.actionSpace;
// const agent = new DQNAgent(stateSize, actionSize);

// trainAgent(env, agent, 1000).then(() => console.log('Training Complete!'));

