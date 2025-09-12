import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
/**
 * 실행할 작업을 정의하는 타입.
 * 각 작업은 완료를 나타내는 Promise를 반환해야 합니다.
 */
type Task = () => Promise<void>;

export default class WheelLoader {
  private taskQueue: Task[] = [];
  private completedTasks: number = 0;
  private totalTasks: number = 0;
  private isRunning: boolean = false;
  private progressElement: HTMLProgressElement;
  private cogsElement: HTMLElement;
  private element: HTMLElement;
  private wrapper: HTMLDivElement;

  constructor(eventCtrl: IEventController) {
    this.wrapper = document.createElement("div") as HTMLDivElement
    this.wrapper.className = "loading"
    this.wrapper.innerHTML = html
    this.applyDynamicStyle("wheelloader", css)
    document.body.appendChild(this.wrapper)
    this.element = document.querySelector(".wheelLoader") as HTMLElement
    this.progressElement = this.element.querySelector("progress") as HTMLProgressElement;
    this.cogsElement = this.element.querySelector(".cogs") as HTMLElement;
    this.reset();
    eventCtrl.RegisterEventListener(EventTypes.LoadingProgress, (value: number) => {
      this.load(value)
    })
    eventCtrl.RegisterEventListener(EventTypes.RegisterLoadingItems, (task: Task) => {
      this.taskQueue.push(task);
    })
  }
  public startProcessing(interval: number = 300): void {
    if (this.isRunning || this.taskQueue.length === 0) {
      return; // 이미 실행 중이거나 작업이 없으면 시작하지 않음
    }

    // 상태 초기화
    this.isRunning = true;
    this.completedTasks = 0;
    this.totalTasks = this.taskQueue.length;
    this.updateProgress();

    const processNextTask = () => {
      // 처리할 작업이 남아있는 경우
      if (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift(); // 대기열에서 작업 하나를 꺼냄
        if (task) {
          // 작업을 실행하고 완료되면 다음 단계로 진행
          task().then(() => {
            this.completedTasks++;
            this.updateProgress();
            setTimeout(processNextTask, interval); // 다음 작업 전 지연
          });
        }
      } else {
        // 모든 작업이 완료된 경우
        this.finishProcessing();
      }
    };

    // 첫 작업 시작
    processNextTask();
  }

  /**
   * 진행률 UI를 현재 상태에 맞게 업데이트합니다.
   */
  private updateProgress(): void {
    const percentage = this.totalTasks > 0 ? (this.completedTasks / this.totalTasks) * 100 : 0;
    this.progressElement.style.width = `${percentage}%`;
  }

  /**
   * 모든 작업이 완료되었을 때 호출되는 정리 함수.
   */
  private finishProcessing(): void {
    this.isRunning = false;
    this.close();
    console.log("모든 작업 완료.");
  }
  loadCSS(filename: string) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = filename;
      link.type = 'text/css';

      link.onload = () => resolve(`${filename} loaded successfully`);
      link.onerror = () => reject(new Error(`Failed to load ${filename}`));

