uniform vec3 vColor;

varying vec2 vUv;

void main() {
  vec3 color = vColor;
  gl_FragColor.rgb = color;
  gl_FragColor.a = 1.;
}
