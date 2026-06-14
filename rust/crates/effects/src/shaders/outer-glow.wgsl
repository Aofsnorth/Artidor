struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

@vertex
fn vertex_main(@location(0) position: vec2<f32>) -> vec4<f32> {
    return vec4<f32>(position, 0.0, 1.0);
}

/**
 * Glow / outer-glow effect: detect bright regions of an alpha mask and
 * add a colored glow around them.
 */
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let texel = vec2<f32>(1.0 / uniforms.resolution.x, 1.0 / uniforms.resolution.y);

    let color = textureSample(u_texture, u_sampler, uv);
    let glowRadius = max(uniforms.scalars.x, 1.0);
    let glowIntensity = uniforms.scalars.y;
    let glowColor = vec3<f32>(1.0, 0.9, 0.5); // warm glow default

    // Sample 8 directions for the glow accumulation
    var glowAccum = 0.0;
    let steps = 8;
    for (var i: i32 = 0; i < 8; i = i + 1) {
        let fi = f32(i);
        let angle = fi * 0.7853982; // π/4
        let offset = vec2<f32>(cos(angle), sin(angle)) * texel * glowRadius;
        let sample = textureSample(u_texture, u_sampler, uv + offset).a;
        glowAccum += sample;
    }
    glowAccum = glowAccum / 8.0;

    let glowContrib = glowAccum * glowIntensity;
    let r = color.rgb + glowColor * glowContrib * (1.0 - color.a * 0.3);
    let a = max(color.a, glowAccum * glowIntensity * 0.6);
    return vec4<f32>(r, a);
}
