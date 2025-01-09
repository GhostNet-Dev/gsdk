import * as tfvis from '@tensorflow/tfjs-vis';

export class Visualization {
  private rewardContainer: HTMLElement;
  private lossContainer: HTMLElement;
  private epsilonContainer: HTMLElement;

  private rewardData: { x: number; y: number }[] = [];
  private lossData: { x: number; y: number }[] = [];
  private epsilonData: { x: number; y: number }[] = [];

  constructor() {
    const dom = document.createElement("div")
    dom.id = "visualization-container"
    this.rewardContainer = document.getElementById('reward-chart')!;
    this.lossContainer = document.getElementById('loss-chart')!;
    this.epsilonContainer = document.getElementById('epsilon-chart')!;
  }

  // 에피소드의 보상 업데이트 및 시각화
  public updateReward(episode: number, reward: number): void {
    this.rewardData.push({ x: episode, y: reward });
    tfvis.render.linechart(
      this.rewardContainer,
      { values: this.rewardData, series: ['Reward'] },
      {
        xLabel: 'Episode',
        yLabel: 'Total Reward',
        width: 400,
        height: 300,
      }
    );
  }

  // 에피소드의 손실 업데이트 및 시각화
  public updateLoss(episode: number, loss: number): void {
    this.lossData.push({ x: episode, y: loss });
    tfvis.render.linechart(
      this.lossContainer,
      { values: this.lossData, series: ['Loss'] },
      {
        xLabel: 'Episode',
        yLabel: 'Loss',
        width: 400,
        height: 300,
      }
    );
  }

  // 에피소드의 탐험 비율(Epsilon) 업데이트 및 시각화
  public updateEpsilon(episode: number, epsilon: number): void {
    this.epsilonData.push({ x: episode, y: epsilon });
    tfvis.render.linechart(
      this.epsilonContainer,
      { values: this.epsilonData, series: ['Epsilon'] },
      {
        xLabel: 'Episode',
        yLabel: 'Epsilon',
        width: 400,
        height: 300,
      }
    );
  }
}

