struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

fn hash21(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.13);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(3.333));
    return fract((p3.x + p3.y) * p3.z);
}

// Digital glitch, ported from DonkeyCut (Apache 2.0). The chroma ghost
// offset jumps between quantized positions a few times a second (9Hz,
// deterministic -2..2 step jitter), so it reads as tearing rather than a
// steady fringe, plus a light noise pass.
//   scalars.x = amount k in 0..1
//   scalars.y = time in seconds
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let t = max(0.0, uniforms.scalars.y);

    // Deterministic jitter: step = floor(t*9), jitter = (step*7919 % 5) - 2.
    let step = floor(t * 9.0);
    let jitter = f32((i32(step) * 7919) % 5) - 2.0;
    let shiftFrac = (0.004 + 0.003 * jitter) * k;
    let shiftPx = shiftFrac * uniforms.resolution.x;
    let texel = vec2<f32>(1.0) / uniforms.resolution;

    let r = textureSample(u_texture, u_sampler, uv + vec2<f32>(shiftPx * texel.x, 0.0)).r;
    let g = textureSample(u_texture, u_sampler, uv).g;
    let b = textureSample(u_texture, u_sampler, uv - vec2<f32>(shiftPx * texel.x, 0.0)).b;
    let a = textureSample(u_texture, u_sampler, uv).a;

    // Grain: 0.12k, shimmering with time.
    let noise = (hash21(frag_coord.xy + vec2<f32>(t * 137.0)) - 0.5) * 0.24 * k;

    return vec4<f32>(clamp(vec3<f32>(r, g, b) + vec3<f32>(noise), vec3<f32>(0.0), vec3<f32>(1.0)), a);
}
