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
    let strength = uniforms.scalars.x;
    let count = 8.0;

    // Stack multiple smaller offsets to create a directional motion blur
    let dir = normalize(uniforms.direction);
    let texel = vec2<f32>(1.0 / uniforms.resolution.x, 1.0 / uniforms.resolution.y);

    var color = vec4<f32>(0.0);
    var total = 0.0;
    for (var i: i32 = 0; i < 8; i = i + 1) {
        let fi = f32(i);
        let t = (fi - (count - 1.0) * 0.5) * (strength / count);
        let offset = dir * texel * t;
        let weight = 1.0 - abs(t) / max(strength, 0.001);
        let sample = textureSample(u_texture, u_sampler, uv + offset);
        color += sample * max(weight, 0.0);
        total += max(weight, 0.0);
    }

    return color / max(total, 0.001);
}
