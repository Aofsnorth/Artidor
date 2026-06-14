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

    let color = textureSample(u_texture, u_sampler, uv);

    // Estimate local contrast with center-surround
    let c00 = textureSample(u_texture, u_sampler, uv + vec2<f32>(-texel.x, -texel.y)).rgb;
    let c01 = textureSample(u_texture, u_sampler, uv + vec2<f32>(0.0, -texel.y)).rgb;
    let c02 = textureSample(u_texture, u_sampler, uv + vec2<f32>(texel.x, -texel.y)).rgb;
    let c10 = textureSample(u_texture, u_sampler, uv + vec2<f32>(-texel.x, 0.0)).rgb;
    let c12 = textureSample(u_texture, u_sampler, uv + vec2<f32>(texel.x, 0.0)).rgb;
    let c20 = textureSample(u_texture, u_sampler, uv + vec2<f32>(-texel.x, texel.y)).rgb;
    let c21 = textureSample(u_texture, u_sampler, uv + vec2<f32>(0.0, texel.y)).rgb;
    let c22 = textureSample(u_texture, u_sampler, uv + vec2<f32>(texel.x, texel.y)).rgb;

    let avg = (c00 + c01 + c02 + c10 + c12 + c20 + c21 + c22) / 8.0;
    let diff = color.rgb - avg;

    // amount in [-1, 1]: positive sharpens, negative softens
    let amount = uniforms.scalars.x;
    return vec4<f32>(color.rgb + diff * amount, color.a);
}
