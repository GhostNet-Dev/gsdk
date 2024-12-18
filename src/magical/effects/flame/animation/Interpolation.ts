export class Interpolation {
  public static easeOutCubic(percent: number, start: number, end: number) {
    let t = percent;
    t--;
    return (end - start) * (t*t*t + 1) + start;
  }

  public static easeInCubic(percent: number, start: number, end: number) {
    let t = percent;
	  return (end - start)*t*t*t + start;
  };

  public static easeOutSine(percent: number, start: number, end: number) {
    return (end - start) * Math.sin(percent * (Math.PI/2)) + start;
  };
}