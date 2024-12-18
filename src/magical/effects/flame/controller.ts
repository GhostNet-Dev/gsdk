"use strict";

class Controller {

  public DARK_COLOR: number = 0;
  public NORMAL_COLOR: number = 1;
  public LIGHT_COLOR: number = 2;
  public LIGHT_COLOR_2: number = 3;
  public DARK_COLOR_2: number = 4;
  public RESTART: number = 5;
  public TIME_SCALE: number = 6;
  public PARTICLE_SPREAD: number = 7;
  public PARTICLE_COLOR: number = 8;
  public INVERTED_BACKGROUND: number = 9;
  public SHOW_GRID: number = 10;

  private eventListener: any;

  private params?: {
    LightColor2: string
    LightColor: string
    NormalColor: string
    DarkColor2: string
    GreyColor: string
    DarkColor: string
    TimeScale: number
    ParticleSpread: number
    ParticleColor: string
    InvertedBackground: boolean
    ShowGrid: boolean
    restart: Function
  };

  public init() {

    this.eventListener = [];
    this.params = {
      LightColor2: '#ff8700',
      LightColor: '#f7f342',
      NormalColor: '#f7a90e',
      DarkColor2: '#ff9800',
      GreyColor: '#3c342f',
      DarkColor: "#181818",

      TimeScale: 3,

      ParticleSpread: 1,
      ParticleColor: '#ffb400',

      InvertedBackground: false,
      ShowGrid: true,
      restart: () => {}
    }
  }

  public getParams() {
    if(!this.params)  throw new Error("not defined!");
    return this.params;
  }

  public setRestartFunc(func: Function) {
    if(!this.params) throw new Error("not defined!");
    
    this.params.restart = func;
  }

  public attachEvent(key: any, callback: Function) {
    this.eventListener[key]?.onChange(callback);
  }
}

export { Controller }