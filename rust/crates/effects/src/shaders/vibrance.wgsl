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

// RGB <-> HSV
fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
    let max_c = max(max(c.r, c.g), c.b);
    let min_c = min(min(c.r, c.g), c.b);
    let delta = max_c - min_c;

    var h: f32 = 0.0;
    let s: f32 = select(0.0, delta / max_c, max_c > 0.0);
    let v: f32 = max_c;

    if (delta > 0.0) {
        if (max_c == c.r) {
            h = (c.g - c.b) / delta;
        } else if (max_c == c.g) {
            h = 2.0 + (c.b - c.r) / delta;
        } else {
            h = 4.0 + (c.r - c.g) / delta;
        }
        h = h / 6.0;
        if (h < 0.0) {
            h = h + 1.0;
        }
    }
    return vec3<f32>(h, s, v);
}

fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
    let h = c.x * 6.0;
    let s = c.y;
    let v = c.z;

    let i = floor(h);
    let f = h - i;
    let p = v * (1.0 - s);
    let q = v * (1.0 - s * f);
    let t = v * (1.0 - s * (1.0 - f));

    var rgb: vec3<f32>;
    if (i == 0.0) { rgb = vec3<f32>(v, t, p); }
    else if (i == 1.0) { rgb = vec3<f32>(q, v, p); }
    else if (i == 2.0) { rgb = vec3<f32>(p, v, t); }
    else if (i == 3.0) { rgb = vec3<f32>(p, q, v); }
    else if (i == 4.0) { rgb = vec3<f32>(t, p, v); }
    else { rgb = vec3<f32>(v, p, q); }
    return rgb;
}

@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let color = textureSample(u_texture, u_sampler, uv);
    let hsv = rgb2hsv(color.rgb);
    // Vibrance: boost saturation of less-saturated pixels more
    let amount = uniforms.scalars.x;
    let boost = (1.0 - hsv.y) * amount;
    let new_s = clamp(hsv.y + boost, 0.0, 1.0);
    return vec4<f32>(hsv2rgb(vec3<f32>(hsv.x, new_s, hsv.z)), color.a);
}
