struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

fn luma(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.299, 0.587, 0.114));
}

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let texel = 1.0 / uniforms.resolution;
    let src = textureSample(u_texture, u_sampler, uv);

    // 3x3 Sobel operator on luma.
    let tl = luma(textureSample(u_texture, u_sampler, uv + texel * vec2<f32>(-1.0, -1.0)).rgb);
    let tc = luma(textureSample(u_texture, u_sampler, uv + texel * vec2<f32>(0.0, -1.0)).rgb);
    let tr = luma(textureSample(u_texture, u_sampler, uv + texel * vec2<f32>(1.0, -1.0)).rgb);
    let ml = luma(textureSample(u_texture, u_sampler, uv + texel * vec2<f32>(-1.0, 0.0)).rgb);
    let mr = luma(textureSample(u_texture, u_sampler, uv + texel * vec2<f32>(1.0, 0.0)).rgb);
    let bl = luma(textureSample(u_texture, u_sampler, uv + texel * vec2<f32>(-1.0, 1.0)).rgb);
    let bc = luma(textureSample(u_texture, u_sampler, uv + texel * vec2<f32>(0.0, 1.0)).rgb);
    let br = luma(textureSample(u_texture, u_sampler, uv + texel * vec2<f32>(1.0, 1.0)).rgb);

    let gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    let gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    let edge = clamp(sqrt(gx * gx + gy * gy) * (0.5 + uniforms.scalars.x * 3.0), 0.0, 1.0);

    // Blend between the original and a white-on-black outline drawing.
    let outline = vec3<f32>(edge);
    let rgb = mix(src.rgb, outline, clamp(uniforms.scalars.x * 1.5, 0.0, 1.0));
    return vec4<f32>(rgb, src.a);
}
