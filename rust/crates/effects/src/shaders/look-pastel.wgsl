struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// Pastel look, ported from DonkeyCut (Apache 2.0):
// brightness(1+0.06k) + contrast(1-0.15k) + saturate(1-0.18k).
//   scalars.x = amount k in 0..1
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let base = textureSample(u_texture, u_sampler, uv);
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let luma = dot(base.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));

    var col = mix(vec3<f32>(luma), base.rgb, 1.0 - 0.18 * k);
    col = (col - vec3<f32>(0.5)) * (1.0 - 0.15 * k) + vec3<f32>(0.5);
    col = col * (1.0 + 0.06 * k);

    return vec4<f32>(clamp(col, vec3<f32>(0.0), vec3<f32>(1.0)), base.a);
}
