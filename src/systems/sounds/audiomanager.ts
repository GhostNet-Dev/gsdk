// AudioManager.ts
import * as THREE from "three";

export type SfxOptions = {
  position?: THREE.Vector3;  // 주면 3D PositionalAudio, 없으면 일반 Audio
  loop?: boolean;
  volume?: number;           // 0.0 ~ 1.0
  detune?: number;           // 센트 단위(재생속도/피치)
  playbackRate?: number;     // 1.0 기본
};

export class AudioManager {
  public readonly listener = new THREE.AudioListener();
  private audioLoader = new THREE.AudioLoader();

  // Web Audio 노드 (마스터/버스)
  private ctx: AudioContext;
  private masterGain: GainNode;
  private sfxGain: GainNode;
  private bgmGain: GainNode;

  // BGM (HTMLAudioElement 스트리밍)
  private bgmEl?: HTMLAudioElement;
  private bgmSrcNode?: MediaElementAudioSourceNode;

  // 페이드 중첩 방지
  private currentFade?: {
    gain: GainNode;
    from: number; to: number;
    startAt: number;
    duration: number;
    raf: number;
  };

  constructor() {
    // 임시 Context (listener가 붙으면 대체됨)
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.bgmGain = this.ctx.createGain();

    // 체인: SFX/BGM → Master → Destination
    this.sfxGain.connect(this.masterGain);
    this.bgmGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // 기본 볼륨
    this.masterGain.gain.value = 1.0;
    this.sfxGain.gain.value = 1.0;
    this.bgmGain.gain.value = 1.0;
  }

  /** 카메라에 리스너를 붙이고, 내부 컨텍스트를 listener.context로 스위칭 */
  attachToCamera(camera: THREE.Camera) {
    camera.add(this.listener);
    // three.js의 AudioListener가 가진 Web Audio Context로 노드 재결선
    this.ctx = this.listener.context as AudioContext;

    // 새 컨텍스트에 새 노드 생성 후 볼륨 계승
    const newMaster = this.ctx.createGain();
    const newSfx = this.ctx.createGain();
    const newBgm = this.ctx.createGain();
    newMaster.gain.value = this.masterGain.gain.value;
    newSfx.gain.value = this.sfxGain.gain.value;
    newBgm.gain.value = this.bgmGain.gain.value;

    // 체인 재구성: SFX/BGM → Master → listener의 입력
    newSfx.connect(newMaster);
    newBgm.connect(newMaster);
    newMaster.connect(this.listener.getInput());

    // 교체
    this.masterGain = newMaster;
    this.sfxGain = newSfx;
    this.bgmGain = newBgm;

    // BGM SrcNode도 새 컨텍스트로 재생성 필요(사용 시점에 자동 연결)
    if (this.bgmEl) {
      this.connectBgmElement(this.bgmEl);
    }
  }

