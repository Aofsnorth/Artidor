struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// Zoom push-in, ported from DonkeyCut (Apache 2.0). The frame renders at
// 1 + 0.6 * k * progress and is sampled back around the focus point, which
// stays fixed. Progress eases in over `ramp` seconds (smoothstep), then
// holds: the shot moves in rather than cuts.
//   scalars.x = amount k in 0..1
//   scalars.y = ramp seconds (0 = cut straight to depth)
//   scalars.z = element-local time in seconds
//   direction = focus point in 0..1 frame fractions
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let ramp = max(0.0, uniforms.scalars.y);
    let t = max(0.0, uniforms.scalars.z);

    var p = 1.0;
    if (ramp > 0.0) {
        p = clamp(t / ramp, 0.0, 1.0);
    }
    let eased = p * p * (3.0 - 2.0 * p);
    let zoom = 1.0 + 0.6 * k * eased;
    let focus = clamp(uniforms.direction, vec2<f32>(0.0), vec2<f32>(1.0));

    let src = focus + (uv - focus) / zoom;
    return textureSample(u_texture, u_sampler, clamp(src, vec2<f32>(0.0), vec2<f32>(1.0)));
}
