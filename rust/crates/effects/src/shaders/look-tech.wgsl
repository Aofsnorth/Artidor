struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// Modern tech look, ported from DonkeyCut (Apache 2.0):
// contrast(1+0.12k) + saturate(1+0.08k) with a cool blue wash (#3b9dff,
// soft-light, 0.1k).
//   scalars.x = amount k in 0..1
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let base = textureSample(u_texture, u_sampler, uv);
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let luma = dot(base.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));

    var col = mix(vec3<f32>(luma), base.rgb, 1.0 + 0.08 * k);
    col = (col - vec3<f32>(0.5)) * (1.0 + 0.12 * k) + vec3<f32>(0.5);

    // Blue wash, soft-light blended at 0.1k.
    let wash = vec3<f32>(0.231, 0.616, 1.0);
    var softWash = vec3<f32>(0.0);
    for (var i = 0; i < 3; i = i + 1) {
        let b = wash[i];
        let s = col[i];
        let d = select(((16.0 * s - 12.0) * s + 4.0) * s, sqrt(s), s <= 0.25);
        let sl = select(s - (1.0 - 2.0 * b) * s * (1.0 - s), s + (2.0 * b - 1.0) * (d - s), b <= 0.5);
        softWash[i] = sl;
    }
    col = mix(col, softWash, 0.1 * k);

    return vec4<f32>(clamp(col, vec3<f32>(0.0), vec3<f32>(1.0)), base.a);
}
