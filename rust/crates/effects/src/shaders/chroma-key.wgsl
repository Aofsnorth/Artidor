struct EffectUniforms {
    resolution: vec2<f32>,
    // direction.xy + scalars.x pack the key colour (R, G, B) in 0..1.
    direction: vec2<f32>,
    // scalars.x = key blue, scalars.y = similarity (threshold),
    // scalars.z = smoothness (soft edge width), scalars.w = spill suppression.
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// Rec.709 luma/chroma. We key on the chroma plane (Cb, Cr) only, so the
// matte is independent of how brightly the screen is lit — a green wall in
// shadow still keys against the same hue as the same wall in highlight.
fn rgb_to_ycbcr(c: vec3<f32>) -> vec3<f32> {
    let y = dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
    let cb = (c.b - y) * 0.5389 + 0.5;
    let cr = (c.r - y) * 0.6350 + 0.5;
    return vec3<f32>(y, cb, cr);
}

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let src = textureSample(u_texture, u_sampler, uv);

    let key_rgb = vec3<f32>(uniforms.direction.x, uniforms.direction.y, uniforms.scalars.x);
    let similarity = uniforms.scalars.y;
    let smoothness = uniforms.scalars.z;
    let spill = uniforms.scalars.w;

    let key = rgb_to_ycbcr(key_rgb);
    let px = rgb_to_ycbcr(src.rgb);

    // Distance in the chroma plane between this pixel and the key colour.
    let chroma_dist = distance(px.yz, key.yz);

    // smoothstep gives a soft matte: fully transparent at `similarity`,
    // fully opaque once we're `smoothness` beyond it. Guard the upper edge
    // so smoothness == 0 still produces a valid (hard) key.
    let edge0 = similarity;
    let edge1 = similarity + max(smoothness, 0.0001);
    let alpha = smoothstep(edge0, edge1, chroma_dist);

    // Spill suppression: where the pixel still leans toward the key hue,
    // desaturate it toward luma so green/blue fringing on hair and edges is
    // pulled back. Strength scales with how "keyed" the pixel is.
    var rgb = src.rgb;
    if (spill > 0.0) {
        let key_dir = normalize(key.yz - vec2<f32>(0.5, 0.5));
        let px_dir = px.yz - vec2<f32>(0.5, 0.5);
        let projection = dot(px_dir, key_dir);
        if (projection > 0.0) {
            let suppress = projection * spill * (1.0 - alpha);
            let luma = vec3<f32>(px.x);
            rgb = mix(rgb, luma, clamp(suppress, 0.0, 1.0));
        }
    }

    return vec4<f32>(rgb, src.a * alpha);
}