      document.head.appendChild(link);
    });
  }
  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  private async load(value: number) {
    this.progressElement = this.element.querySelector("progress") as HTMLProgressElement;
    console.log(value, ": ", this.progressElement)
    if (this.progressElement) {
      this.progressElement.value = value;
      await this.sleep(1)
    }
    if (value === 100) {
      this.close();
    }
  }

  private reset() {
    if (this.cogsElement && this.progressElement) {
      // Animate cogs element (opacity and margin-top)
      this.cogsElement.style.transition = "margin-top 0.3s, opacity 0.3s";
      this.cogsElement.style.marginTop = "0";
      this.cogsElement.style.opacity = "1";

      setTimeout(() => {
        // Reset progress element
        this.progressElement.value = 0;
        this.progressElement.style.display = "block";
        this.progressElement.style.transition = "width 0.5s";
        this.progressElement.style.width = "100%";
      }, 300);
    }
  }

  private close() {
    if (this.progressElement && this.cogsElement) {
      // Animate progress element (width)
      setTimeout(() => {
        this.progressElement.style.display = "none";

        // Animate cogs element (opacity and margin-top)
        this.cogsElement.style.transition = "margin-top 0.3s, opacity 0.3s";
        this.cogsElement.style.marginTop = "-50px";
        this.cogsElement.style.opacity = "0";
        this.wrapper.style.display = "none"
      }, 500);
    }
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


const html = `
<div id="loadwrapper" class="wheelLoader pt-4">
  <div class="cogs"><svg height=50px width=50px viewBox="0 0 900 900"><g class=cog transform=" translate(90,0)"><path transform=scale(0.5) fill="#fff" d="M249.773 763.25q-5 -20 -23.75 -31.25t-40 -5l-76.25 22.5q-21.25 6.25 -43.75 -3.125t-32.5 -28.125l-26.25 -45q-10 -18.75 -6.25 -42.5t18.75 -38.75l56.25 -55q15 -15 15 -36.25t-15 -36.25l-56.25 -55q-16.25 -15 -18.75 -38.75t7.5 -42.5l25 -46.25q10 -18.75 32.5 -27.5t43.75 -2.5l76.25 21.25q21.25 6.25 40 -5t23.75 -31.25l18.75 -76.25q6.25 -21.25 25 -36.25t40 -15l51.25 0q21.25 0 40 15t25 36.25l20 76.25q6.25 21.25 24.375 31.25t38.125 5l76.25 -21.25q21.25 -6.25 43.75 2.5t32.5 27.5l26.25 46.25q10 18.75 6.25 42.5t-18.75 38.75l-56.25 55q-16.25 15 -15.625 36.25t15.625 36.25l56.25 55q15 15 18.75 38.75t-6.25 42.5l-26.25 45q-10 18.75 -32.5 28.125t-43.75 3.125l-76.25 -22.5q-20 -5 -38.125 5t-24.375 31.25l-20 77.5q-6.25 21.25 -25 35.625t-40 14.375l-51.25 0q-21.25 0 -40 -14.375t-25 -35.625zm110 -366.25q-43.75 0 -74.375 30.625t-30.625 73.125 30.625 73.125 74.375 30.625q42.5 0 73.125 -30t30.625 -73.75 -30.625 -73.75 -73.125 -30z"/></g></svg>    <svg height=65px width=65px viewBox="0 0 900 900"><g class="cog cog-opp"transform=translate(30,0)><path transform=scale(0.5) fill="#fff"  d="M249.773 763.25q-5 -20 -23.75 -31.25t-40 -5l-76.25 22.5q-21.25 6.25 -43.75 -3.125t-32.5 -28.125l-26.25 -45q-10 -18.75 -6.25 -42.5t18.75 -38.75l56.25 -55q15 -15 15 -36.25t-15 -36.25l-56.25 -55q-16.25 -15 -18.75 -38.75t7.5 -42.5l25 -46.25q10 -18.75 32.5 -27.5t43.75 -2.5l76.25 21.25q21.25 6.25 40 -5t23.75 -31.25l18.75 -76.25q6.25 -21.25 25 -36.25t40 -15l51.25 0q21.25 0 40 15t25 36.25l20 76.25q6.25 21.25 24.375 31.25t38.125 5l76.25 -21.25q21.25 -6.25 43.75 2.5t32.5 27.5l26.25 46.25q10 18.75 6.25 42.5t-18.75 38.75l-56.25 55q-16.25 15 -15.625 36.25t15.625 36.25l56.25 55q15 15 18.75 38.75t-6.25 42.5l-26.25 45q-10 18.75 -32.5 28.125t-43.75 3.125l-76.25 -22.5q-20 -5 -38.125 5t-24.375 31.25l-20 77.5q-6.25 21.25 -25 35.625t-40 14.375l-51.25 0q-21.25 0 -40 -14.375t-25 -35.625zm110 -366.25q-43.75 0 -74.375 30.625t-30.625 73.125 30.625 73.125 74.375 30.625q42.5 0 73.125 -30t30.625 -73.75 -30.625 -73.75 -73.125 -30z"/></g></svg>    <svg height=65px width=65px viewBox="0 0 900 900"><g class=cog transform=translate(30,0)><path transform=scale(0.5) fill="#fff" d="M249.773 763.25q-5 -20 -23.75 -31.25t-40 -5l-76.25 22.5q-21.25 6.25 -43.75 -3.125t-32.5 -28.125l-26.25 -45q-10 -18.75 -6.25 -42.5t18.75 -38.75l56.25 -55q15 -15 15 -36.25t-15 -36.25l-56.25 -55q-16.25 -15 -18.75 -38.75t7.5 -42.5l25 -46.25q10 -18.75 32.5 -27.5t43.75 -2.5l76.25 21.25q21.25 6.25 40 -5t23.75 -31.25l18.75 -76.25q6.25 -21.25 25 -36.25t40 -15l51.25 0q21.25 0 40 15t25 36.25l20 76.25q6.25 21.25 24.375 31.25t38.125 5l76.25 -21.25q21.25 -6.25 43.75 2.5t32.5 27.5l26.25 46.25q10 18.75 6.25 42.5t-18.75 38.75l-56.25 55q-16.25 15 -15.625 36.25t15.625 36.25l56.25 55q15 15 18.75 38.75t-6.25 42.5l-26.25 45q-10 18.75 -32.5 28.125t-43.75 3.125l-76.25 -22.5q-20 -5 -38.125 5t-24.375 31.25l-20 77.5q-6.25 21.25 -25 35.625t-40 14.375l-51.25 0q-21.25 0 -40 -14.375t-25 -35.625zm110 -366.25q-43.75 0 -74.375 30.625t-30.625 73.125 30.625 73.125 74.375 30.625q42.5 0 73.125 -30t30.625 -73.75 -30.625 -73.75 -73.125 -30z"/></g></svg></div>
  <progress value="0" max="100"></progress>
</div>
`;
const css = `
.loading {
    position: absolute;
  width: 100%;
  height: 100%;
  background: #44a8df;
  z-index: 10;
}

#loadwrapper {
  width: 50%;
  margin: 0 auto 0;
  text-align: center;
  white-space: pre-line;
  vertical-align: middle;
}

.cogs {
  height: auto;
  display: inline-block;
}

svg {
  float: left;
}

svg:first-child {
  margin-top: -10px;
}

svg:nth-child(2) {
  margin-left: -4px;
  margin-top: -6px;
}

svg:nth-child(3) {
  clear: left;
  float: left;
  margin-top: -24px;
  margin-left: 6px;
}

progress {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  margin: 10px auto;
  clear: left;
  display: inline-block;
}

progress[value]::-webkit-progress-value {
  background: #fff;
  border-radius: 2px;
}

progress[value]::-webkit-progress-bar {
  border-radius: 10px;
  border: 2px solid #fff
}


/* Animations */

@-webkit-keyframes rotate {
  from {
    -webkit-transform: rotate(0);
  }
  to {
    -webkit-transform: rotate(360deg);
  }
}

@-webkit-keyframes rotate-opp {
  from {
    -webkit-transform: rotate(0);
  }
  to {
    -webkit-transform: rotate(-360deg);
  }
}

.cog * {
  -webkit-animation: rotate 3s infinite;
  -webkit-transform-origin: 50% 50%;
  -webkit-animation-timing-function: linear;
}

.cog-opp * {
  -webkit-animation: rotate-opp 3s infinite;
  -webkit-transform-origin: 50% 50%;
  -webkit-animation-timing-function: linear;
}


/* Pre-animation cycle */

progress {
  width: 0;
  display: none;
}

.cogs {
  margin-top: -50px;
  opacity: 0;
}


/* Change color */

body,
progress[value]::-webkit-progress-bar {
  background: #44a8df;
}


/* Orange :D 
body,
progress[value]::-webkit-progress-bar {
  background: #d77235;
} */
`;
