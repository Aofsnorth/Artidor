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

    // Kaleidoscope: fold the frame into N angular wedges around the center.
    let center = vec2<f32>(0.5, 0.5);
    let d = uv - center;
    let segments = mix(2.0, 12.0, clamp(uniforms.scalars.x, 0.0, 1.0));
    let seg_angle = 6.2831853 / segments;

    var angle = atan2(d.y, d.x);
    let radius = length(d);

    // Mirror within each wedge so the seams reflect rather than repeat.
    angle = angle - seg_angle * floor(angle / seg_angle);
    angle = abs(angle - seg_angle * 0.5);

    let mirrored = center + vec2<f32>(cos(angle), sin(angle)) * radius;
    let sample_uv = clamp(mirrored, vec2<f32>(0.0), vec2<f32>(1.0));
    return textureSample(u_texture, u_sampler, sample_uv);
}
