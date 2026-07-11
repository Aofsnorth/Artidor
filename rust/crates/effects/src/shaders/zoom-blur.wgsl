struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

const SAMPLES: i32 = 16;

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let amount = clamp(uniforms.scalars.x, 0.0, 1.0);
    let center = vec2<f32>(0.5, 0.5);
    let d = uv - center;
    let radius = length(d);
    var dir = normalize(d);
    if (radius < 0.0001) {
        dir = vec2<f32>(1.0, 0.0);
    }

    var accum = vec4<f32>(0.0);
    let max_radius = amount * 0.25;
    for (var i: i32 = 0; i < SAMPLES; i = i + 1) {
        let t = f32(i) / f32(SAMPLES - 1);
        let r = radius + t * max_radius;
        let sample_uv = center + dir * r;
        accum = accum + textureSample(u_texture, u_sampler, clamp(sample_uv, vec2<f32>(0.0), vec2<f32>(1.0)));
    }
    return accum / f32(SAMPLES);
}
