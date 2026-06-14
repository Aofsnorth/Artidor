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
    let texel = vec2<f32>(1.0 / uniforms.resolution.x, 1.0 / uniforms.resolution.y);

    let threshold = 0.6;
    var offset = vec2<f32>(0.0);

    // Sample right
    let r = textureSample(u_texture, u_sampler, uv + vec2<f32>(texel.x, 0.0)).r;
    if (r > threshold) {
        offset.x += uniforms.scalars.x * 0.02;
    }
    // Sample left
    let l = textureSample(u_texture, u_sampler, uv - vec2<f32>(texel.x, 0.0)).r;
    if (l > threshold) {
        offset.x -= uniforms.scalars.x * 0.02;
    }
    // Sample down
    let d = textureSample(u_texture, u_sampler, uv + vec2<f32>(0.0, texel.y)).r;
    if (d > threshold) {
        offset.y += uniforms.scalars.x * 0.02;
    }
    // Sample up
    let u = textureSample(u_texture, u_sampler, uv - vec2<f32>(0.0, texel.y)).r;
    if (u > threshold) {
        offset.y -= uniforms.scalars.x * 0.02;
    }

    return textureSample(u_texture, u_sampler, uv + offset);
}
