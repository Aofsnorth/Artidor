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
    let radius = uniforms.scalars.x * 20.0;
    let intensity = uniforms.scalars.y;
    let glow_color = vec3<f32>(1.0);

    let center_alpha = color.a;
    var nearby_alpha = 0.0;
    for (var i: i32 = 0; i < 8; i = i + 1) {
        let angle = f32(i) * 0.785398;
        let offset = vec2<f32>(cos(angle), sin(angle)) * texel * radius;
        nearby_alpha = max(nearby_alpha, textureSample(u_texture, u_sampler, uv + offset).a);
    }

    let glow = nearby_alpha * intensity * (1.0 - center_alpha);
    let result_rgb = glow_color * glow + color.rgb * center_alpha;
    return vec4<f32>(result_rgb, max(center_alpha, glow));
}
