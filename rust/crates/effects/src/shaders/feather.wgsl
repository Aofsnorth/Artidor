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
    let texel = 1.0 / uniforms.resolution;

    // u_amount = blur radius in pixels
    let radius = uniforms.scalars.x;
    if (radius <= 0.0) {
        return textureSample(u_texture, u_sampler, uv);
    }

    // 5x5 Gaussian-ish kernel on the alpha channel. radius scales the step.
    var weighted_color = vec3<f32>(0.0);
    var weighted_alpha = 0.0;
    var weight_sum = 0.0;

    for (var y = -2; y <= 2; y = y + 1) {
        for (var x = -2; x <= 2; x = x + 1) {
            let offset = vec2<f32>(f32(x), f32(y)) * radius * texel;
            let sample = textureSample(u_texture, u_sampler, uv + offset);
            let weight = exp(-(f32(x * x) + f32(y * y)) / 2.0);
            weighted_color += sample.rgb * sample.a * weight;
            weighted_alpha += sample.a * weight;
            weight_sum += weight;
        }
    }

    if (weighted_alpha <= 0.0) {
        return vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }

    let out_alpha = weighted_alpha / weight_sum;
    let out_color = weighted_color / weighted_alpha;
    return vec4<f32>(out_color, out_alpha);
}
