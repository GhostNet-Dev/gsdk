// ============================================================================
// effects/confetti.ts — 외부 루프 제어 (DI)
// ============================================================================

import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

const COLORS = ['#ffd463', '#d8b66b', '#e9edf3', '#58a6ff', '#d87cff', '#ff5a6a'];

type ParticleType = 'blast' | 'rain';

class Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  angle: number;
  speed: number;
  size: number;
  rotationSpeed: number;

  constructor(w: number, h: number, type: ParticleType) {
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.angle = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
    this.size = Math.random() * 6 + 4;

    if (type === 'blast') {
      this.x = w / 2;
      this.y = h / 2;
      this.vx = (Math.random() - 0.5) * 20;
      this.vy = (Math.random() - 0.5) * 20 - 5;
      this.speed = 0.96;
    } else { // rain
      this.x = Math.random() * w;
      this.y = -20;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = Math.random() * 4 + 2;
      this.speed = 1;
    }
  }

  update(type: ParticleType) {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotationSpeed;

    if (type === 'blast') {
      this.vy += 0.5;
      this.vx *= this.speed;
      this.vy *= this.speed;
    } else {
      this.x += Math.sin(this.y * 0.05) * 0.5;
    }
  }
}

// ILoopable을 구현하여 외부 컨트롤러가 Update()를 호출할 수 있게 함
export class ConfettiSystem implements ILoop {
  LoopId: number = 0
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: { p: Particle, type: ParticleType }[] = [];

  private rainActive = false;
  private isRegistered = false; // 루프 등록 여부 체크

  private width = window.innerWidth;
  private height = window.innerHeight;

  // 생성자 주입 (Dependency Injection)
  constructor(private eventCtrl: IEventController) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    this.ctx = this.canvas.getContext('2d')!;

    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    });
  }

  private mount() {
    if (!this.canvas.parentElement) {
      document.body.appendChild(this.canvas);
    }
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }
  }

  // --- Public Methods ---

  public blast(amount = 120) {
    this.mount();
    for (let i = 0; i < amount; i++) {
      this.particles.push({ p: new Particle(this.width, this.height, 'blast'), type: 'blast' });
    }
    this.start();
  }

  public startRain() {
    this.mount();
    this.rainActive = true;
    this.start();
  }

  public stopRain() {
    this.rainActive = false;
    // 여기선 등록 해제하지 않음. 잔여 파티클이 사라진 후 Update 내부에서 자동 해제.
  }

  // --- Loop Control ---

  private start() {
    if (!this.isRegistered) {
      // 외부 컨트롤러에 루프 등록 요청
      this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
      this.isRegistered = true;
    }
  }

  // 외부 컨트롤러가 매 프레임 호출하는 메서드
  public update(): void {
    // 1. Rain 생성
    if (this.rainActive) {
      this.particles.push({ p: new Particle(this.width, this.height, 'rain'), type: 'rain' });
      this.particles.push({ p: new Particle(this.width, this.height, 'rain'), type: 'rain' });
    }

    // 2. 종료 조건 체크 (파티클 없고 && 비도 안 내림)
    if (this.particles.length === 0 && !this.rainActive) {
      this.ctx.clearRect(0, 0, this.width, this.height);

      // 외부 컨트롤러에 루프 해제 요청
      if (this.isRegistered) {
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);
        this.isRegistered = false;
      }
      return;
    }

    // 3. 그리기
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const { p, type } = this.particles[i];
      p.update(type);

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle * Math.PI / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();

      if (p.y > this.height + 20) {
        this.particles.splice(i, 1);
      }
    }
  }
}