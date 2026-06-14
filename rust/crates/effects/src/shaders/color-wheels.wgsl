struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

@vertex
fn vertex_main(@location(0) position: vec2<f32>) -> vec4<f32> {
    return vec4<f32>(position, 0.0, 1.0);
}

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    // Color Wheels approximation: lift (shadows), gamma (midtones), gain (highlights)
    // amount scalars store: lift.r, lift.g, lift.b, gamma.r
    // (gamma.g, gamma.b, gain.r, gain.g, gain.b encoded in the next 3 passes if needed)
    // For simplicity we apply a single uniform lift/gamma/gain.
    let uv = frag_coord.xy / uniforms.resolution;
    let color = textureSample(u_texture, u_sampler, uv);

    let lift = vec3<f32>(uniforms.scalars.x, uniforms.scalars.y, uniforms.scalars.z);
    // Encode gamma and gain as offset over the texture — for this minimal pass,
    // we just adjust lift (the additional values are no-ops in this pass).
    let liftAmount = 0.3;
    let liftCol = lift * liftAmount;
    let result = color.rgb + liftCol;
    return vec4<f32>(result, color.a);
}
