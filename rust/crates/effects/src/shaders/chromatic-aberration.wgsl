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

    // Apply a horizontal offset that varies with Y to create glitch displacement
    let blocks = 20.0;
    let block_y = floor(uv.y * blocks) / blocks;
    let noise_seed = block_y * 31.71;
    let offset = (sin(noise_seed) * 0.5 + 0.5 - 0.5) * uniforms.scalars.x;

    let uv_r = vec2<f32>(clamp(uv.x + offset, 0.0, 1.0), uv.y);
    let uv_g = uv;
    let uv_b = vec2<f32>(clamp(uv.x - offset, 0.0, 1.0), uv.y);

    let r = textureSample(u_texture, u_sampler, uv_r).r;
    let g = textureSample(u_texture, u_sampler, uv_g).g;
    let b = textureSample(u_texture, u_sampler, uv_b).b;
    let a = textureSample(u_texture, u_sampler, uv).a;

    return vec4<f32>(r, g, b, a);
}
