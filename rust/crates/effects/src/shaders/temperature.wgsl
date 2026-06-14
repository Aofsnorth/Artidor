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
    let amount = uniforms.scalars.x; // Range [-100.0, 100.0]
    
    var rgb = color.rgb;
    if (amount > 0.0) {
        let strength = amount / 100.0;
        let sepia = vec3f(
            dot(rgb, vec3f(0.393, 0.769, 0.189)),
            dot(rgb, vec3f(0.349, 0.686, 0.168)),
            dot(rgb, vec3f(0.272, 0.534, 0.131))
        );
        rgb = mix(rgb, sepia, strength);
        
        let luma = dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
        rgb = mix(vec3f(luma), rgb, 1.0 + strength * 0.3);
    } else if (amount < 0.0) {
        let strength = -amount / 100.0;
        let luma = dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
        rgb = mix(vec3f(luma), rgb, 1.0 - strength * 0.2);
        
        let angle = strength * 3.14159265;
        let k = vec3f(0.57735, 0.57735, 0.57735);
        let cosAngle = cos(angle);
        let sinAngle = sin(angle);
        rgb = rgb * cosAngle + cross(k, rgb) * sinAngle + k * dot(k, rgb) * (1.0 - cosAngle);
    }
    
    return vec4f(clamp(rgb, vec3f(0.0), vec3f(1.0)), color.a);
}
