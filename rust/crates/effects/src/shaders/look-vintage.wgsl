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

// Vintage look, ported from DonkeyCut (Apache 2.0): sepia(0.25k) +
// saturate(1-0.15k) + contrast(1-0.08k) + brightness(1.03), with a vignette
// at 0.35k and film grain at 0.05k.
//   scalars.x = amount k in 0..1, scalars.y = time in seconds
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let base = textureSample(u_texture, u_sampler, uv);
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let t = max(0.0, uniforms.scalars.y);
    let luma = dot(base.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));

    // Sepia 0.25k (CSS sepia matrix).
    let sep = vec3<f32>(
        0.393 * base.r + 0.769 * base.g + 0.189 * base.b,
        0.349 * base.r + 0.686 * base.g + 0.168 * base.b,
        0.272 * base.r + 0.534 * base.g + 0.131 * base.b,
    );
    var col = mix(base.rgb, sep, 0.25 * k);

    // Saturate 1-0.15k, contrast 1-0.08k, brightness 1.03.
    col = mix(vec3<f32>(luma), col, 1.0 - 0.15 * k);
    col = (col - vec3<f32>(0.5)) * (1.0 - 0.08 * k) + vec3<f32>(0.5);
    col = col * 1.03;

    // Vignette 0.35k.
    let d = distance(uv, vec2<f32>(0.5)) / (distance(vec2<f32>(0.0), vec2<f32>(0.5, 0.5)) * 1.414);
    let vig = clamp(0.35 * k * smoothstep(0.35, 1.0, d), 0.0, 0.85);
    col = col * (1.0 - vig);

    // Grain 0.05k.
    let noise = (hash21(frag_coord.xy + vec2<f32>(t * 137.0)) - 0.5) * 0.1 * k;
    col = col + vec3<f32>(noise);

    return vec4<f32>(clamp(col, vec3<f32>(0.0), vec3<f32>(1.0)), base.a);
}
