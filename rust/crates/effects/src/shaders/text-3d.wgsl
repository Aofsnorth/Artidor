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
    let texel = vec2<f32>(1.0 / uniforms.resolution.x, 1.0 / uniforms.resolution.y);

    let color = textureSample(u_texture, u_sampler, uv);
    let depth = uniforms.scalars.x * 20.0;
    let direction = normalize(vec2<f32>(1.0, 1.0));
    let shadow_color = vec3<f32>(0.0);

    var extrude_alpha = 0.0;
    for (var i: i32 = 0; i < 8; i = i + 1) {
        let t = f32(i) / 8.0;
        let offset = direction * texel * depth * t;
        extrude_alpha = max(extrude_alpha, textureSample(u_texture, u_sampler, uv - offset).a);
    }

    let extrude = extrude_alpha * (1.0 - color.a) * 0.8;
    return vec4<f32>(mix(color.rgb, shadow_color, extrude), max(color.a, extrude));
}
