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
    let color = textureSample(u_texture, u_sampler, uv);
    let luma = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let amount = uniforms.scalars.x;
    // Whites: boost highlight (top of luma range)
    let wMask = smoothstep(0.6, 1.0, luma);
    return vec4<f32>(color.rgb + vec3<f32>(amount * wMask), color.a);
}
