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
    let src = textureSample(u_texture, u_sampler, uv);

    // u_amount in 0..1 -> number of levels. More amount = fewer levels
    // (chunkier poster look). 2 levels at full strength, 32 at zero.
    let levels = mix(32.0, 2.0, clamp(uniforms.scalars.x, 0.0, 1.0));
    let quantized = floor(src.rgb * levels + 0.5) / levels;
    return vec4<f32>(quantized, src.a);
}
