struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

fn hash21(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.13);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(3.333));
    return fract((p3.x + p3.y) * p3.z);
}

// Noir look, ported from DonkeyCut (Apache 2.0): grayscale(k) +
// contrast(1+0.08k) with grain at 0.06k.
//   scalars.x = amount k in 0..1, scalars.y = time in seconds
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let base = textureSample(u_texture, u_sampler, uv);
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let t = max(0.0, uniforms.scalars.y);
    let luma = dot(base.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));

    var col = mix(base.rgb, vec3<f32>(luma), k);
    col = (col - vec3<f32>(0.5)) * (1.0 + 0.08 * k) + vec3<f32>(0.5);

    let noise = (hash21(frag_coord.xy + vec2<f32>(t * 137.0)) - 0.5) * 0.12 * k;
    col = col + vec3<f32>(noise);

    return vec4<f32>(clamp(col, vec3<f32>(0.0), vec3<f32>(1.0)), base.a);
}
