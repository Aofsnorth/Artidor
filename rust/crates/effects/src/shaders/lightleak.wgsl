struct EffectUniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
};

@group(0) @binding(0) var u_texture: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

fn hash21(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.13);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(3.333));
    return fract((p3.x + p3.y) * p3.z);
}

// Light leak, ported from DonkeyCut (Apache 2.0). A warm corner bloom that
// breathes, three sweeping tilted streak bands, a faint orange wash, and a
// touch of saturation. The screen pass lights the darks; a plain pass at
// half alpha tints the brights, so the leak reads on any footage.
//   scalars.x = amount k in 0..1
//   scalars.y = time in seconds
@fragment
fn fragment_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = frag_coord.xy / uniforms.resolution;
    let k = clamp(uniforms.scalars.x, 0.0, 1.0);
    let t = max(0.0, uniforms.scalars.y);

    let base = textureSample(u_texture, u_sampler, uv);
    let luma = dot(base.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));

    // Saturate 1 + 0.06k.
    var col = mix(vec3<f32>(luma), base.rgb, 1.0 + 0.06 * k);

    // Warm wash (#ff9a3c, soft-light, 0.06k).
    let wash = vec3<f32>(1.0, 0.604, 0.235);
    var softWash = vec3<f32>(0.0);
    // soft-light per channel: blend <= 0.5 => base - (1-2b)*base*(1-base),
    // else base + (2b-1)*(d - base), d = 16b^3-12b^2+4b if base<=0.25 else sqrt.
    for (var i = 0; i < 3; i = i + 1) {
        let b = wash[i];
        let s = col[i];
        let d = select(((16.0 * s - 12.0) * s + 4.0) * s, sqrt(s), s <= 0.25);
        let sl = select(s - (1.0 - 2.0 * b) * s * (1.0 - s), s + (2.0 * b - 1.0) * (d - s), b <= 0.5);
        softWash[i] = sl;
    }
    col = mix(col, softWash, 0.06 * k);

    // Corner bloom: center breathes, alpha pulses.
    let cx = 0.16 + 0.14 * sin(t * 0.9);
    let cy = 0.2 + 0.11 * cos(t * 0.6);
    let alpha = (0.55 + 0.12 * sin(t * 1.3)) * k;
    let radius = max(uniforms.resolution.x, uniforms.resolution.y) * 0.7;
    let d = distance(frag_coord.xy, vec2<f32>(cx, cy) * uniforms.resolution) / radius;

    // Radial stops: 0 -> (255,190,120,0.9), 0.38 -> (255,150,60,0.5), 0.72 -> 0.
    var bloomCol = vec3<f32>(1.0, 0.745, 0.471);
    var bloomA = 0.9;
    if (d > 0.72) {
        bloomA = 0.0;
    } else if (d > 0.38) {
        let f = (d - 0.38) / 0.34;
        bloomCol = mix(vec3<f32>(1.0, 0.588, 0.235), vec3<f32>(1.0, 0.745, 0.471), f);
        bloomA = mix(0.5, 0.9, f);
    }

    // Screen blend at alpha, then plain at half alpha (LEAK_TINT).
    let bloomRGB = bloomCol * bloomA;
    let screened = vec3<f32>(1.0) - (vec3<f32>(1.0) - col) * (vec3<f32>(1.0) - bloomRGB);
    col = mix(col, screened, alpha);
    col = mix(col, bloomRGB, alpha * 0.5);

    // Streak bands: tilt, sweep and pulse per DonkeyCut's STREAK_BANDS.
    let streakGain = 0.45 + 0.55 * k;
    let count = clamp(i32(round(3.0 * k)), 1, 3);
    let streakCol = vec3<f32>(1.0, 0.784, 0.549);
    for (var b = 0; b < 3; b = b + 1) {
        if (b >= count) { break; }
        var angle = 62.0;
        var w = 0.045;
        var baseP = 0.3;
        var drift = 0.22;
        var sweep = 0.5;
        var pulse = 0.9;
        var phase = 0.0;
        if (b == 0) {
            angle = 62.0; w = 0.045; baseP = 0.3; drift = 0.22; sweep = 0.5; pulse = 0.9; phase = 0.0;
        } else if (b == 1) {
            angle = 74.0; w = 0.1; baseP = 0.62; drift = 0.24; sweep = 0.33; pulse = 0.6; phase = 2.1;
        } else {
            angle = 57.0; w = 0.028; baseP = 0.44; drift = 0.3; sweep = 0.75; pulse = 1.2; phase = 4.2;
        }
        let th = radians(angle);
        let axis = vec2<f32>(sin(th), -cos(th));
        let len = abs(axis.x) + abs(axis.y);
        let q = dot(uv - vec2<f32>(0.5), axis) / len + 0.5;
        let p = baseP + drift * sin(t * sweep + phase);
        let bandA = (0.55 + 0.3 * sin(t * pulse + phase * 1.7)) * streakGain;
        let g = exp(-0.5 * pow((q - p) / w, 2.0));

        let streakRGB = streakCol * bandA * g;
        let sScreen = vec3<f32>(1.0) - (vec3<f32>(1.0) - col) * (vec3<f32>(1.0) - streakRGB);
        col = mix(col, sScreen, 1.0);
        col = mix(col, streakRGB, 0.5);
    }

    return vec4<f32>(clamp(col, vec3<f32>(0.0), vec3<f32>(1.0)), base.a);
}
