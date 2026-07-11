# Alight Motion Effect Catalog Audit — Web Editor

**Date:** 2026-07-11  
**Scope:** Normalize the complete user-supplied Alight-Motion-style catalog from the master completion plan and map every item to Artidor's current effect system. No code changes; this is research input for Task 8 implementation.  
**Sources:**

- `docs/superpowers/plans/2026-07-11-web-editor-master-completion.md` (Task 7 + Appendix A)
- `docs/am-basic-editing-tools.md` (parameter types, keyframe rules, render order)
- `apps/web/src/lib/effects/definitions/**/*.ts` and `apps/web/src/lib/effects/types.ts`
- `rust/crates/effects/src/pipeline.rs` (registered WGSL shaders)
- Public Alight Motion Effect Guide at `https://guide.alightmotion.com/effects/`

---

## 1. Scope & Methodology

1. **Normalize names** to kebab-case English stable IDs. Where an official Alight Motion guide page exists, its URL slug is used as the canonical ID.
2. **Deduplicate** accidental repeats. The catalog intentionally lists `Berkedip` twice; the second entry is tracked as an alias.
3. **Map to Artidor** using the exact registered WGSL shaders in `rust/crates/effects/src/pipeline.rs` and the TS definitions in `apps/web/src/lib/effects/definitions/`.
4. **Assign status** from:
   - `existing-working` — shader + definition present and matches the AM behavior well enough to ship.
   - `existing-needs-fix` — shader exists but parameters, naming, or uniform mapping need alignment.
   - `planned-gpu` — feasible as one or more GPU passes; no shader yet.
   - `alias` — duplicate name or premium variant that reuses another ID.
   - `unavailable` — cannot be implemented without major new subsystems (3D mesh engine, audio FFT pipeline, ML models, etc.).
   - `rejected-for-cost` — technically a GPU shader could be written, but the implementation cost (procedural particles, full 3D scenes, optical-flow effects) is out of scope for the current milestone.
5. **Record parameters** from public AM guide pages where available, otherwise from the AM-style spec (`docs/am-basic-editing-tools.md`) or inferred from behavior. Numeric/color/vec params are keyframe-eligible; booleans and discrete enums are hold/step only.
6. **Pass counts & quality tiers** are estimates for planned effects and current measured values for existing ones.

> **Honesty rule:** effects listed as `unavailable` or `rejected-for-cost` are **not** presented as working. UI must disable them with a clear reason.

---

## 2. Normalized Catalog Table

Legend: `**P**` = in the priority working subset from Task 7.

### 2.1 Text

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `count-up-down` | Count Up/Down — Hitung Naik/Turun | planned-gpu **P** | `add` (number, -100000..100000, 0, keyframe); `multiply` (number, -2..2, 1, keyframe) | 0 (text layer processor) | original numbers unchanged |
| `text-spacing` | Text Spacing — Jarak Teks | planned-gpu **P** | `letterSpacing` (number, px); `lineSpacing` (number, px) | 0 | none |
| `text-progress` | Text Progress — Kemajuan Teks | planned-gpu **P** | `progress` (number, 0..1, 0, keyframe) | 0 | full text |
| `timecode` | Timecode — Kode Waktu | planned-gpu **P** | `format` (enum); `frameRate` (number) | 0 | static source text |
| `text-randomizer` | Text Randomizer — Pengacak Teks | planned-gpu **P** | `amount` (number, 0..1); `seed` (number, 0..5); `preserveCase` (bool) | 0 | source text |
| `change-text` | Change Text — Ubah Teks | planned-gpu **P** | `targetText` (string, hold); `progress` (number, 0..1, keyframe) | 0 | source text |

