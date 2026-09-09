struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// Blockbuster look, ported from DonkeyCut (Apache 2.0):
// contrast(1+0.1k) + saturate(1+0.15k) with a warm orange wash (#ff9a3c,
// soft-light, 0.12k) over a cool teal wash (#0e7490, overlay, 0.08k) — the
// split-toned tentpole grade.
//   scalars.x = amount k in 0..1
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let base = textureSample(u_texture, u_sampler, uv);
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let luma = dot(base.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));

    var col = mix(vec3<f32>(luma), base.rgb, 1.0 + 0.15 * k);
    col = (col - vec3<f32>(0.5)) * (1.0 + 0.1 * k) + vec3<f32>(0.5);

    // Warm orange soft-light wash at 0.12k.
    let warm = vec3<f32>(1.0, 0.604, 0.235);
    var softWarm = vec3<f32>(0.0);
    for (var i = 0; i < 3; i = i + 1) {
        let b = warm[i];
        let s = col[i];
        let d = select(((16.0 * s - 12.0) * s + 4.0) * s, sqrt(s), s <= 0.25);
        let sl = select(s - (1.0 - 2.0 * b) * s * (1.0 - s), s + (2.0 * b - 1.0) * (d - s), b <= 0.5);
        softWarm[i] = sl;
    }
    col = mix(col, softWarm, 0.12 * k);

    // Cool teal overlay wash at 0.08k.
    let cool = vec3<f32>(0.055, 0.455, 0.565);
    var overlayCool = vec3<f32>(0.0);
    for (var i = 0; i < 3; i = i + 1) {
        let b = cool[i];
        let s = col[i];
        let ov = select(2.0 * s * b, 1.0 - 2.0 * (1.0 - s) * (1.0 - b), s <= 0.5);
        overlayCool[i] = ov;
    }
    col = mix(col, overlayCool, 0.08 * k);

    return vec4<f32>(clamp(col, vec3<f32>(0.0), vec3<f32>(1.0)), base.a);
}
