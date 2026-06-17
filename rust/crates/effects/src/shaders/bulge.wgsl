struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;

    // amount 0..1 maps to pinch (<0.5) through neutral (0.5) to bulge (>0.5).
    let aspect = uniforms.resolution.x / uniforms.resolution.y;
    let center = vec2<f32>(0.5, 0.5);
    var d = uv - center;
    d.x = d.x * aspect;

    let r = length(d);
    let max_r = 0.5;
    let strength = (uniforms.scalars.x - 0.5) * 2.0; // -1..1

    if (r < max_r && r > 0.0001) {
        let pct = r / max_r;
        // Positive strength bulges (magnifies center), negative pinches.
        let warped = pow(pct, 1.0 - strength);
        d = d * (warped * max_r / r);
    }

    d.x = d.x / aspect;
    let sample_uv = clamp(center + d, vec2<f32>(0.0), vec2<f32>(1.0));
    return textureSample(u_texture, u_sampler, sample_uv);
}
