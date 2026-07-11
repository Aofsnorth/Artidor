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
    let distance = uniforms.scalars.x * 0.05;
    let blur = uniforms.scalars.y * 20.0;
    let shadow_uv = uv + uniforms.direction * distance;
    let shadow_color = vec3<f32>(0.0);

    var shadow_alpha = 0.0;
    for (var i: i32 = 0; i < 8; i = i + 1) {
        let angle = f32(i) * 0.785398;
        let offset = vec2<f32>(cos(angle), sin(angle)) * texel * blur;
        shadow_alpha = max(shadow_alpha, textureSample(u_texture, u_sampler, shadow_uv + offset).a);
    }

    let shadow = shadow_alpha * 0.7;
    let result_alpha = max(color.a, shadow);
    let result_rgb = mix(shadow_color, color.rgb, color.a);
    return vec4<f32>(result_rgb, result_alpha);
}