### 2.2 Matte / Mask / Key

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `chroma-key` | Chroma Key | existing-needs-fix **P** | `keyColor` (color); `threshold` (0..1, 0.1); `feather` (0.01..0.75, 0.05); `defringe` (bool); `invert` (bool) | 1 pass (current shader maps `similarity`/`smoothness`/`spill`) | `remove-background` |
| `advanced-chroma-key` | Chroma Key Lanjutan | planned-gpu **P** | same as `chroma-key` + `edgeRefine`, `despillStrength` | 1-2 passes | `chroma-key` |
| `luma-key` | Luma Key | planned-gpu **P** | `threshold` (0..1, 0.5); `invert` (bool); `feather` (0..1) | 1 pass | opaque layer |
| `matte-choker` | Matte Choker | planned-gpu **P** | `choke` (number, -100..100, 0, keyframe) | 1-2 passes (alpha erode/dilate) | none |
| `solid-matte` | Solid Matte / Matte Solid | planned-gpu **P** | `color` (color); `alpha` (0..1, 1, keyframe) | 1 pass | solid fill |
| `spill-cleaner` | Spill Cleaner / Pembersih Tumpahan Kunci | planned-gpu **P** | `spill` (0..1, 0.3); `keyColor` (color) | 1 pass | none |
| `wipe` | Wipe / Usap | planned-gpu **P** | `progress` (0..1, 0.5, keyframe); `direction` (enum / angle); `feather` (0..1) | 1 pass | full / hidden |
| `radial-wipe` | Radial Wipe / Usap Radial | planned-gpu **P** | `progress` (0..1, keyframe); `startAngle`, `endAngle` (deg); `feather` | 1 pass | full / hidden |
| `burning-wipe-plus` | Burning Wipe+ | unavailable | procedural fire edge simulation | — | `wipe` |
| `fade-noise` | Fade Noise | planned-gpu | `strength` (0..1); `seed` (0..5) | 1 pass | `dissolve` |
| `luma-stamper` | Luma Stamper | planned-gpu | `threshold` (0..1); `invert` (bool) | 1 pass | `luma-key` |
| `luma-stamper-plus` | Luma Stamper+ | alias | same as `luma-stamper` | — | `luma-stamper` |
| `wipe-plus` | Wipe+ | alias | same as `wipe` | — | `wipe` |
| `matte-edge` | Matte Edge / Pinggiran Matte | planned-gpu | `width` (px); `color`; `alpha` (0..1, keyframe) | 1 pass | none |
| `scheme` | Skema | unavailable | no public behavior definition | — | none |

### 2.3 Opacity / Visibility

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `blink` | Blink / Berkedip | planned-gpu **P** | `frequency` (0..16 Hz, 2, keyframe) | 0/1 (opacity modulation) | opacity keyframes |
| `berkedip-duplicate` | Berkedip (2nd entry) | alias | alias of `blink` | — | `blink` |
| `block-dissolve` | Block Dissolve | planned-gpu **P** | `strength` (0..1, 0.75, keyframe); `size` (px, 1..500, 10); `stretch` (vec2); `seed`; `fade`; `offset` | 1 pass | `dissolve` |
| `feather` | Feather / Bulu | planned-gpu **P** | `strength` (0..2, 0.15, keyframe); `iterations` (1..5, 3) | 1-3 alpha-blur passes | none |
| `fade-in-out` | Fade In/Out | planned-gpu **P** | `inDuration` (0..10s, 0.5s); `outDuration` (0..10s, 0.5s) | 0 (auto opacity) | opacity keyframes |
| `dissolve` | Dissolve / Larut | planned-gpu **P** | `strength` (0..1, 0.75, keyframe); `seed` (0..5) | 1 pass | opacity keyframes |
| `pressure-opacity` | Pressure Opacity / Opasitas Tekanan | unavailable | depends on pen-pressure input | — | layer opacity |

### 2.4 Repeat

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `scatter-field` | Scatter Field / Bidang Sebar | planned-gpu | `count`; `scatterX`, `scatterY` | 1 pass | `scatter-repeat` |
| `repeat` | Repeat / Pengulangan | planned-gpu **P** | `count` (int, 1..50); `offsetX`, `offsetY` (keyframe) | 1 pass | none |
| `grid-repeat` | Grid Repeat / Pengulangan Kisi | planned-gpu **P** | `rows`, `cols`; `spacingX`, `spacingY` | 1 pass | none |
| `linear-repeat` | Linear Repeat / Pengulangan Linear | planned-gpu **P** | `count`; `spacing`; `angle` | 1 pass | none |
| `radial-repeat` | Radial Repeat / Pengulangan Radial | planned-gpu **P** | `count`; `radius`; `angleOffset` | 1 pass | none |
| `scatter-repeat` | Scatter Repeat / Pengulangan Sebaran | alias | same as `scatter-field` | — | `scatter-field` |
| `repeat-along-path` | Repeat Along Path / Ulangi Sepanjang Jalur | planned-gpu | `path` (path/hold); `count`; `spacing` | 1 pass | `repeat` |

### 2.5 Move / Transform

