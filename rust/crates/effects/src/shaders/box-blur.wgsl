struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

const MAX_RADIUS: i32 = 10;

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let amount = clamp(uniforms.scalars.x, 0.0, 1.0);
    let radius = i32(mix(1.0, f32(MAX_RADIUS), amount));
    let pixel = vec2<f32>(1.0) / uniforms.resolution;

    var accum = vec4<f32>(0.0);
    var count: i32 = 0;
    for (var x: i32 = -MAX_RADIUS; x <= MAX_RADIUS; x = x + 1) {
        for (var y: i32 = -MAX_RADIUS; y <= MAX_RADIUS; y = y + 1) {
            if (x * x + y * y <= radius * radius) {
                let offset = vec2<f32>(f32(x), f32(y)) * pixel;
                accum = accum + textureSample(u_texture, u_sampler, clamp(uv + offset, vec2<f32>(0.0), vec2<f32>(1.0)));
                count = count + 1;
            }
        }
    }
    if (count == 0) {
        return textureSample(u_texture, u_sampler, uv);
    }
    return accum / f32(count);
}
