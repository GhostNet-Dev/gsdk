#define PI 3.141592653589
#define PI2 6.28318530718

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_tex;

varying vec2 vUv;
varying float vNoise;

//	<https://www.shadertoy.com/view/4dS3Wd>
//	By Morgan McGuire @morgan3d, http://graphicscodex.com

//https://www.clicktorelease.com/blog/vertex-displacement-noise-3d-webgl-glsl-three-js/

float random( vec3 pt, float seed ){
  vec3 scale = vec3( 12.9898, 78.233, 151.7182 );
  return fract( sin( dot( pt + seed, scale ) ) * 43758.5453 + seed ) ;
}

void main() {

  // get a random offset
  float r = .01 * random( gl_FragCoord.xyz, 0.0 );
  // lookup vertically in the texture, using noise and offset
  // to get the right RGB colour
  vec2 uv = vec2( 0, 1.3 * vNoise + r );
  vec3 color = texture2D( u_tex, uv ).rgb;

  gl_FragColor = vec4( color, 1.0 );
}