These are mostly layer-transform or motion-generator effects; several map to Artidor's existing Move & Transform panel rather than a GPU shader.

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `swing` | Swing / Ayun | planned-gpu | `amount`; `speed` | 1 pass | transform rotation |
| `scale-helper` | Scale Helper / Bantuan Skala | alias | uses existing layer `transform.scale` | — | transform |
| `corner-pin` | Corner Pin (Beta) | planned-gpu | four `corner` points (vec2, hold) | 1 pass | transform |
| `move-along-path` | Move Along Path / Gerak Sepanjang Jalur | planned-gpu | `path` (hold); `progress` (0..1, keyframe) | 0 | transform position |
| `auto-shake` | Auto Shake / Guncang Otomatis | planned-gpu **P** | `amount` (number); `frequency` (Hz); `seed` | 1 (per-frame offset) | transform position |
| `random-flicker` | Random Flicker / Kerlipan Acak | planned-gpu | `intensity`; `speed`; `seed` | 0/1 | opacity keyframes |
| `offset` | Offset | planned-gpu **P** | `x`, `y` (px, keyframe) | 0 | transform position |
| `oscillate` | Oscillate / Ombang-ambing | planned-gpu | `amplitude`; `frequency`; `phase` | 1 | transform position |
| `random-displacement` | Random Displacement / Pemindahan Acak | planned-gpu | `amount`; `seed` | 1 | `offset` |
| `spin` | Spin / Putar | planned-gpu **P** | `speed` (deg/s); `direction` (enum) | 0 | transform rotation |
| `stretch-axis` | Stretch Axis / Regangkan Sumbu | planned-gpu | `amount`; `angle` | 1 | transform scale |
| `transform` | Transform | alias | core layer transform controls | — | — |
| `raster-transform` | Raster Transform / Transformasi Raster | planned-gpu **P** | subdivisions (int); corner pins | 1 pass | transform |
| `pulse-size` | Pulse Size / Ukuran Tekanan | planned-gpu | `minScale`, `maxScale`; `frequency` | 0 | transform scale |

### 2.6 Blur

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `box-blur` | Box Blur / Buram Kotak | planned-gpu **P** | `strength` (0..2, 0.15, keyframe) | 1-2 passes | `gaussian-blur` |
| `directional-blur` | Directional Blur / Buram Direksional | planned-gpu **P** | `strength` (0..1, 0.15, keyframe); `angle` (0..3600°, 0°) | 1 pass | `velocity-blur` |
| `motion-blur` | Motion Blur / Buram Gerak | existing-needs-fix **P** | `tune` (0..4, 1); `position`, `scale`, `angle` (bools) | 1 pass | `directional-blur` |
| `gaussian-blur` | Gaussian Blur / Buram Gaussian | existing-working **P** | `intensity` (0..100, 15) mapped to σ | preview: 2-8 passes; export: up to 16 passes | `box-blur` |
| `lens-blur` | Lens Blur / Buram Lensa | planned-gpu **P** | `strength`; `radius` | 2-4 passes | `gaussian-blur` |
| `zoom-blur` | Zoom Blur / Buram Zoom | planned-gpu **P** | `strength`; `center` (vec2) | 1 pass | `gaussian-blur` |
| `sharpen` | Sharpen / Pertajam | existing-working **P** | `amount` (0..100) | 1 pass | `unsharp-mask` |
| `unsharp-mask` | Unsharp Mask | planned-gpu **P** | `strength` (0..2, 0.02); `amount` (0..200%, 50%); `threshold` (-50..100%, 50%); `showMask` (bool) | 2 passes | `sharpen` |
| `velocity-blur` | Velocity Blur | existing-working | `amount` (0..100); `angle` (0..360°) | 1 pass | `directional-blur` |
| *blur variants* | Box Blur+, Gaussian Blur+, Motion Blur+, Inner Blur+, Chromatic VortexBlur, Chromatic Zoom Blur, Hexagon Blur, Spin Blur, Mask Blur, Inner Blur, Frosted Blur, Vortex Blur, Warp Blur, RGB MotionBlur (Beta), Zoom Streaks, Spin Streaks, Streak Strips, Linear Streaks, Mosaic | unavailable / alias | plus/beta variants of the above; mosaic belongs to distortion | — | nearest base blur |

