struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// Map a 0..1 heat value onto a thermal-camera gradient
// (black -> blue -> magenta -> red -> orange -> yellow -> white).
fn thermal_ramp(t: f32) -> vec3<f32> {
    let x = clamp(t, 0.0, 1.0);
    let c0 = vec3<f32>(0.0, 0.0, 0.0);
    let c1 = vec3<f32>(0.0, 0.0, 0.6);
    let c2 = vec3<f32>(0.6, 0.0, 0.7);
    let c3 = vec3<f32>(1.0, 0.0, 0.0);
    let c4 = vec3<f32>(1.0, 0.6, 0.0);
    let c5 = vec3<f32>(1.0, 1.0, 0.4);
    let c6 = vec3<f32>(1.0, 1.0, 1.0);

    if (x < 0.166) { return mix(c0, c1, x / 0.166); }
    if (x < 0.333) { return mix(c1, c2, (x - 0.166) / 0.167); }
    if (x < 0.5)   { return mix(c2, c3, (x - 0.333) / 0.167); }
    if (x < 0.666) { return mix(c3, c4, (x - 0.5) / 0.166); }
    if (x < 0.833) { return mix(c4, c5, (x - 0.666) / 0.167); }
    return mix(c5, c6, (x - 0.833) / 0.167);
}

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let src = textureSample(u_texture, u_sampler, uv);

    let heat = dot(src.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let thermal = thermal_ramp(heat);
    let rgb = mix(src.rgb, thermal, clamp(uniforms.scalars.x * 1.25, 0.0, 1.0));
    return vec4<f32>(rgb, src.a);
}
