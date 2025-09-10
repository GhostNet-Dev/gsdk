// AudioManagerMulti.ts
import * as THREE from 'three'
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import { SoundType } from '@Glibs/types/soundtypes';

type FadeOpts = { fadeIn?: number; fadeOut?: number };
type PlayOpts = { loop?: boolean; volume?: number } & FadeOpts;

type BgmTrack = {
  name: string;
  url: string;
  el: HTMLAudioElement;
  src: MediaElementAudioSourceNode;
  gain: GainNode;
  isPlaying: boolean;
};

export class AudioManagerMulti {
  public readonly listener = new THREE.AudioListener();
  private ctx: AudioContext;
  private masterGain: GainNode;
  private sfxGain: GainNode;
  private bgmBus: GainNode;

  private tracks = new Map<string, BgmTrack>();

  constructor(eventCtrl: IEventController, camera: THREE.Camera) {

    // 임시 컨텍스트(카메라에 붙이면 listener.context로 자동 스위칭)
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.bgmBus = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.bgmBus.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.masterGain.gain.value = 1;
    this.sfxGain.gain.value = 1;
    this.bgmBus.gain.value = 1;
    this.attachToCamera(camera)

    eventCtrl.RegisterEventListener(EventTypes.PlayBGM, async (id: string, audioPath: SoundType, opts: PlayOpts = {}) => {
      console.log("play bgm", id, audioPath)
      await this.resumeContext()
      await this.playBgm(id, audioPath, opts);
    })
    eventCtrl.RegisterEventListener(EventTypes.StopBGM, async (id: string, opts: PlayOpts = {}) => {
      console.log("stop bgm", id)
      await this.resumeContext()
      await this.stopBgm(id, opts)
    })
    eventCtrl.RegisterEventListener(EventTypes.AllStopBGM, async (opts: PlayOpts = {}) => {
      await this.resumeContext()
      await this.stopAll(opts)
    })
  }

  attachToCamera(camera: THREE.Camera) {
    camera.add(this.listener);
    // 컨텍스트/버스 재결선
    this.ctx = this.listener.context as AudioContext;
    const newMaster = this.ctx.createGain();
    const newSfx = this.ctx.createGain();
    const newBgmBus = this.ctx.createGain();
    newMaster.gain.value = this.masterGain.gain.value;
    newSfx.gain.value = this.sfxGain.gain.value;
    newBgmBus.gain.value = this.bgmBus.gain.value;

    newSfx.connect(newMaster);
    newBgmBus.connect(newMaster);
    newMaster.connect(this.listener.getInput());

    this.masterGain = newMaster;
    this.sfxGain = newSfx;
    this.bgmBus = newBgmBus;

    // 기존 트랙들도 새 컨텍스트로 재배선 필요 → 간단히 트랙 재생 시점에 다시 생성하도록 처리
    // (이미 켜져 있으면 아래 reconnectAll 호출)
    this.reconnectAll();
  }

