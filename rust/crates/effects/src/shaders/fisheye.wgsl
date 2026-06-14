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
    let uv = frag_coord.xy / uniforms.resolution;

    // Spherical fisheye distortion
    let center = vec2<f32>(0.5, 0.5);
    var d = uv - center;
    let r = length(d) * 2.0;
    let strength = uniforms.scalars.x;

    if (r < 1.0) {
        let newR = pow(r, 1.0 + strength);
        d = d * (newR / max(r, 0.001));
    }

    let newUv = center + d;
    if (newUv.x < 0.0 || newUv.x > 1.0 || newUv.y < 0.0 || newUv.y > 1.0) {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
    return textureSample(u_texture, u_sampler, newUv);
}
