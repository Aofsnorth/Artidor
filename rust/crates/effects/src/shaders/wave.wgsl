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

    // Wave displacement based on sine
    let amplitude = uniforms.scalars.x * 0.05;
    let frequency = 6.0;
    let offsetX = sin(uv.y * frequency) * amplitude;
    let offsetY = cos(uv.x * frequency) * amplitude * 0.5;

    let sample = textureSample(u_texture, u_sampler, vec2<f32>(clamp(uv.x + offsetX, 0.0, 1.0), clamp(uv.y + offsetY, 0.0, 1.0)));
    return sample;
}
