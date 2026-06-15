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
    let src = textureSample(u_texture, u_sampler, uv);

    // Dot grid frequency scales with amount; cells are square in pixel space
    // so dots stay round regardless of aspect ratio.
    let dots = mix(40.0, 160.0, clamp(uniforms.scalars.x, 0.0, 1.0));
    let cell_px = uniforms.resolution.y / dots;

    // Rotate the sampling grid 45deg for the classic newsprint screen angle.
    let angle = 0.7853982;
    let c = cos(angle);
    let s = sin(angle);
    let rot = mat2x2<f32>(c, -s, s, c);

    let p = rot * (frag_coord.xy / cell_px);
    let cell_center = floor(p) + 0.5;
    let d = length(p - cell_center);

    // Dot radius grows as the local tone darkens (more ink for darker areas).
    let tone = dot(src.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let radius = sqrt(1.0 - tone) * 0.7071;
    let dot_mask = 1.0 - smoothstep(radius - 0.08, radius + 0.08, d);

    let ink = vec3<f32>(dot_mask);
    let result = mix(src.rgb, ink, clamp(uniforms.scalars.x * 1.5, 0.0, 1.0));
    return vec4<f32>(result, src.a);
}
