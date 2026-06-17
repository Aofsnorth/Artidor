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
    let shadowColor = vec3<f32>(0.0);
    let shadowOffset = vec2<f32>(uniforms.direction) * uniforms.scalars.x;
    let shadowBlur = max(uniforms.scalars.y, 1.0);

    // Multi-tap shadow: sample at the shadow direction and average
    var shadow = vec4<f32>(0.0);
    var total = 0.0;
    for (var i: i32 = 0; i < 8; i = i + 1) {
        let fi = f32(i);
        let t = (fi - 3.5) / 4.0;
        let offset = shadowOffset + vec2<f32>(cos(fi * 0.785), sin(fi * 0.785)) * texel * shadowBlur;
        let sample = textureSample(u_texture, u_sampler, uv + offset);
        shadow += vec4<f32>(shadowColor, sample.a);
        total += 1.0;
    }
    shadow = shadow / total;

    // Composite: shadow behind, color in front
    let shadowWeight = shadow.a * 0.7;
    let resultRgb = mix(color.rgb, shadowColor, shadowWeight * 0.5);
    let resultAlpha = max(color.a, shadow.a);
    return vec4<f32>(resultRgb, resultAlpha);
}