### 2.7 Image & Edge

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `glow` | Glow / Cahaya | existing-needs-fix **P** | `amount` (0..100) currently; needs `radius`, `intensity`, `color` | 1-2 passes | `outer-glow` |
| `inner-glow` | Inner Glow / Cahaya dari Dalam | planned-gpu **P** | `radius`; `intensity`; `color` | 1-2 passes | none |
| `drop-shadow` | Drop Shadow | existing-working **P** | `distance`, `blur`, `angle` | 1-2 passes | none |
| `edge-glow` | Edge Glow | planned-gpu **P** | `smoothing` (1..10, 5); `threshold` (0..1, 0.7); `invert`; `blur`; `spread`; `color`; `blend`; `gamma` | 2-3 passes | `glow` |
| `find-edges` | Find Edges / Temukan Tepi | existing-working **P** | `strength` (0..100) mapped to Sobel | 1 pass | `edge-detect` |
| `contour-lines` | Contour / Garis Kontur | planned-gpu **P** | `color`; `offset`; `width`; `alpha`; `fill`; `count`; `phase`; `fade` | 1-2 passes | `stroke` |
| `halftone` | Halftone / Titik Halftone | existing-working **P** | `amount` (0..100) | 1 pass | `pixelate` |
| `edge-detect` | Edge Detect | existing-working | `amount` (0..100) | 1 pass | `find-edges` |
| `outer-glow` | Outer Glow | existing-working | `radius`, `intensity` | 1 pass | `glow` |
| `stroke` | Stroke / Warna Stroke | existing-working | `amount`, `thickness` | 1 pass | `contour-lines` |
| *other image/edge* | BlackBar Maker+, Brush Sketch, Light, Deep Glow+, DeepGlow Enhanced, Drop Shadow+, Edge Line, Free Palette Color, Halftone Lines, Glow Scan, Gradient Contour, Roughen Edges, Image Progress, Soft Tilt, Star Glint, StarsGlint V2, Stroke Taper, Soft Edges, Electric Edges, Halftone Dots CMYK, Smooth Bevel+ | unavailable / alias | mostly premium variants or artistic generators | — | nearest base effect |

### 2.8 Color & Light

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `brightness-contrast` | Brightness / Contrast / Kecerahan / Kontras | existing-working **P** | `brightness` (-100..100%, 0%, keyframe); `contrast` (-100..300%, 0%, keyframe) | 1 pass | none |
| `color-balance` | Color Balance | planned-gpu **P** | `shadows`, `midtones`, `highlights` RGB vec3 | 1 pass | `color-wheels` |
| `replace-color` | Replace Color / Ganti Warna | planned-gpu **P** | `fromColor`; `toColor`; `tolerance` (0..1); `softness` | 1 pass | none |
| `hsl` | HSL Mixer / Mixer HSL | existing-needs-fix **P** | `hue` (-180..180); `saturation` (-100..100); `luminance` (-100..100) | currently 0 passes — renderer missing | `hue-rotate` / `saturation` |
| `rgb-mixer` | RGB Mixer / Mixer RGB | planned-gpu **P** | per-channel gains (vec3 / 9 scalars) | 1 pass | `curves` |
| `tint` | Tint / Nada Warna | planned-gpu **P** | `tint` (hue + strength vec2/polar, keyframe) | 1 pass | `colorize` |
| `four-color-gradient` | Four Color Gradient / Gradien empat warna | planned-gpu **P** | `color1..4`; corner positions (vec2) | 1 pass | `gradient-overlay` |
| `gradient-overlay` | Gradient Overlay / Hamparan Gradien | planned-gpu **P** | gradient stops; `angle` / start-end points; `blend` | 1 pass | solid fill |
| `colorize` | Colorize / New Colorize | planned-gpu **P** | `tint` (color disc — hue & strength, keyframe) | 1 pass | `tint` |
| `hue-rotate` | Hue Rotate | existing-working | `amount` (0..360°) | 1 pass | `hsl` |
| `saturation` | Saturation | existing-working | `amount` (0..200%) | 1 pass | `hsl` |
| `vibrance` | Vibrance | existing-working | `amount` (0..100) | 1 pass | `saturation` |
| `temperature` | Color Temperature / New ColorTemp | existing-working | `amount` (0..100) | 1 pass | `color-balance` |
| `sepia` | Sepia | existing-working | `amount` (0..100) | 1 pass | `colorize` |
| `grayscale` | Grayscale | existing-working | `amount` (0..100) | 1 pass | `saturation` |
| `invert` | Invert | existing-working | `amount` (0..100) | 1 pass | none |
| `highlights` | Highlights | existing-working | `amount` (0..100) | 1 pass | `brightness` |
| `shadows` | Shadows | existing-working | `amount` (0..100) | 1 pass | `brightness` |
| `vignette` | Vignette | existing-working | `amount` (0..100) | 1 pass | none |
| `chromatic-aberration` | Chromatic Abberation | existing-working | `amount` (0..100) | 1 pass | none |
| `color-wheels` | Color Wheels | existing-needs-fix | `lift`, `gamma`, `gain` vec3 | 1 pass but only lift uploaded | none |
| `curves` | RGB Curves | existing-needs-fix | `intensity`; curve data held externally | 0 passes — renderer missing | `color-balance` |
| `lut` | LUT | existing-needs-fix | `intensity`; 3D LUT asset | 0 passes — renderer missing | `color-balance` |
| *other color/light* | 3 Color Gradient+, Threshold, Long Shadow, Radial Shadow, Soft Light, Print, Dark Glow, Fast Adjusting+, Gradient Shadow+, LUT Stealer, Lens Distortion+, MultiGradient Map+, Color Tone | unavailable / alias | mostly premium/ML/distortion variants | — | nearest base effect |

