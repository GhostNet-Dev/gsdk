//	Simplex 3D Noise 
//	by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

///////////////////////////////////////////////////////////////////////
// END OF RIPS
///////////////////////////////////////////////////////////////////////

// Subtract sdf (a-b)
float sdf_sub(float a, float b) {
    return max(-b, a);
}

// 2D Donut SDF
float ring(vec2 p, float radius, float thickness) {
    float l = length(p);
    float ht = thickness / 2.0;
    float inner = l - (radius - ht);
    float outer = l - (radius + ht);
    return sdf_sub(outer, inner);
}

// Decellerate towards 1.0
float upsidePowerCurve(float x, float e) {
    return 1.0-pow(1.0-x, e);
}

// Decellerate towards 1.0, then acc+dec back to 0.0
float bulgeCurve(float x, float e) {
    // Type this in google:
    // 3.0*x*((1.0-x)^2.0)*2.25*(1.0-x)
    return 3.0*x*pow(1.0-x,2.0)*2.25*(1.0-x);
}

// Waterline function
float clip(float x, float t, float range) {
    return clamp((x-t)/range-t+1.0, 0.0, 1.0);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy - vec2(0.5, 0.5);
    uv.x *= iResolution.x / iResolution.y;
	
    // Static attributes
    float radius = 0.3;
    float thickness = 0.02;
    
    // Repeating time [0, 1] range
    float timespan = 4.0;
    float t = mod(iTime/timespan, 1.0);
    
    // Animate parameters
    float upow = upsidePowerCurve(t, 6.0);
    radius *= upow;
    thickness *= bulgeCurve(t, 3.0);
    
    float d = ring(uv, radius, thickness);
    
    
    float ns = (snoise(vec3(uv*6.0/upow, iTime/10.0))+1.0)/2.0;
    float clippedNoise = clip(ns, t, 0.1);
	
    // Hard edge
    //float m = d > 0.0 ? 0.0 : 1.0;
    // Make smooth
    float m = clamp(-d*100.0, 0.0, 1.0);
    m *= clippedNoise;
    // TODO: Make glow
    
    // show noise
    //m = (uv.x < 0.0) ? ns : clippedNoise;
    
	fragColor = vec4(0.5, 0.7, 1.0, 1.0) * m * 3.0;
}
