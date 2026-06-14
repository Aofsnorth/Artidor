struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

@vertex
fn vertex_main(@location(0) position: vec2<f32>) -> vec4<f32> {
    return vec4<f32>(position, 0.0, 1.0);
}

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let blockSize = 8.0;
    let bx = floor(uv.x * blockSize) / blockSize;
    let by = floor(uv.y * blockSize) / blockSize;
    let sample = textureSample(u_texture, u_sampler, vec2<f32>(bx + 0.5 / blockSize, by + 0.5 / blockSize));
    return sample;
}
