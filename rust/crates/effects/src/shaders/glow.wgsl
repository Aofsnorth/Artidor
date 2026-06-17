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

    // Brightness threshold for bloom-like glow
    let luminance = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let threshold = 0.5;
    let bloom = max(luminance - threshold, 0.0);
    let glow = color.rgb + bloom * vec3<f32>(1.0) * uniforms.scalars.x;

    return vec4<f32>(glow, color.a);
}
