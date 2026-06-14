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

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let texel = vec2<f32>(1.0 / uniforms.resolution.x, 1.0 / uniforms.resolution.y);

    let color = textureSample(u_texture, u_sampler, uv);
    let luma = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));

    // Simple alpha-test outline
    let threshold = uniforms.scalars.x;
    let outlineColor = vec3<f32>(0.0, 0.0, 0.0);
    let outlineThickness = uniforms.scalars.y;
    let hasAlpha = color.a > 0.01;

    // Sample alpha at small offsets for the outline
    let mut maxEdge = 0.0;
    for (var i: i32 = 0; i < 4; i = i + 1) {
        let angle = f32(i) * 1.5707963; // π/2
        let offset = vec2<f32>(cos(angle), sin(angle)) * texel * outlineThickness;
        let n = textureSample(u_texture, u_sampler, uv + offset).a;
        let s = textureSample(u_texture, u_sampler, uv - offset).a;
        maxEdge = max(maxEdge, abs(n - color.a) + abs(s - color.a));
    }

    if (hasAlpha) {
        return vec4<f32>(color.rgb, color.a);
    }
    // Show outline where there's a transition from alpha to nothing
    let edgeFactor = clamp(maxEdge * 12.0, 0.0, 1.0);
    if (edgeFactor > 0.05) {
        return vec4<f32>(outlineColor, edgeFactor * threshold);
    }
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
}
