import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

type Task = () => Promise<void>;
export interface IProgressBar {
    Dom: HTMLElement
    SetProgress(progress: number): void
    Create(): void
    Delete(): void
}

export default class LoadingMgr {
    private taskQueue: Task[] = [];
    private loadingCompleteTask?: Task;
    private completedTasks: number = 0;
    private totalTasks: number = 0;
    private isRunning: boolean = false;
    private closeTimeout: any = null;

    constructor(eventCtrl: IEventController, private progressBar: IProgressBar) {
        eventCtrl.RegisterEventListener(EventTypes.RegLoadingCommonItems, (task: Task) => {
            this.taskQueue.push(task);
        })
        eventCtrl.RegisterEventListener(EventTypes.RegLoadingCompleteCommonItem, (task: Task) => {
            this.loadingCompleteTask = task
        })
        eventCtrl.RegisterEventListener(EventTypes.LoadingStart, (interval: number = 300) => {
          this.startProcessing(interval)
        })
    }
    public startProcessing(interval: number = 300): void {
        if (this.isRunning || this.taskQueue.length === 0) {
            return; // 이미 실행 중이거나 작업이 없으면 시작하지 않음
        }

        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout);
            this.closeTimeout = null;
        }

        this.progressBar.Create();
        if (this.progressBar.Dom.parentNode !== document.body) {
            document.body.appendChild(this.progressBar.Dom)
        }

        // 상태 초기화
        this.isRunning = true;
        this.completedTasks = 0;
        this.totalTasks = this.taskQueue.length;
        this.updateProgress();

        const processNextTask = async () => {
            if (!this.isRunning) return; // 이미 종료된 경우 중단

            // 처리할 작업이 남아있는 경우
            if (this.taskQueue.length > 0) {
                const task = this.taskQueue.shift(); // 대기열에서 작업 하나를 꺼냄
                if (task) {
                    // 작업을 실행하고 완료되면 다음 단계로 진행
                    await task()
                        .then(() => {
                            this.completedTasks++;
                            this.updateProgress();
                            setTimeout(processNextTask, interval);
                        })
                        .catch((err) => {
                            console.error("Loading task failed:", err);
                            this.completedTasks++; // 실패해도 진행률은 올림
                            this.updateProgress();
                            setTimeout(processNextTask, interval);
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
    private finishProcessing(): void {
        if (!this.isRunning) return; // 중복 방지

        this.isRunning = false;
        this.close();
        this.completedTasks = 0;
        this.totalTasks = 0;
        this.taskQueue = [];
    }
    /**
     * 진행률 UI를 현재 상태에 맞게 업데이트합니다.
     */
    private updateProgress(): void {
        const percentage = this.totalTasks > 0 ? (this.completedTasks / this.totalTasks) * 100 : 0;
        this.progressBar.SetProgress(percentage)
        console.log(`Loading Progress: ${percentage.toFixed(1)}%`);

        if (percentage >= 100) {
            this.finishProcessing();
        }
    }
    private async close() {
        if (this.loadingCompleteTask) {
            await this.loadingCompleteTask();
            this.loadingCompleteTask = undefined; // 사용 후 초기화
        }
        this.progressBar.SetProgress(100)

        // UI 제거 및 리소스 정리
        this.closeTimeout = setTimeout(() => {
            this.progressBar.Delete()
            if (this.progressBar.Dom.parentNode === document.body) {
                document.body.removeChild(this.progressBar.Dom)
            }
            this.closeTimeout = null;
        }, 500);
        console.log("모든 로딩 작업 완료.");
    }
    }