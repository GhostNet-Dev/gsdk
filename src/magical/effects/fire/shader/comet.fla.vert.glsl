varying vec2 vUv;
varying vec3 camPos;
varying vec3 vNormal;
varying vec3 nois;
uniform sampler2D noise;
uniform float time;

void main() {
    vUv = uv;
    camPos = cameraPosition;
    vNormal = normal;
    vec3 pos = vec3(position.x/1.,position.y,position.z/1.);
    vec3 noisetex = texture2D(noise,mod(1.*vec2(vUv.y-time*2.,vUv.x + time*1.),1.)).rgb;
    if(pos.y >= 1.87){
        pos = vec3(position.x*(sin((position.y - 0.64)*1.27)-0.12),position.y,position.z*(sin((position.y - 0.64)*1.27)-0.12));
    } else{
        pos = vec3(position.x*(sin((position.y/2. -  .01)*.11)+0.79),position.y,position.z*(sin((position.y/2. -  .01)*.11)+0.79));
    }
    pos.xz *= noisetex.r;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
}