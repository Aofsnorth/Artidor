struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let color = textureSample(u_texture, u_sampler, uv);

    // u_amount = base opacity, u_pressure = gradient strength, u_direction = gradient direction
    let base_opacity = uniforms.scalars.x;
    let pressure = uniforms.scalars.y;
    let dir = uniforms.direction;

    var gradient = 0.0;
    if (length(dir) > 0.0) {
        let n = normalize(dir);
        gradient = dot(uv, n) - 0.5;
    }

    let opacity = clamp(base_opacity - pressure * gradient, 0.0, 1.0);
    return vec4<f32>(color.rgb, color.a * opacity);
}
