//noise funtion abstract from https://www.shadertoy.com/view/4sc3z2
vec3 hash33(vec3 p3)
{
	vec3 MOD3 = vec3(.1031, .11369, .13787);
	p3 = fract(p3* MOD3);
	p3 += dot(p3, p3.yxz + 19.19);
	return -1.0 + 2.0 * fract(vec3((p3.x + p3.y)*p3.z, (p3.x + p3.z)*p3.y, (p3.y + p3.z)*p3.x));
}

float simplex_noise(vec3 p)
{
	const float K1 = 0.333333333;
	const float K2 = 0.166666667;

	vec3 i = floor(p + (p.x + p.y + p.z) * K1);
	vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);

	vec3 e = step(vec3(0, 0, 0), d0 - d0.yzx);
	vec3 i1 = e * (1.0 - e.zxy);
	vec3 i2 = 1.0 - e.zxy * (1.0 - e);

	vec3 d1 = d0 - (i1 - 1.0 * K2);
	vec3 d2 = d0 - (i2 - 2.0 * K2);
	vec3 d3 = d0 - (1.0 - 3.0 * K2);

	vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
	vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));

	return dot(vec4(31.316, 31.316, 31.316, 31.316), n);
}



float render(vec2 uv)
{
    float side = smoothstep(0.5, 0.3, length(uv));
    float center = smoothstep(0.1, 0.0, length(uv));
    vec3 rd = vec3(uv, 0.);

    float t = pow(iTime+0.5,5.)*0.001;

    float n2 = simplex_noise((rd*t+t) * (1. / length(rd*t+rd)));
    
    if(iTime>1.5)
    {
        n2 = simplex_noise((rd*t+t) * (1. / length(rd*t+rd))+(iTime-1.5));
    }
    
    
    float flare = smoothstep(0.,1.,0.002 / length(rd*length(rd)*n2))*side;
    
    flare = flare-center*clamp((iTime-1.5)*10.,0.,5.);
    
    return flare;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord/iResolution.xy;
    uv -= .5;
    uv.x *= iResolution.x/iResolution.y;

    
    vec3 col = vec3(0.102,0.5,1.)*2.;
    col *= render(uv);
 	float alpha = smoothstep(0.0, 0.9, length(col));
	fragColor = vec4(col, alpha);   
}
