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

    // Rotate around the center; amount 0..1 maps to 0..2PI.
    let aspect = uniforms.resolution.x / uniforms.resolution.y;
    let center = vec2<f32>(0.5, 0.5);
    var d = uv - center;
    d.x = d.x * aspect;

    let angle = uniforms.scalars.x * 6.2831853;
    let cs = cos(angle);
    let sn = sin(angle);
    d = vec2<f32>(d.x * cs - d.y * sn, d.x * sn + d.y * cs);

    d.x = d.x / aspect;
    let sample_uv = clamp(center + d, vec2<f32>(0.0), vec2<f32>(1.0));
    return textureSample(u_texture, u_sampler, sample_uv);
}
