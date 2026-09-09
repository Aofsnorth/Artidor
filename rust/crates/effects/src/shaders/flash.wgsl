struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// White flash, ported from DonkeyCut (Apache 2.0). One bright pop at the
// element start, decaying over roughly 0.4s: alpha = min(1, 0.85k * e^-9t).
//   scalars.x = amount k in 0..1
//   scalars.y = element-local time in seconds
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let base = textureSample(u_texture, u_sampler, uv);
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let t = max(0.0, uniforms.scalars.y);

    let gain = exp(-9.0 * t);
    let flash = min(1.0, 0.85 * k * gain);

    return vec4<f32>(mix(base.rgb, vec3<f32>(1.0), flash), base.a);
}
