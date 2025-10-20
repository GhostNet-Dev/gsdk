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

    constructor(eventCtrl: IEventController, private progressBar: IProgressBar) {
        eventCtrl.RegisterEventListener(EventTypes.RegLoadingCommonItems, (task: Task) => {
            this.taskQueue.push(task);
        })
        eventCtrl.RegisterEventListener(EventTypes.RegLoadingCompleteCommonItem, (task: Task) => {
            this.loadingCompleteTask = task
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
    private finishProcessing(): void {
        this.isRunning = false;
        this.completedTasks = 0;
        this.totalTasks = 0;
        this.taskQueue = [];
        this.close();
    }
    /**
     * 진행률 UI를 현재 상태에 맞게 업데이트합니다.
     */
    private updateProgress(): void {
        const percentage = this.totalTasks > 0 ? (this.completedTasks / this.totalTasks) * 100 : 0;
        this.progressBar.SetProgress(percentage)
        console.log(percentage)
        this.load(percentage)
    }
    private async load(value: number) {
        if (value === 100) {
            this.finishProcessing();
        }
    }
    private close() {
        this.loadingCompleteTask?.()
        this.progressBar.SetProgress(100)

        // Animate progress element (width)
        setTimeout(() => {
            this.progressBar.Delete()
        }, 500);
        console.log("모든 작업 완료.");
    }
}