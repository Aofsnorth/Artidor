struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

fn hash21(p: vec2<f32>) -> f32 {
    let h = dot(p, vec2<f32>(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
}

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let color = textureSample(u_texture, u_sampler, uv);

    // u_amount = progress (0..1), u_seed = random seed
    let progress = uniforms.scalars.x;
    let seed = uniforms.scalars.y;

    let n = hash21(uv * 100.0 + seed);
    if (n < progress) {
        return vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }
    return color;
}
