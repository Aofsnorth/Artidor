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
    let color = textureSample(u_texture, u_sampler, uv);

    // Distance from center normalized to [0, 1] at the corners
    let center = vec2<f32>(0.5, 0.5);
    let aspect = uniforms.resolution.x / uniforms.resolution.y;
    var d = uv - center;
    d.x = d.x * aspect;
    let dist = length(d) / length(vec2<f32>(aspect * 0.5, 0.5));

    // amount is 0-1; intensity 0 means no vignette, 1 means strong
    let amount = uniforms.scalars.x;
    let softness = 0.65;
    let vignette = smoothstep(softness, 1.0, dist) * amount;
    let result = color.rgb * (1.0 - vignette);

    return vec4<f32>(result, color.a);
}
