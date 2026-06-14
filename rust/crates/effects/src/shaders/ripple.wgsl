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

    // Ripple effect from center
    let center = vec2<f32>(0.5, 0.5);
    let dist = distance(uv, center);
    let amplitude = uniforms.scalars.x * 0.03;
    let frequency = 30.0;
    let offset = sin(dist * frequency) * amplitude;
    let dir = normalize(uv - center);

    let sample = textureSample(u_texture, u_sampler, vec2<f32>(
        clamp(uv.x - dir.x * offset, 0.0, 1.0),
        clamp(uv.y - dir.y * offset, 0.0, 1.0)
    ));
    return sample;
}
