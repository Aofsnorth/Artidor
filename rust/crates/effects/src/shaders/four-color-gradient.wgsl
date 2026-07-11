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

    let c0 = vec3<f32>(1.0, 0.2, 0.2);
    let c1 = vec3<f32>(0.2, 1.0, 0.2);
    let c2 = vec3<f32>(0.2, 0.2, 1.0);
    let c3 = vec3<f32>(1.0, 1.0, 0.2);

    let gx = step(0.5, uv.x);
    let gy = step(0.5, uv.y);
    var gradient = c0;
    if (gx == 0.0 && gy == 1.0) { gradient = c1; }
    if (gx == 1.0 && gy == 0.0) { gradient = c2; }
    if (gx == 1.0 && gy == 1.0) { gradient = c3; }

    return vec4<f32>(mix(color.rgb, gradient, amount), color.a);
}
