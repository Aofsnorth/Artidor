struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

fn hash22(p: vec2<f32>) -> f32 {
    let h = dot(p, vec2<f32>(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
}

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let color = textureSample(u_texture, u_sampler, uv);

    // u_amount = progress (0..1), u_block_size = pixel size of a block, u_seed = random seed
    let progress = uniforms.scalars.x;
    let block_size = max(uniforms.scalars.y, 1.0);
    let seed = uniforms.scalars.z;

    let block = floor(frag_coord.xy / block_size);
    let h = hash22(block + seed);

    if (h < progress) {
        return vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }
    return color;
}