### 2.9 Distortion / Warp

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `mirror` | Mirror / Cermin | existing-working **P** | `amount` (0..100) mapped to segments | 1 pass | none |
| `bulge` | Bulge / Pinch / Cubit/Tonjolan | existing-working **P** | `amount` (0..100) | 1 pass | `twist` |
| `swirl` | Swirl / Ikal | existing-working **P** | `amount` (0..100) | 1 pass | `twist` |
| `pixelate` | Pixelate | existing-working **P** | `amount` (px, 2..64, 8) | 1 pass | none |
| `kaleidoscope` | Kaleidoscope | planned-gpu **P** | `segments` (int); `offset` (angle) | 1 pass | `mirror` |
| `polar-coordinates` | Polar Coordinates / Koordinat Kutub | planned-gpu **P** | `amount` (0..1); `center` (vec2) | 1 pass | none |
| `tile` | Tile / Ubin | planned-gpu **P** | `rows`, `cols`; `offset` | 1 pass | `grid-repeat` |
| `turbulent-displace` | Turbulent Displace / Pergeseran Petak Heksagon | planned-gpu **P** | `amount`; `size`; `offset`; `evolution` | 1 pass | `ripple` |
| `fractal-noise` | Fractal Noise / Lengkung Fraktal | planned-gpu **P** | `contrast`; `brightness`; `evolution`; `subscaling` | 1 pass | `grain` |
| `checker` | Checkerboard / Papan Catur | planned-gpu **P** | `size`; `color1`; `color2` | 1 pass | none |
| `grid` | Grid | planned-gpu **P** | `size`; `color`; `thickness` | 1 pass | none |
| `scanlines` | Scanlines | existing-working | `amount` (0..100) | 1 pass | none |
| `vhs-distortion` | VHS Distortion | planned-gpu | `amount`; `tracking`; `noise` | 2-3 passes | `vhs` |
| `rainy-screen` | Rainy Screen / Cuaca? | planned-gpu | `amount`; `speed`; `angle` | 1-2 passes | none |
| `water-reflection` | Water Reflection / Surface Waterwave | planned-gpu | `amount`; `speed`; `angle` | 1 pass | `ripple` |
| `fisheye` | Fisheye | existing-working | `amount` (0..100) | 1 pass | `bulge` |
| `ripple` | Ripple / Riak Bundar | existing-working | `amount` (0..100) | 1 pass | none |
| `wave` | Wave / Wave Warp | existing-working | `amount` (0..100) | 1 pass | none |
| `twist` | Twist | existing-working | `amount` (0..100) | 1 pass | `swirl` |
| `chromatic-aberration` | Chromatic Aberration | existing-working | `amount` (0..100) | 1 pass | none |
| `datamosh` | Datamosh | existing-working | `amount` (0..100) | 2 passes | `pixelate` |
| *distortion variants* | Glitch Blocks, Glitch MaskLines, Glitch Noise, Glitch Offset, Glitch Pixel, Glitch RGB, Glitch RandomPattern, Glitch VHS, Glass, Mirror Glass, Melting Screen, 360 Viewer, 360 Reorient Sphere, Hexagon Tile Shift/Rotate, Hexagon Tiling, Displacement Map, Polar Displacement Map, Puddle, Whirlpool, Refraction Warp, Squeeze, Stretch Segment, Warp Distortion, Tile Shift, Tile Rotate | unavailable / alias | requires procedural/displacement-map engine or is a premium variant | — | nearest base distortion |

### 2.10 3D Objects / Shapes

All 3D primitives in the catalog require a 3D mesh/SDF rasterizer that Artidor does not have. They are grouped as `unavailable` / `rejected-for-cost`.

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| *3D primitives* | Box, Cube, Hollow Box, Pyramid, Prism Star, Hexagonal Prism, Triangular Prism, Octahedron, Ellipsoid, Cylinder, Sphere, Torus, Ring, Heart, Star Polyhedron, 3D Particles (Beta), Flip Layer, Round, Page Curl, Three-axis Cross, Tunnel | unavailable / rejected | 3D geometry params | — | 2D shape layer |
| `raster-extrude` | Raster Extrude | unavailable | extrudes a raster layer in 3D | — | none |

