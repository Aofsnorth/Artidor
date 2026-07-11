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
    let amount = clamp(uniforms.scalars.x, 0.0, 1.0);
    let intensity = clamp(uniforms.scalars.y, 0.0, 1.0);
    let pixel = vec2<f32>(1.0) / uniforms.resolution;

    let color = textureSample(u_texture, u_sampler, uv);
    let left = textureSample(u_texture, u_sampler, clamp(uv - vec2<f32>(pixel.x, 0.0), vec2<f32>(0.0), vec2<f32>(1.0)));
    let right = textureSample(u_texture, u_sampler, clamp(uv + vec2<f32>(pixel.x, 0.0), vec2<f32>(0.0), vec2<f32>(1.0)));
    let top = textureSample(u_texture, u_sampler, clamp(uv - vec2<f32>(0.0, pixel.y), vec2<f32>(0.0), vec2<f32>(1.0)));
    let bottom = textureSample(u_texture, u_sampler, clamp(uv + vec2<f32>(0.0, pixel.y), vec2<f32>(0.0), vec2<f32>(1.0)));

    let gray = vec3<f32>(0.299, 0.587, 0.114);
    let gx = dot(left.rgb, gray) - dot(right.rgb, gray);
    let gy = dot(top.rgb, gray) - dot(bottom.rgb, gray);
    let edge = sqrt(gx * gx + gy * gy);

    let glow = edge * amount * intensity * 3.0;
    return vec4<f32>(color.rgb + vec3<f32>(glow), color.a);
}
