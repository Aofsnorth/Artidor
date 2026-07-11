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

    // Skew along the axis given by direction: [1,0] for X, [0,1] for Y.
    let amount = uniforms.scalars.x;
    let axis = uniforms.direction;
    var sample_uv = uv;

    if (axis.x > 0.5) {
        sample_uv.x = sample_uv.x + (uv.y - 0.5) * amount;
    } else {
        sample_uv.y = sample_uv.y + (uv.x - 0.5) * amount;
    }

    return textureSample(u_texture, u_sampler, clamp(sample_uv, vec2<f32>(0.0), vec2<f32>(1.0)));
}
