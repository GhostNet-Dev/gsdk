import * as tfvis from '@tensorflow/tfjs-vis';

export class Visualization {
  private rewardContainer: HTMLElement;
  private lossContainer: HTMLElement;
  private epsilonContainer: HTMLElement;

  private rewardData: { x: number; y: number }[] = [];
  private lossData: { x: number; y: number }[] = [];
  private epsilonData: { x: number; y: number }[] = [];

  constructor() {
    this.addDynamicStyle(`
.vis {
    position: absolute;
    bottom: 0;
    left: 50%;
}
        `)
    const dom = document.createElement("div")
    dom.id = "visualization-container"
    dom.classList.add("vis")
    this.rewardContainer = document.createElement("div");
    this.rewardContainer.id = 'reward-chart';
    this.lossContainer = document.createElement('div')
    this.lossContainer.id = 'loss-chart';
    this.epsilonContainer = document.createElement('div')
    this.epsilonContainer.id = 'epsilon-chart';
    dom.appendChild(this.rewardContainer)
    dom.appendChild(this.lossContainer)
    dom.appendChild(this.epsilonContainer)
    document.body.appendChild(dom)
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
  addDynamicStyle(css: string): void {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = css;
    document.head.appendChild(style);
  }
}

