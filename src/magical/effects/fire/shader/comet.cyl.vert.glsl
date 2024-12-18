varying vec2 vUv;

void main() {
    vUv = uv;
    vec3 pos = vec3(position.x/1.,position.y,position.z/1.);
    if(pos.y >= 1.87){
        pos = vec3(position.x*(sin((position.y - 0.6)*1.27)-0.16),position.y,position.z*(sin((position.y - 0.6)*1.27)-0.16));
    } else{
        pos = vec3(position.x*(sin((position.y/2. -  .01)*.11)+0.75),position.y,position.z*(sin((position.y/2. -  .01)*.11)+0.75));
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
}