### 2.11 Procedural Generators

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `scanlines` | Scanlines / TV Scanline + Glitch | existing-working **P** | `amount` (0..100) | 1 pass | none |
| `vhs` | VHS Tape / VHS Noise | existing-working **P** | `amount` (0..100) | 3 passes | `scanlines` |
| `rain` | Rain / Raindrop / Rintik Hujan | planned-gpu **P** | `amount`; `speed`; `angle`; `color` | 1-2 passes | none |
| `snow` | Snow / Snow Falling / Snowflake | planned-gpu **P** | `amount`; `speed`; `size` | 1-2 passes | none |
| `starfield` | Starfield / Simple Starfield / Creation Starfield / Starfield Particle V2 | planned-gpu **P** | `speed`; `count`; `brightness` | 1-2 passes | none |
| `clouds` | Clouds / Sky Clouds | unavailable | 3D/SDF noise | — | `fractal-noise` |
| `fire` | Fire / Flame / Rainbow Flame | rejected-for-cost | fluid/particle simulation | — | `fractal-noise` + colorize |
| `lightning` | Lightning / Lightning Rush / Petir | rejected-for-cost | branching procedural | — | `rays` |
| *other procedural* | 3D Grass, Aurora, Stars, Simple Stars, Color Multi, Chromatic Lensflare, Circular Fall, Comet, Constellations, Weather, Diffuse Glow, Dotted Point, Eclipse, Feather Fall, Flashing Alert, Floating Rings, Flow Texture, Fractal Texture, Lines, Glow Halos, Glow Radiant, Glow Sweep, Gradient Flow, Grunge, Hexagon Grid, Hexagonal Array, Net, Matrix Code, Nickel Texture, Noise Lensflare, Ribbon, Knot Pattern, Random Numbers, Random Light Bulbs, Retro Sun, Water Droplets, Blur Set, Shape Tunnel, Energy Ray, Radial Ray, Smoke Noise, Smoke Particle, Sparks, Split Lines, Starburst, TV Analogue, Dot, Text Displacement, Turbulence, Wavy Line, Wrap Texture, Wings Line, Wireframe Generator, ZCC Meteor | unavailable / rejected-for-cost | mostly particle/SDF/procedural systems | — | `fractal-noise`, `grain`, `scanlines` |

### 2.12 Misc / "Lainnya"

| Stable ID | Display name(s) | Status | Parameters | Passes / quality | Fallback |
|---|---|---|---|---|---|
| `manual-shake` | Manual Shake | planned-gpu **P** | `amount`; `frequency`; `seed` | 1 pass | `auto-shake` |
| `manual-shake-v2` | Manual Shake V2 | alias | same as `manual-shake` | — | `manual-shake` |
| `vhs-noise` | VHS Noise | existing-working **P** | mapped to `vhs` definition | 3 passes | `scanlines` |
| `time-quantization` | Time Quantization / Kuantisasi Waktu | unavailable | frame-stepping temporal effect | — | none |
| `audio-visualisation` | Audio Visualisation | unavailable | requires audio FFT texture pipeline | — | none |
| `noise-reduction` | Noise Reduction | unavailable | ML / temporal denoiser | — | none |
| `quality-fixer` | Quality Fixer | unavailable | ML upscaling / enhancement | — | none |
| `isolate` | Isolate | unavailable | depends on segmentation model | — | chroma-key |
| *other Lainnya* | 2D Tunnel, 2D Tunnel V2, 3D Floor Grid, 3D Extrude Plus, 3D Extrude Pyramid, 3D Scape, About Me, Color Grid, Cubemap 3D, DNA, Echoing, Echo Spinner, Extruded, Echo Keyframes, Electro Graph, Fake 3D, Fingerprint, Firework Particle, Galaxy, Gradient Displace, HDR Quality CC, High Tech Tunnel, Isi Belakang, Jelly Cubes, Light Particle, Light Speed, Lightning Sky, Linescape, Magic Extrude, Meteor, Money Fall, Neon Fireworks, New Starmap, Object Extrude, Optic Compensation, Paper Burn, Channel Remap HSV, Channel Remap RGB, Pemotong Jedah, Penilaian Latar Belakang, Pixel Explosion, Pixel Sortie, Plasma Wave, Plasma Random, Plasma Triangle, Point Tunnel, Random Visual #1, Retro Grid and Sun, Rocky Terrain, Solid Background, Shaded Light, Simple Grid, Speed Lines 1, Square Tunnel, Star Trails, Sunset, Synthwave, VCR Distortion, VR Combined, Vortex Void, Voxel Tunnel | unavailable / rejected-for-cost | 3D tunnels, particles, extrusions, ML effects, optical compensation | — | nearest base effect |