  async resumeContext() {
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  setMasterVolume(v: number) { this.masterGain.gain.value = THREE.MathUtils.clamp(v, 0, 1); }
  setBgmBusVolume(v: number) { this.bgmBus.gain.value = THREE.MathUtils.clamp(v, 0, 1); }

  /** 개별 트랙 볼륨 */
  setTrackVolume(name: string, v: number) {
    const t = this.tracks.get(name);
    if (t) t.gain.gain.value = THREE.MathUtils.clamp(v, 0, 1);
  }

  /** 여러 개의 BGM 중 하나 재생 (이미 존재하면 재사용) */
  async playBgm(name: string, url: string, opts: PlayOpts = {}) {
    const { loop = true, volume = 1.0, fadeIn = 0 } = opts;
    let t = this.tracks.get(name);

    if (!t) {
      const el = new Audio();
      el.src = url;
      el.loop = loop;
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      el.volume = 1.0;

      const src = this.ctx.createMediaElementSource(el);
      const g = this.ctx.createGain();
      g.gain.value = (fadeIn && fadeIn > 0) ? 0 : volume;

      src.connect(g).connect(this.bgmBus);

      t = { name, url, el, src, gain: g, isPlaying: false };
      this.tracks.set(name, t);
    } else {
      // 기존 트랙이면 볼륨/루프/연결 확인
      t.el.loop = loop;
      if (t.gain.gain.value !== volume && (!fadeIn || fadeIn <= 0)) {
        t.gain.gain.value = volume;
      }
      // // 소스가 죽었거나 컨텍스트 바뀌었으면 재연결
      // // try { t.src.disconnect(); } catch { }
      // t.src = this.ctx.createMediaElementSource(t.el);
      // t.src.connect(t.gain).connect(this.bgmBus);
    }

    await this.safePlay(t.el);
    t.isPlaying = true;

    if (fadeIn && fadeIn > 0) {
      this.linearFade(t.gain.gain, 0, volume, fadeIn);
    }
  }

  /** 다른 트랙들은 끄고 이 트랙만 재생 */
  async playExclusive(name: string, url: string, opts: PlayOpts = {}) {
    const { fadeOut = 0 } = opts;
    await this.playBgm(name, url, opts);
    for (const [n, tr] of this.tracks) {
      if (n !== name) this.stopBgm(n, { fadeOut });
    }
  }

  /** 특정 트랙 정지(페이드아웃 선택) */
  stopBgm(name: string, opts: FadeOpts = {}) {
    const t = this.tracks.get(name);
    if (!t) return;

    const doStop = () => {
      try { t.el.pause(); } catch { }
      t.isPlaying = false;
      // 필요 시 완전 해제하고 싶다면 아래 주석 해제
      // try { t.src.disconnect(); } catch {}
      // this.tracks.delete(name);
    };

    const { fadeOut = 0 } = opts;
    if (fadeOut && fadeOut > 0) {
      const from = t.gain.gain.value;
      this.linearFade(t.gain.gain, from, 0, fadeOut, doStop);
    } else {
      doStop();
    }
  }

  /** 전부 정지 */
  stopAll(opts: FadeOpts = {}) {
    for (const name of this.tracks.keys()) this.stopBgm(name, opts);
  }

  /** A→B 크로스페이드 (둘 다 이미 추가되어 있거나 자동 생성) */
  async crossfade(fromName: string, toName: string, toUrl: string, duration = 2.0) {
    // 대상 켜기(0 볼륨에서 시작)
    await this.playBgm(toName, toUrl, { volume: 1.0, fadeIn: duration });

    const from = this.tracks.get(fromName);
    if (from && from.isPlaying) {
      this.stopBgm(fromName, { fadeOut: duration });
    }
  }

  /** 간단 듀킹: BGM 전체를 살짝 낮추고 복귀 */
  duckBgmBus(amount = 0.5, ms = 300) {
    const now = this.ctx.currentTime;
    const g = this.bgmBus.gain;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(amount, now, ms / 1000);
    g.setTargetAtTime(1.0, now + ms / 1000, 0.5);
  }

  /** 내부 유틸 */
  private reconnectAll() {
    for (const t of this.tracks.values()) {
      try { t.src.disconnect(); } catch { }
      t.src = this.ctx.createMediaElementSource(t.el);
      t.src.connect(t.gain).connect(this.bgmBus);
    }
  }

  private linearFade(
    param: AudioParam,
    from: number,
    to: number,
    seconds: number,
    onDone?: () => void
  ) {
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(from, now);
    param.linearRampToValueAtTime(to, now + seconds);
    if (onDone) setTimeout(onDone, seconds * 1000);
  }

  private async safePlay(el: HTMLAudioElement) {
    try {
      await el.play();
    } catch {
      // 사용자 제스처 전이면 실패 → 나중에 resumeContext() 후 재시도 가능
    }
  }
}
