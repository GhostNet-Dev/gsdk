varying vec2 vUv;
uniform sampler2D perlinnoise;
uniform sampler2D noise;
uniform vec3 color4;
uniform float time;
varying vec3 camPos;
varying vec3 vNormal;
varying vec3 nois;

vec3 rgbcol(vec3 col) {
    return vec3(col.r/255.0,col.g/255.0,col.b/255.0);
}

    
void main() {
    // vec3 noisetex = texture2D(perlinnoise,mod(1.*vec2(vUv.y-time*2.,vUv.x + time*1.),1.)).rgb;    
    // gl_FragColor += vec4(sin((vUv.y - time)*(20. + vUv.y)));
    vec3 noisetex = texture2D(noise,mod(1.*vec2(vUv.y-time*2.,vUv.x + time*1.),1.)).rgb;
    // nois = noisetex;
    gl_FragColor = vec4(noisetex.r);

    if(gl_FragColor.r >= 0.44){
        gl_FragColor = vec4(rgbcol(color4),gl_FragColor.r);
    }
    // else if(gl_FragColor.r >= 0.9){
    //     // gl_FragColor = vec4(rgbcol(color4),gl_FragColor.r)*0.5;
    // }
    else{
        gl_FragColor = vec4(0.);
    }
    gl_FragColor *= vec4(smoothstep(0.2,0.628,vUv.y));
    // gl_FragColor = vec4(vUv.y - 0.3 );
    // gl_FragColor = 1. - vec4(dot(normalize(vNormal),normalize(camPos)).r);
}