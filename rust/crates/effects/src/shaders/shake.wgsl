struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// Camera shake, ported from DonkeyCut (Apache 2.0). The frame offsets by
// dx = 22k * sin(33t), dy = 15.4k * cos(47t) in design px (1080 short side),
// with a slight overscale (1 + 44k/1080) so the shaken edges stay covered.
//   scalars.x = amount k in 0..1
//   scalars.y = time in seconds
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let t = max(0.0, uniforms.scalars.y);

    let short = min(uniforms.resolution.x, uniforms.resolution.y);
    let designPx = short / 1080.0;
    let dx = (22.0 * k * sin(t * 33.0) * designPx) / uniforms.resolution.x;
    let dy = (22.0 * k * 0.7 * cos(t * 47.0) * designPx) / uniforms.resolution.y;
    let zoom = 1.0 + (44.0 * k) / 1080.0;

    let center = vec2<f32>(0.5);
    let src = center + (uv + vec2<f32>(dx, dy) - center) / zoom;
    return textureSample(u_texture, u_sampler, clamp(src, vec2<f32>(0.0), vec2<f32>(1.0)));
}