  /** 사용자 제스처 이후 호출(모바일 자동재생 정책 대응) */
  async resumeContext() {
    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }
  }

  setMasterVolume(v: number) { this.masterGain.gain.value = THREE.MathUtils.clamp(v, 0, 1); }
  setSfxVolume(v: number) { this.sfxGain.gain.value = THREE.MathUtils.clamp(v, 0, 1); }
  setBgmVolume(v: number) { this.bgmGain.gain.value = THREE.MathUtils.clamp(v, 0, 1); }

  /** 짧은 효과음 로드 (버퍼) */
  async loadSfxBuffer(url: string): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(url, resolve, undefined, reject);
    });
  }

  /** SFX 재생 (position 주면 포지셔널) */
  playSfx(buffer: AudioBuffer, opts: SfxOptions = {}, attachTo?: THREE.Object3D): THREE.Audio | THREE.PositionalAudio {
    const is3D = !!(opts.position || attachTo);
    const node = is3D ? new THREE.PositionalAudio(this.listener) : new THREE.Audio(this.listener);
    node.setBuffer(buffer);
    node.setLoop(!!opts.loop);
    node.setVolume(opts.volume ?? 1.0);
    if (opts.playbackRate !== undefined) node.setPlaybackRate(opts.playbackRate);
    if ((node as any).detune !== undefined && opts.detune !== undefined) {
      (node as any).detune = opts.detune;
    }

    // sfx 버스에 라우팅
    // three의 Audio는 내부적으로 listener.getInput()에 연결됨 → 버스 게인을 적용하려면 별도 라우팅 필요
    // 간단히: node.setVolume() + sfxGain으로 듀킹/전체 조절
    // (three의 내장 체인 위에 버스 게인을 덧씌우는 구조로 충분)

    if (is3D) {
      // 거리/롤오프 기본값(필요 시 조정)
      const pa = node as THREE.PositionalAudio;
      pa.setRefDistance(3);
      pa.setRolloffFactor(1);
      pa.setDistanceModel('inverse'); // 'linear'|'inverse'|'exponential'
      if (attachTo) attachTo.add(pa);
      if (opts.position && !attachTo) {
        // 독립 오브젝트로 배치하고 싶다면 호출측에서 씬에 add 필요
        pa.position.copy(opts.position);
      }
    }

    node.play();
    return node;
  }

  /** 간단 BGM (HTMLAudioElement 스트리밍) */
  async playBgm(url: string, { loop = true, volume = 1.0 } = {}) {
    // 기존 정리
    this.stopBgm();

    const el = new Audio();
    el.src = url;
    el.loop = loop;
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    el.volume = 1.0; // 실제 볼륨은 bgmGain으로 제어(듀킹/크로스페이드용)

    this.bgmEl = el;
    this.connectBgmElement(el);

    await el.play().catch(() => {/* 사용자가 gesture 전에 호출하면 실패할 수 있음 */});
    this.setBgmVolume(volume);
  }

  /** 현재 BGM을 다른 곡으로 크로스페이드 전환 */
  async crossfadeTo(url: string, duration = 2.0) {
    // 새 곡 준비(보이지 않는 Gain으로 페이드 인)
    const newEl = new Audio();
    newEl.src = url;
    newEl.loop = true;
    newEl.crossOrigin = 'anonymous';
    newEl.preload = 'auto';

    // 임시 게인 노드로 페이드인 → bgmGain으로 합류
    const tempGain = this.ctx.createGain();
    tempGain.gain.value = 0.0;
    const src = this.ctx.createMediaElementSource(newEl);
    src.connect(tempGain).connect(this.bgmGain);

    await newEl.play().catch(() => { /* gesture 필요 */ });

    // 기존 bgmGain 자체를 페이드아웃하면 SFX 듀킹에 영향 없음
    const start = this.ctx.currentTime;
    const end = start + duration;

    // 페이드 아웃: 기존 bgmGain (상대적)
    const oldStart = this.bgmGain.gain.value;
    this.bgmGain.gain.cancelScheduledValues(start);
    this.bgmGain.gain.setValueAtTime(oldStart, start);
    this.bgmGain.gain.linearRampToValueAtTime(0.0, end);

    // 페이드 인: tempGain
    tempGain.gain.cancelScheduledValues(start);
    tempGain.gain.setValueAtTime(0.0, start);
    tempGain.gain.linearRampToValueAtTime(1.0, end);

    // 완료 후 스왑
    setTimeout(() => {
      this.stopBgm();
      // 새 엘리먼트를 정식 bgm으로 승격
      this.bgmEl = newEl;
      this.bgmSrcNode = src;
      // bgmGain 볼륨을 1.0로 복원(원한다면 직전 값을 기억해 복원)
      this.bgmGain.gain.value = 1.0;
    }, duration * 1000);
  }

  /** 효과음이 클 때 배경음 살짝 낮추는 듀킹(ducking) */
  duckBgm(amount = 0.5, ms = 300) {
    const now = this.ctx.currentTime;
    const target = THREE.MathUtils.clamp(amount, 0, 1);
    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setTargetAtTime(target, now, ms / 1000);
    // 천천히 복귀
    this.bgmGain.gain.setTargetAtTime(1.0, now + ms / 1000, 0.5);
  }

  stopBgm() {
    try { this.bgmEl?.pause(); } catch {}
    try { this.bgmEl && (this.bgmEl.src = ''); } catch {}
    try { this.bgmSrcNode?.disconnect(); } catch {}
    this.bgmEl = undefined;
    this.bgmSrcNode = undefined;
  }

  /** 리버브/필터 등 노드 체인 추가 예시(간단 로우패스) */
  addBgmLowpass(freq = 1200) {
    const biquad = this.ctx.createBiquadFilter();
    biquad.type = 'lowpass';
    biquad.frequency.value = freq;
    // bgmGain 앞에 삽입: bgm → biquad → master
    this.bgmGain.disconnect();
    this.bgmGain.connect(biquad).connect(this.masterGain);
  }

  private connectBgmElement(el: HTMLAudioElement) {
    try {
      // 기존 연결 제거
      this.bgmSrcNode?.disconnect();
    } catch {}

    // 새 컨텍스트로 소스 노드 생성
    this.bgmSrcNode = this.ctx.createMediaElementSource(el);
    this.bgmSrcNode.connect(this.bgmGain);
  }
}