---

## 3. Priority Working Subset Summary

Effects marked `**P**` above are the priority working subset from the master plan. Their intended rollout order:

| # | Family | IDs | Target status |
|---|---|---|---|
| 1 | Text | `count-up-down`, `text-spacing`, `text-progress`, `timecode`, `text-randomizer`, `change-text` | planned-gpu (text processor) |
| 2 | Keying | `chroma-key`, `advanced-chroma-key`, `luma-key`, `matte-choker`, `solid-matte`, `spill-cleaner`, `wipe`, `radial-wipe` | existing-needs-fix → planned-gpu |
| 3 | Opacity | `blink`, `block-dissolve`, `feather`, `fade-in-out`, `dissolve` | planned-gpu |
| 4 | Repeat | `repeat`, `grid-repeat`, `linear-repeat`, `radial-repeat` | planned-gpu |
| 5 | Transform motion | `auto-shake`, `offset`, `spin`, `raster-transform` | planned-gpu |
| 6 | Blur | `box-blur`, `directional-blur`, `motion-blur`, `gaussian-blur`, `lens-blur`, `zoom-blur`, `sharpen`, `unsharp-mask` | existing-working / planned-gpu |
| 7 | Image/edge | `glow`, `inner-glow`, `drop-shadow`, `edge-glow`, `find-edges`, `contour-lines`, `halftone` | existing-needs-fix → planned-gpu |
| 8 | Color/light | `brightness-contrast`, `color-balance`, `replace-color`, `hsl`, `rgb-mixer`, `tint`, `four-color-gradient`, `gradient-overlay`, `colorize` | existing-working / planned-gpu |
| 9 | Distortion/procedural | `mirror`, `bulge`, `kaleidoscope`, `polar-coordinates`, `pixelate`, `tile`, `swirl`, `turbulent-displace`, `fractal-noise`, `checker`, `grid`, `rain`, `snow`, `starfield`, `scanlines`, `vhs-noise` | existing-working / planned-gpu |
| 10 | Misc | `manual-shake`, `manual-shake-v2`, `vhs-noise` | planned-gpu / existing-working |

---

## 4. Alias / Duplicate Notes

| Source issue | Stable ID(s) | Rule |
|---|---|---|
| `Berkedip` listed twice | `blink` and `berkedip-duplicate` | Second entry is an accidental duplicate. Both resolve to `blink`; no extra implementation. |
| `Luma Stamper+` / `Wipe+` | `luma-stamper-plus`, `wipe-plus` | Premium/plus variants are aliases of the base IDs. If they gain extra controls later, keep the base ID and add parameters, or mint a new `_plus` ID only after behavior is confirmed. |
| `Bidang Sebar` vs `Pengulangan Sebaran` | `scatter-field` / `scatter-repeat` | Both Indonesian phrases describe the same "scatter repeat" concept. Treat `scatter-repeat` as an alias of `scatter-field`. |
| `Transform` in Move/Transform group | `transform` | This is the core layer transform panel, not a GPU effect. Treat as an alias of existing Move & Transform controls. |
| `Scale Helper` | `scale-helper` | UI helper only; alias to `transform.scale`. |
| `Manual Shake V2` | `manual-shake-v2` | Alias of `manual-shake` until a public behavior difference is documented. |
| `Putar` | `spin` | In this catalog "Putar" maps to the AM `Spin` motion effect, not the generic layer rotation. |
| `VHS Noise`, `VHS Tape`, `VHS Distortion` | `vhs-noise`, `vhs`, `vhs-distortion` | `vhs-noise` and `vhs` both map to Artidor's existing `vhs` shader; `vhs-distortion` is a planned variant. |
| `Find Edges` ↔ `Edge Detect` | `find-edges` ↔ `edge-detect` | Same Sobel behavior; `edge-detect` already registered. `find-edges` should become a display alias. |
| `Glow` ↔ `Outer Glow` | `glow` ↔ `outer-glow` | Both produce an outer glow; `outer-glow` is more parameter-complete. `glow` should be upgraded or aliased. |

---

## 5. Unsupported / Rejected List

