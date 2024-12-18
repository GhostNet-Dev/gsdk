varying vec2 vUv;

uniform float uTime;

void main() {
    float len = 0.15;
    float falloff = 0.1;
    float p = mod(uTime * 0.25, 1.0);
    float alpha = smoothstep(len, len - falloff, abs(vUv.x - p));
    float width = smoothstep(len * 2.0, 0.0, abs(vUv.x - p)) * 0.5;
    alpha *= smoothstep(width, width - 0.3, abs(vUv.y - 0.5));

    alpha *= smoothstep(0.5, 0.3, abs(p - 0.5) * (1.0 + len));

    gl_FragColor.rgb = vec3(1.0);
    gl_FragColor.a = alpha;
//        gl_FragColor.a += 0.1;
}