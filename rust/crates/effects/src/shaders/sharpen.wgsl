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
    let amount = uniforms.scalars.x; // Range [0.0, 100.0]
    let factor = amount / 100.0;
    
    let texel_size = vec2f(1.0, 1.0) / uniforms.resolution;
    let up = textureSample(input_texture, input_sampler, input.tex_coord + vec2f(0.0, -texel_size.y));
    let down = textureSample(input_texture, input_sampler, input.tex_coord + vec2f(0.0, texel_size.y));
    let left = textureSample(input_texture, input_sampler, input.tex_coord + vec2f(-texel_size.x, 0.0));
    let right = textureSample(input_texture, input_sampler, input.tex_coord + vec2f(texel_size.x, 0.0));
    
    let sharpened = color * 5.0 - (up + down + left + right);
    var rgb = mix(color.rgb, sharpened.rgb, factor * 0.4);
    
    let contrast_factor = 1.0 + amount / 300.0;
    let saturation_factor = 1.0 + amount / 500.0;
    rgb = (rgb - 0.5) * contrast_factor + 0.5;
    
    let luma = dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
    rgb = mix(vec3f(luma), rgb, saturation_factor);
    
    return vec4f(clamp(rgb, vec3f(0.0), vec3f(1.0)), color.a);
}