| Stable ID / group | Reason | Proposed fallback |
|---|---|---|
| `burning-wipe-plus` | Procedural fire edge simulation; needs a dedicated fire/noise shader. | `wipe` |
| `scheme` | No documented public behavior. | none |
| `pressure-opacity` | Requires pen/stylus pressure input pipeline. | layer opacity |
| All 3D primitives (Box, Cube, Pyramid, Torus, etc.) | No 3D mesh/SDF rasterizer in Artidor. | 2D shape layers or pre-rendered assets |
| `raster-extrude` | Needs 3D extrusion of raster layers. | transform/skew |
| `audio-visualisation` | Needs audio FFT texture fed into GPU each frame. | none |
| `noise-reduction`, `quality-fixer`, `isolate` | Depend on ML models / segmentation; out of scope. | manual masking / keying |
| `time-quantization` | Temporal frame-stepping effect; requires render-time remapping logic not currently present. | none |
| `clouds`, `fire`/`flame`, `lightning`, particle fireworks, `smoke` | Full procedural particle/fluid simulation. Rejected for cost. | `fractal-noise` + `colorize` / `grain` |
| `copy-background`, `isi-belakang`, `magnify-background` | Needs access to the composited background at the layer's position; possible but requires multi-pass group compositing. | unavailable |
| `about-me`, `channel-remap` variants, `optic-compensation`, `VCR-distortion`, `VR-combined` | Niche IP/template effects or require external assets. | nearest base effect |

---

## 6. Implementation Recommendations

1. **Keying family first** — Align `chroma-key` to AM's `threshold`/`feather`/`defringe`/`invert` naming, then add `luma-key`, `matte-choker`, `solid-matte`, `spill-cleaner`, `wipe`, and `radial-wipe`. These are all single-pass alpha masks and reuse the existing `chroma-key` WGSL pipeline pattern.
2. **Opacity utility effects** — Implement `blink`, `fade-in-out`, `dissolve`, `block-dissolve`, and `feather` next. They are low-risk (0–1 pass) and unblock common motion-graphics workflows. `feather` specifically reuses the alpha-channel blur primitive.
3. **Blur family expansion** — Add `box-blur`, `directional-blur`, `lens-blur`, `zoom-blur`, and `unsharp-mask`. Existing `gaussian-blur`, `motion-blur`, `velocity-blur`, and `sharpen` already prove the multi-pass pipeline. Share a `BlurQuality` policy that caps preview iterations on low-end GPUs.
4. **Distortion primitives** — Leverage existing `mirror`, `bulge`, `swirl`, `twist`, `pixelate`, `ripple`, `wave`, and `fisheye` shaders. Add `kaleidoscope`, `polar-coordinates`, `tile`, `turbulent-displace`, `fractal-noise`, `checker`, and `grid` as new single-pass fragment shaders. These share the common `u_amount` + `resolution` uniform pattern.
5. **Color/light and gradients** — Fix `color-wheels`, `hsl`, `curves`, and `lut` so their renderer passes are wired. Then add `color-balance`, `replace-color`, `rgb-mixer`, `tint`, `colorize`, `four-color-gradient`, and `gradient-overlay`. The shared primitive needed is a generic **gradient/ramp texture generator** (linear, radial, four-corner) that can be reused by fills, overlays, and effects.
6. **Shared primitives to build** —
   - Alpha blur / feather pass.
   - Gradient/ramp generator (linear, radial, 4-color).
   - Noise function library (`fractal-noise`, `grain`, `dissolve`, `block-dissolve`).
   - Edge-detection Sobel pass.
   - Quality policy with low/balanced/high tiers and pass budgets.

---

## 7. References

- Alight Motion Effect Guide index: `https://guide.alightmotion.com/effects/`
- Individual pages consulted (public, no shader source copied):
  - `.../effects/blink`, `.../block-dissolve`, `.../feather`, `.../fade-in-out`, `.../dissolve`
  - `.../effects/chroma-key`, `.../luma-key`, `.../matte-choker`, `.../solid-matte`, `.../wipe`, `.../radial-wipe`
  - `.../effects/count-up-down`, `.../text-spacing`, `.../text-progress`, `.../timecode`, `.../text-randomizer`, `.../text-transform`
  - `.../effects/repeat`, `.../grid-repeat`, `.../linear-repeat`, `.../radial-repeat`
  - `.../effects/box-blur`, `.../directional-blur`, `.../gaussian-blur`, `.../lens-blur`, `.../motion-blur`, `.../zoom-blur`, `.../sharpen`, `.../unsharp-mask`
  - `.../effects/glow`, `.../inner-glow`, `.../edge-glow`, `.../find-edges`, `.../contour-lines`, `.../halftone-dots`
  - `.../effects/brightness-contrast`, `.../replace-color`, `.../colorize`, `.../four-color-gradient`, `.../gradient-overlay`
- Artidor effect registry: `apps/web/src/lib/effects/definitions/index.ts`
- Artidor effect types: `apps/web/src/lib/effects/types.ts`
- WGSL shader registration: `rust/crates/effects/src/pipeline.rs` lines 1–756
