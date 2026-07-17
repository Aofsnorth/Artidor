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
    let amount = clamp(uniforms.scalars.x, 0.0, 1.0);
    // No clamp on shift — auto-scroll bakes time into shift and relies on fract().
    let shift = uniforms.scalars.y;
    let single_line = uniforms.scalars.z;
    let orientation = uniforms.scalars.w;
    let tiles = mix(1.0, 12.0, amount);

    var tile_count = vec2<f32>(tiles, tiles);
    if (single_line > 0.5) {
        if (orientation < 0.5) {
            tile_count = vec2<f32>(tiles, 1.0);
        } else {
            tile_count = vec2<f32>(1.0, tiles);
        }
    }

    // Scroll axis follows orientation when single-line; otherwise horizontal.
    var shift_vec = vec2<f32>(shift, 0.0);
    if (single_line > 0.5 && orientation > 0.5) {
        shift_vec = vec2<f32>(0.0, shift);
    }
    let shifted_uv = uv + shift_vec;
    let tiled_uv = fract(shifted_uv * tile_count);
    return textureSample(u_texture, u_sampler, clamp(tiled_uv, vec2<f32>(0.0), vec2<f32>(1.0)));
}
