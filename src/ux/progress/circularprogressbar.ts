import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import * as THREE from 'three';

export interface CircularProgressBarOptions {
  target: THREE.Object3D; // 추적할 3D 오브젝트 (필수)
  camera: THREE.Camera;   // 투영에 사용할 카메라 (필수)
  eventCtrl: IEventController
  duration: number;
  initialElapsedTime?: number;
  radius?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  offsetX?: number;
  offsetY?: number;
  zIndex?: number;
}

export class CircularProgressBar implements ILoop {
  LoopId: number = 0;
  private target: THREE.Object3D;
  private camera: THREE.Camera;
  private eventCtrl: IEventController

  private container: HTMLDivElement;
  private svg: SVGSVGElement;
  private bgCircle: SVGCircleElement;
  private progressCircle: SVGCircleElement;

  private radius: number;
  private thickness: number;
  private circumference: number = 0;
  private duration: number;
  private elapsedTime: number;

  public offsetX: number;
  public offsetY: number;

  // 매 프레임 GC(가비지 컬렉션) 부하를 막기 위한 임시 벡터
  private tempPos: THREE.Vector3 = new THREE.Vector3();

  constructor(options: CircularProgressBarOptions) {
    this.target = options.target;
    this.camera = options.camera;
    this.eventCtrl = options.eventCtrl
    this.duration = Math.max(options.duration, Number.EPSILON);
    this.elapsedTime = this.clampElapsedTime(options.initialElapsedTime ?? 0);

    this.radius = options.radius ?? 20;
    this.thickness = options.thickness ?? 4;
    this.offsetX = options.offsetX ?? 60;
    this.offsetY = options.offsetY ?? -40;
    const color = options.color ?? '#00ff00';
    const trackColor = options.trackColor ?? 'rgba(0, 0, 0, 0.6)';
    const zIndex = options.zIndex ?? 20;

    // 컨테이너 생성
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.transform = 'translate(-50%, -50%)';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = zIndex.toString();
    this.container.style.display = 'none';

    // SVG 생성
    const SVG_NS = 'http://www.w3.org/2000/svg';
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.style.transform = 'rotate(-90deg)';
    this.svg.style.transformOrigin = '50% 50%';

    this.bgCircle = document.createElementNS(SVG_NS, 'circle');
    this.bgCircle.setAttribute('fill', 'transparent');
    this.bgCircle.setAttribute('stroke', trackColor);

    this.progressCircle = document.createElementNS(SVG_NS, 'circle');
    this.progressCircle.setAttribute('fill', 'transparent');
    this.progressCircle.setAttribute('stroke', color);
    this.progressCircle.style.transition = 'stroke-dashoffset 0.1s linear';

    this.svg.appendChild(this.bgCircle);
    this.svg.appendChild(this.progressCircle);
    this.container.appendChild(this.svg);

    this.updateStyles({ radius: this.radius, thickness: this.thickness });
    this.renderProgress();
  }

  public mount(parentElement: HTMLElement = document.body, duration?:number): void {
    parentElement.appendChild(this.container);
    this.duration = duration ?? this.duration
    this.renderProgress();
    this.updateScreenPosition();
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  public updateStyles(options: Partial<CircularProgressBarOptions>): void {
    if (options.radius !== undefined) this.radius = options.radius;
    if (options.thickness !== undefined) this.thickness = options.thickness;
    if (options.offsetX !== undefined) this.offsetX = options.offsetX;
    if (options.offsetY !== undefined) this.offsetY = options.offsetY;
    if (options.color !== undefined) this.progressCircle.setAttribute('stroke', options.color);
    if (options.trackColor !== undefined) this.bgCircle.setAttribute('stroke', options.trackColor);

    const size = this.radius * 2 + this.thickness * 2;
    const center = size / 2;
    this.circumference = 2 * Math.PI * this.radius;

    this.container.style.width = `${size}px`;
    this.container.style.height = `${size}px`;
    this.svg.setAttribute('width', size.toString());
    this.svg.setAttribute('height', size.toString());

    this.bgCircle.setAttribute('cx', center.toString());
    this.bgCircle.setAttribute('cy', center.toString());
    this.bgCircle.setAttribute('r', this.radius.toString());
    this.bgCircle.setAttribute('stroke-width', (this.thickness + 2).toString());

    this.progressCircle.setAttribute('cx', center.toString());
    this.progressCircle.setAttribute('cy', center.toString());
    this.progressCircle.setAttribute('r', this.radius.toString());
    this.progressCircle.setAttribute('stroke-width', this.thickness.toString());
    this.progressCircle.setAttribute('stroke-dasharray', this.circumference.toString());

    if (!this.progressCircle.hasAttribute('stroke-dashoffset')) {
      this.progressCircle.setAttribute('stroke-dashoffset', this.circumference.toString());
    }

    this.renderProgress();
  }

  public setElapsedTime(elapsedTime: number): void {
    this.elapsedTime = this.clampElapsedTime(elapsedTime);
    this.renderProgress();
  }

  public reset(elapsedTime: number = 0): void {
    this.setElapsedTime(elapsedTime);
  }

  /**
   * 메인 렌더 루프에서 호출할 단일 업데이트 함수.
   * 생성 시 전달한 duration 기준으로 delta를 누적해 진행률을 계산합니다.
   */
  public update(delta: number): void {
    this.elapsedTime = this.clampElapsedTime(this.elapsedTime + Math.max(delta, 0));
    this.renderProgress();
    this.updateScreenPosition();
  }

  private renderProgress(): void {
    const ratio = this.elapsedTime / this.duration;
    const offset = this.circumference - (ratio * this.circumference);
    this.progressCircle.setAttribute('stroke-dashoffset', offset.toString());
  }

  private updateScreenPosition(): void {
    this.target.getWorldPosition(this.tempPos);
    this.tempPos.project(this.camera);

    // 카메라 뒤로 넘어갔는지 확인
    if (this.tempPos.z > 1) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'block';

    // 투영된 정규화 기기 좌표(NDC)를 화면 픽셀로 변환
    const x = (this.tempPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = -(this.tempPos.y * 0.5 - 0.5) * window.innerHeight;

    this.container.style.left = `${x + this.offsetX}px`;
    this.container.style.top = `${y + this.offsetY}px`;
  }

  private clampElapsedTime(elapsedTime: number): number {
    return Math.max(0, Math.min(this.duration, elapsedTime));
  }

  public destroy(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
      this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    }
  }
}
