struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// Dreamy look, ported from DonkeyCut (Apache 2.0): a whole-picture blurred
// copy lighten-blended back at 0.45k, plus brightness(1.02) and
// saturate(1+0.05k).
//   scalars.x = amount k in 0..1
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let base = textureSample(u_texture, u_sampler, uv);
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let luma = dot(base.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));

    var col = mix(vec3<f32>(luma), base.rgb, 1.0 + 0.05 * k);
    col = col * 1.02;

    // Ring-blurred self-copy.
    let blurPx = max(1.0, (10.0 / 1920.0) * uniforms.resolution.y);
    let texel = vec2<f32>(1.0) / uniforms.resolution;
    var glow = vec3<f32>(0.0);
    let angles = array<vec2<f32>, 12>(
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.866, 0.5),
        vec2<f32>(0.5, 0.866),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(-0.5, 0.866),
        vec2<f32>(-0.866, 0.5),
        vec2<f32>(-1.0, 0.0),
        vec2<f32>(-0.866, -0.5),
        vec2<f32>(-0.5, -0.866),
        vec2<f32>(0.0, -1.0),
        vec2<f32>(0.5, -0.866),
        vec2<f32>(0.866, -0.5),
    );
    for (var i = 0; i < 12; i = i + 1) {
        let dir = angles[i];
        for (var r = 1; r <= 3; r = r + 1) {
            let s = textureSample(u_texture, u_sampler, uv + dir * texel * blurPx * f32(r) * 0.33);
            glow = glow + s.rgb;
        }
    }
    glow = glow / 36.0;

    // Lighten blend at 0.45k.
    let lifted = max(col, glow);
    col = mix(col, lifted, 0.45 * k);

    return vec4<f32>(clamp(col, vec3<f32>(0.0), vec3<f32>(1.0)), base.a);
}
