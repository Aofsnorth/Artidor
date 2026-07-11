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

    let squares = mix(2.0, 32.0, amount);
    let check = floor(uv.x * squares) + floor(uv.y * squares);
    let pattern = 0.5 + 0.5 * fract(check * 0.5);
    let alpha = amount * 0.6;

    return vec4<f32>(mix(color.rgb, vec3<f32>(pattern), alpha), color.a);
}
