struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct EffectUniforms {
    resolution: vec2f,
    direction: vec2f,
    scalars: vec4f,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let color = textureSample(input_texture, input_sampler, input.tex_coord);
    // `u_amount` is slider units in [-100, 100]: scaled to stops so the full
    // slider range is +/- 2 stops, the adjustment range CapCut exposes. This
    // is photometric exposure (multiplicative in linear light), deliberately
    // distinct from the `brightness` shader's plain multiplier.
    let amount = uniforms.scalars.x;
    let stops = amount / 50.0;
    let scale = exp2(stops);
    return vec4f(clamp(color.rgb * scale, vec3f(0.0), vec3f(1.0)), color.a);
}
