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

    // u_amount = blink intensity, u_time = animation time, u_speed = speed multiplier
    let amount = uniforms.scalars.x;
    let time = uniforms.scalars.y;
    let speed = uniforms.scalars.z;

    let blink = abs(sin(time * speed));
    let opacity = 1.0 - amount * (1.0 - blink);
    return vec4<f32>(color.rgb, color.a * opacity);
}
