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
 * Velocity-based motion blur (Alight Motion feature).
 *
 * Rather than uniformly blurring in a fixed direction, we use a velocity
 * texture (RG channels) plus a magnitude uniform to do a per-pixel
 * velocity-aligned blur. In a real app the velocity texture would be
 * generated from inter-frame motion vectors; for the simple version
 * (with a uniform "u_velocity" direction+strength) we just do an
 * N-tap blur in the user-supplied direction.
 *
 * When the renderer passes a forward+backward pair of samples, this looks
 * identical to "motion blur with constant velocity" — the per-pixel variation
 * is reserved for a future velocity-texture mode.
 */
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let texel = vec2<f32>(1.0 / uniforms.resolution.x, 1.0 / uniforms.resolution.y);
    let dir = normalize(uniforms.direction);
    let strength = uniforms.scalars.x; // 0..1 strength
    let samples_i = 8;

    var color = vec4<f32>(0.0);
    var total = 0.0;
    for (var i: i32 = 0; i < 8; i = i + 1) {
        let fi = f32(i);
        // Spread samples along [-1, 1] of the strength range
        let t = (fi - 3.5) * (strength / 4.0);
        let offset = dir * texel * t * 8.0;
        let weight = 1.0 - abs(t);
        let sample = textureSample(u_texture, u_sampler, uv + offset);
        color += sample * max(weight, 0.0);
        total += max(weight, 0.0);
    }

    return color / max(total, 0.001);
}
