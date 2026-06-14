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
    let amount = uniforms.scalars.x; // Range [0.0, 1.0]
    
    let sepia = vec3f(
        dot(color.rgb, vec3f(0.393, 0.769, 0.189)),
        dot(color.rgb, vec3f(0.349, 0.686, 0.168)),
        dot(color.rgb, vec3f(0.272, 0.534, 0.131))
    );
    let rgb = mix(color.rgb, sepia, amount);
    return vec4f(clamp(rgb, vec3f(0.0), vec3f(1.0)), color.a);
}
