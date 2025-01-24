import * as tfvis from '@tensorflow/tfjs-vis';

export class Visualization {
  private rewardContainer: HTMLElement;
  private lossContainer: HTMLElement;
  private epsilonContainer: HTMLElement;

  private rewardData: { x: number; y: number }[] = [];
  private lossData: { x: number; y: number }[] = [];
  private epsilonData: { x: number; y: number }[] = [];
  dom = document.createElement("div")

  constructor() {
    this.applyDynamicStyle("visTensor", `
.vis {
    position: absolute;
    bottom: 0;
    left: 0;
    opacity: 0.5;
}
        `)
    this.dom.id = "visualization-container"
    this.dom.classList.add("vis")
    this.rewardContainer = document.createElement("div");
    this.rewardContainer.id = 'reward-chart';
    this.lossContainer = document.createElement('div')
    this.lossContainer.id = 'loss-chart';
    this.epsilonContainer = document.createElement('div')
    this.epsilonContainer.id = 'epsilon-chart';
    this.dom.appendChild(this.rewardContainer)
    this.dom.appendChild(this.lossContainer)
    this.dom.appendChild(this.epsilonContainer)
    document.body.appendChild(this.dom)
  }
  Dispose() {
    document.body.removeChild(this.dom)
    this.dom.remove()
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
        width: window.innerWidth,
        height: 100,
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
        width: window.innerWidth,
        height: 100,
      }
    );
  }

  // 에피소드의 탐험 비율(Epsilon) 업데이트 및 시각화
  public updateEpsilon(episode: number, epsilon: number): void {
    console.log(`update Epsilon: [${episode}], ${epsilon}`)
    this.epsilonData.push({ x: episode, y: epsilon });
    tfvis.render.linechart(
      this.epsilonContainer,
      { values: this.epsilonData, series: ['Epsilon'] },
      {
        xLabel: 'Episode',
        yLabel: 'Epsilon',
        width: window.innerWidth,
        height: 100,
      }
    );
  }
  applyDynamicStyle(styleId: string, css: string) {
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = css;
      document.head.appendChild(style); // <head>에 스타일 추가
    } else {
      console.log("Style already applied.");
    }
  }
}

