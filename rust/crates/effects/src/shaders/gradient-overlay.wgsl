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
    let amount = clamp(uniforms.scalars.x, 0.0, 1.0);
    let color = textureSample(u_texture, u_sampler, uv);

    let a = vec3<f32>(0.0, 0.4, 0.8);
    let b = vec3<f32>(0.9, 0.2, 0.5);
    let gradient = mix(a, b, (uv.x + uv.y) * 0.5);
    return vec4<f32>(mix(color.rgb, gradient, amount), color.a);
}
