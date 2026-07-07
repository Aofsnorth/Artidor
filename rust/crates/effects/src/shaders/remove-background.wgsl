struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct EffectUniforms {
    resolution: vec2f,
    direction: vec2f,
    // scalars.x = tolerance (color distance threshold, 0..1),
    // scalars.y = smoothness (soft edge width, 0..1),
    // scalars.z = spill suppression (0..1).
    scalars: vec4f,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// Sample a handful of border texels to estimate the dominant background
// colour. Using `textureSampleLevel` at LOD 0 avoids derivative-dependent
// mip selection for off-fragment coordinates, so all 12 samples hit the
// texture cache lines and cost a handful of cycles per fragment.
fn estimate_background_color() -> vec3f {
    var sum = vec3f(0.0);
    let n = 12.0;
    // 4 corners + 8 edge midpoints, in UV space.
    let pts = array<vec2f, 12>(
        vec2f(0.0, 0.0),
        vec2f(1.0, 0.0),
        vec2f(0.0, 1.0),
        vec2f(1.0, 1.0),
        vec2f(0.5, 0.0),
        vec2f(0.5, 1.0),
        vec2f(0.0, 0.5),
        vec2f(1.0, 0.5),
        vec2f(0.25, 0.0),
        vec2f(0.75, 0.0),
        vec2f(0.25, 1.0),
        vec2f(0.75, 1.0),
    );
    for (var i = 0; i < 12; i = i + 1) {
        sum = sum + textureSampleLevel(input_texture, input_sampler, pts[i], 0.0).rgb;
    }
    return sum / n;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let src = textureSample(input_texture, input_sampler, input.tex_coord);
    let key_rgb = estimate_background_color();

    let tolerance = uniforms.scalars.x;
    let smoothness = uniforms.scalars.y;
    let spill = uniforms.scalars.z;

    // Weighted colour distance: 70% on the chroma plane (so brightness
    // variation in the backdrop doesn't break the key) and 30% on full RGB
    // (so near-grey or near-white backgrounds still key cleanly). This is
    // cheaper than a full YCbCr round-trip and robust for the common cases
    // (white wall, grey wall, sky, solid sheet).
    let diff = src.rgb - key_rgb;
    let rgb_dist = length(diff);
    let luma_src = dot(src.rgb, vec3f(0.2126, 0.7152, 0.0722));
    let luma_key = dot(key_rgb, vec3f(0.2126, 0.7152, 0.0722));
    let luma_dist = abs(luma_src - luma_key);
    let chroma_dist = sqrt(max(rgb_dist * rgb_dist - luma_dist * luma_dist, 0.0));
    let dist = chroma_dist * 0.7 + rgb_dist * 0.3;

    // Soft matte: transparent inside `tolerance`, opaque once `smoothness`
    // beyond it. Guard the upper edge so smoothness == 0 is a hard key.
    let edge0 = tolerance;
    let edge1 = tolerance + max(smoothness, 0.0001);
    let alpha = smoothstep(edge0, edge1, dist);

    // Spill suppression: pull pixels that still lean toward the key colour
    // back toward their own luma, killing coloured fringing on edges.
    var rgb = src.rgb;
    if (spill > 0.0) {
        let toward_key = normalize(key_rgb - vec3f(0.5));
        let px_dir = src.rgb - vec3f(0.5);
        let projection = dot(px_dir, toward_key);
        if (projection > 0.0) {
            let suppress = projection * spill * (1.0 - alpha);
            let luma = vec3f(luma_src);
            rgb = mix(rgb, luma, clamp(suppress, 0.0, 1.0));
        }
    }

    return vec4f(rgb, src.a * alpha);
}
