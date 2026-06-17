# DaVinci Resolve Color Page — Implementation Reference

Concise technical reference for building an "Adjust" / "Color" inspector in a web video editor. Each tool is described as: **purpose · parameter · range · default · UX hint**. Numeric defaults are Resolve 18/19 conventions; treat them as a starting point, not contract.

---

## 1. Primary Wheels (Lift / Gamma / Gain / Offset)

Foundational tonal color balance. Three overlapping luminance ranges + one global.

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **Lift** (Master) | Black/shadow luminance offset | −1.00 → +1.00 (log), or −100 → +100 (legacy) | 0.00 | Single slider, dark zone, bottom row |
| **Lift Red/Green/Blue** | Shadow color cast | same as Lift | 0.00 | Triple slider, unlocked via "gang" toggle |
| **Gamma** (Master) | Midtone luminance offset | −1.00 → +1.00 / −100 → +100 | 0.00 | Mid zone, middle row |
| **Gamma RGB** | Midtone color cast | same | 0.00 | Triple slider |
| **Gain** (Master) | Highlight luminance offset | −1.00 → +1.00 / −100 → +100 | 0.00 | Top zone |
| **Gain RGB** | Highlight color cast | same | 0.00 | Triple slider |
| **Offset** (Master) | Global luminance pedestal (entire image) | −1.00 → +1.00 (often displayed 0–100; 25 is the printer-lights "unity" historical default) | 0.00 (some sources note 25 as default) | "Whole image" slider |
| **Offset RGB** | Global color cast | same | 0.00 | Triple slider |
| **Y vs RGB** | Affect luma only vs luma+RGB | 0 → 1.00 | 1.00 (full YRGB) | Checkbox / three-state toggle |

Influence zones overlap ~2 stops at the boundaries: Lift dominates below mid-gray, Gamma at mid-gray, Gain above mid-gray, Offset is uniform.

---

## 2. Bars (Top Reference Strip)

The horizontal "Bar" presentation of the same YRGB Lift/Gamma/Gain/Offset data. No new parameters — just an alternative UI for precise per-channel slider control. Each bar is a vertical fader.

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **Lift Y** | Lift luma only | −1.00 → +1.00 | 0.00 | Vertical slider |
| **Lift R / G / B** | Lift per-channel | −1.00 → +1.00 | 0.00 | Three sliders, ganged by default |
| **Gamma Y / R / G / B** | Gamma per-channel | −1.00 → +1.00 | 0.00 | Mid row |
| **Gain Y / R / G / B** | Gain per-channel | −1.00 → +1.00 | 0.00 | Top row |
| **Offset Y / R / G / B** | Offset per-channel | −1.00 → +1.00 | 0.00 | Bottom row |
| **Bar Reset** | Reset single row | — | — | Small "↺" icon next to row |

---

## 3. Primaries Bars (Shared Adjustments)

Live in the Primaries palette across Wheels / Bars / Log modes. These are the "global" knobs that act on the image as a whole.

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **Temp** | Warm ↔ cool color temperature | −100 → +100 (or absolute K) | 0 | Slider labeled "Temp" |
| **Tint** | Green ↔ magenta balance | −100 → +100 | 0 | Slider |
| **Contrast** | Expand/contract tonal range around Pivot | −1.00 → +1.00 | 0.00 | Single slider |
| **Pivot** | Center tonality for Contrast | 0.00 → 1.00 (luma) | 0.435 (~middle gray) | Slider below Contrast |
| **Midtone Detail (MD)** | Edge contrast in midtones (sharpening) | −1.00 → +1.00 | 0.00 | Slider |
| **Color Boost** | Vibrance-style intelligent saturation | −1.00 → +1.00 | 0.00 | "Vibrance" slider |
| **Shadows** | Targeted shadow lift (no black point shift) | −1.00 → +1.00 | 0.00 | Slider |
| **Highlights** | Targeted highlight pull-down (no white point shift) | −1.00 → +1.00 | 0.00 | Slider |
| **Whites** | Adjust white point | −1.00 → +1.00 | 0.00 | Slider |
| **Blacks** | Adjust black point | −1.00 → +1.00 | 0.00 | Slider |
| **Saturation** | Global saturation multiplier | 0 → 2.00 (1.0 = unity) | 1.00 | Slider |
| **Hue** | Global hue rotation in degrees | −180 → +180 | 0° | Slider or rotary |
| **Lum Mix** | Y vs RGB mixing (chrominance-only when reduced) | 0 → 1.00 | 1.00 | Slider (1 = affects luma) |
| **Chroma Mix** | Color vs luma blending (contrast without saturation) | 0 → 1.00 | 1.00 | Slider |
| **Use S-Curve for Contrast** | Apply S-curve vs linear | bool | true | Checkbox in Project Settings |

---

## 4. Custom Curves

Spline-based per-channel curves. Default state: diagonal line from (0,0) to (1,1). Spline control points are draggable; right-click adds points.

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **Y Curve** | Luminance (master) | input 0–1, output 0–1 | linear | Top curve, white line |
| **R Curve** | Red channel | 0–1 | linear | Red overlay |
| **G Curve** | Green channel | 0–1 | linear | Green overlay |
| **B Curve** | Blue channel | 0–1 | linear | Blue overlay |
| **Gang Custom Curves** | Lock Y+R+G+B together | bool | true | Checkbox |
| **Default Anchors** | Place 3 extra control points (5 segments) | bool | off | Option-menu toggle |
| **Spline Tension** | Curve smoothing at points | typically 0 → 1 | 0.5 (smooth) | Per-point right-click |

**Hue/Sat/Lum curves (Hue → Sat, Hue → Lum, Sat → Sat, Sat → Lum, Lum → Sat, Lum → Hue, plus Hue → Hue):** each curve uses an X axis of one component and Y axis of another. Backed by histogram overlay so empty regions are visible. Same drag/add-point UX.

| HSL curve | X axis | Y axis |
|---|---|---|
| **Hue vs Sat** | Hue (0–360°) | Sat (0–1) |
| **Hue vs Lum** | Hue | Lum (0–1) |
| **Hue vs Hue** | Hue (input) | Hue (output) |
| **Sat vs Sat** | Sat | Sat |
| **Sat vs Lum** | Sat | Lum |
| **Lum vs Sat** | Lum | Sat |
| **Lum vs Hue** | Lum | Hue |

---

## 5. Qualifiers

Selection tools that build a matte from pixel values. Three modes: **HSL**, **3D**, **LUM (Luma only)**, plus a legacy **RGB** mode.

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **Eyedropper** | Sample colors in viewer | — | — | Three modes: +Color, −Color, +Softness, −Softness |
| **Hue Center** | Picked hue | 0 → 360° | 0 | Range slider top track |
| **Hue Range** | Inner acceptance width | 0 → 1 | 0.1 | Range bar |
| **Hue Softness** | Outer falloff | 0 → 1 | 0.1 | Range bar |
| **Hue Enable** | Include H in key | bool | true | "H" toggle |
| **Sat Center / Range / Softness** | Per-saturation | 0–1 | varies | Same 3-band pattern |
| **Sat Enable** | Include S in key | bool | true | "S" toggle |
| **Lum Center / Range / Softness** | Per-luminance | 0–1 | varies | Same pattern |
| **Lum Enable** | Include L in key | bool | true | "L" toggle |
| **Invert** | Flip matte polarity | bool | false | Checkbox |
| **Highlight** | View matte in viewer (B/W overlay) | enum (Off / Grayscale / Colorize) | Off | Toggle button |

**Matte Finesse** (post-key refinement):

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **Clean Black** | Threshold background → pure black | 0 → 1 | 0 | Slider |
| **Clean White** | Threshold subject → pure white | 0 → 1 | 0 | Slider |
| **Blur Radius** | Edge softening | 0 → ~10 px | 0 | Slider |
| **In/Out Ratio** | Push edge inward (negative) or outward (positive) | −1 → +1 | 0 | Slider |
| **Denoise** | Temporal/spatial matte smoothing | 0 → 1 | 0 | Slider |
| **Mode** | Combine channels | Normal / Add / Subtract / Intersect | Normal | Dropdown |
| **Shape** | Reshape matte (shrink/grow) | −1 → +1 | 0 | Slider |

**3D Qualifier**: drag blue lines to sample, red lines to subtract. Samples become a list; per-sample on/off/delete.

---

## 6. Power Windows

Shapes drawn on the viewer that gate a node's correction. Five shape types + per-shape transform/softness.

| Shape | Type | Key params |
|---|---|---|
| **Linear** | 4-point rectangle | Position, Size, Rotation, Aspect, Softness (1–4 sides independent) |
| **Circular** | Oval/circle | Center, Radius X/Y, Rotation, Softness |
| **Polygon** | 4+ point shape | Point list, Position, Rotation, Softness (per-point) |
| **Curve (Bezier)** | Freeform spline | Control points + handles, closed/open |
| **Gradient** | Linear/radial gradient | Center, Angle, Spread (length, softness) |

Per-window parameters (all shapes):

| Control | Range | Default | UX hint |
|---|---|---|---|
| **Position X / Y** | −0.5 → +0.5 (normalized) | 0, 0 | Two number fields or drag |
| **Size W / H** | 0 → 1 | 0.5 / 0.5 | Two fields |
| **Rotation** | −360 → +360° | 0° | Field or handle |
| **Aspect** | locked / unlocked | locked | Lock toggle |
| **Softness** | 0 → 1 (per-edge or all) | 0.1 | Slider |
| **Invert** | bool | false | Checkbox |
| **Mask Mode** | Add / Subtract / Intersect | Add | Dropdown |
| **On/Off** | bool | true | Per-window toggle |

Multiple windows on one node combine by Mask mode (default Add).

---

## 7. Tracking

**A. Cloud Tracker** (default, in Color page, attached to a Power Window):

| Control | Range | Default | UX hint |
|---|---|---|---|
| **Track Forward** | — | — | Button |
| **Track Reverse** | — | — | Button |
| **Track One Frame Fwd/Rev** | — | — | Buttons |
| **Track to Start / End** | — | — | Buttons |
| **Stop** | — | — | Button |
| **Interactive Mode** | bool | false | Checkbox |
| **Show Tracking Points** | bool | true | Checkbox |
| **Clear All Tracking Points** | — | — | Button |
| **Insert Track Points** | — | — | Button (box-select) |
| **Tracker Pan / Tilt / Zoom / Rotate / Perspective** | bool | true | 5 checkboxes (affects what gets applied to window) |

**B. Point Tracker** (manual crosshairs, inside Tracker palette):

| Control | Range | Default | UX hint |
|---|---|---|---|
| **Pattern X / Y / W / H** | px in viewer | — | Drag rect in viewer |
| **Search X / Y / W / H** | px in viewer | — | Drag dashed rect |
| **Crosshairs** | list | — | Click to add, drag to position |
| **Pan / Tilt / Zoom / Rotate / Perspective 3D** | bool | depends on # of points | 1 point = Pan, 2 = +Tilt, 3 = +Zoom, 4 = +Rotate, 5+ = Perspective |

**C. Planar Tracker** (Fusion page node): tracks a flat surface.

| Control | Range | Default | UX hint |
|---|---|---|---|
| **Tracker Type** | Point / Hybrid Point-Area | Point | Dropdown |
| **Motion Type** | Translation / Scale / Rotation / Skew / Perspective | Perspective | 5 toggle |
| **Track to Start / End** | — | — | Buttons |
| **Step Track** | — | — | Single-frame nudge |
| **Steady View** | bool | false | View toggle to QC |
| **Occlusion Mask input** | mask input | — | Blue input socket |

---

## 8. Vignette (ResolveFX Light → Vignette, plus manual in Color page)

ResolveFX Vignette has two modes. As a Color page operation, vignette is built manually with a circular Power Window + inverted grade.

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **Size (Basic)** | How far vignette reaches in | 0 → 1 | 0.5 | Slider |
| **Anamorphism** | Stretches vignette horizontally | −1 → +1 | 0 | Slider |
| **Softness (Basic)** | Edge falloff | 0 → 1 | 0.5 | Slider |
| **Color (Basic)** | Tint of darkened region | RGB | black | Color picker |
| **Border Shape** | Round vs square | 0 → 1 (0 = round) | 0 | Slider |
| **Rotation** | Rotate the vignette shape | 0 → 360° | 0° | Field |
| **Center X / Y** | Move vignette center | −0.5 → +0.5 | 0, 0 | Two fields |
| **Transparency** | Show original through matte | 0 → 1 | 0 | Slider |
| **Composite Type** | Normal / Multiply / Screen / Overlay | enum | Multiply | Dropdown |

**Color page built-in (legacy):** "Add Vignetting" simulated-lens parameters in some ResolveFX:

| Control | Range | Default |
|---|---|---|
| Focal Factor | 0 → 1 | 0.5 |
| Geometry Factor | 0 → 1 | 0.5 |
| Tilt Amount | −1 → +1 | 0 |
| Tilt Angle | 0 → 360° | 0° |

---

## 9. ResolveFX Effects (Blur, Sharpen, etc.)

Located in **OpenFX → Resolve FX**. Many are Studio-only. Ranges given where Resolve exposes them.

### 9.1 Blur Palette (in Color page, Blur tab)

Three modes: **Blur**, **Sharpen**, **Mist**.

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **Radius** | Blur/Sharpen strength | 0 → ~5 (log) | 0.5 | Slider |
| **H/V Ratio** | Directionality (1 = H, 0 = V) | 0 → 1 | 0.5 | Slider |
| **Scaling** | Multiplier on Radius | 0 → ~10 | 1 | Slider |
| **Mix** | Blend original | 0 → 1 | 1.0 | Slider |
| **R / G / B** | Per-channel (unganged) | 0 → 5 | 0.5 | Three sliders |
| **Mode (Mist)** | Mist mode toggle | Blur / Sharpen / Mist | — | Dropdown |

### 9.2 ResolveFX Blur (OpenFX)

| Effect | Key params | Notes |
|---|---|---|
| **Box Blur** | Radius (0–100), Iterations (1–10) | Fast |
| **Directional Blur** | Type (Linear/Centered/Radial/Zoom), Length (0–~5), Angle (0–360°), Center X/Y | Studio only |
| **Gaussian Blur** | Radius (0–500), H/V Ratio | Universal |
| **Lens Blur** | Radius, Blade Count (3–20), Rotation, Highlights threshold | Studio only |
| **Mosaic Blur** | Cell size X/Y, Sharpness | Universal |
| **Prism Blur** | Blade Count, Offset, Rotation | Studio only |
| **Radial Blur** | Center X/Y, Smooth Strength, Border Type | Universal; smooths ring artifacts |
| **Tilt-Shift Blur** | Center, Tilt, Shift, Softness | Studio only |
| **Zoom Blur** | Center X/Y, Zoom Amount (0–~10), Center Exclusion (0–1) | Universal; rays from center |

### 9.3 ResolveFX Sharpen / Stylize

| Effect | Key params | Default |
|---|---|---|
| **Sharpen** | Sharpen X/Y (0–5), Lock X/Y bool, Clipping Mode (Frame/Domain/None) | Sharpen 0.5, Locked |
| **Sharpen Edges** | Sensitivity, Detail | — |
| **Soften & Sharpen** | Mode (Soften/Sharpen/Soft-Sharpen), Radius, Threshold | — |
| **Contrast Pop** | Amount, Pivot | — |
| **Stylize** | Amount, Edge Intensity, Blur | — |
| **Prism Blur** | Blades, Offset, Rotation | — |
| **Vortex** | Center, Strength, Rotation, Edge Mode | — |

### 9.4 Mist (Blur palette mode)

| Control | Range | Default |
|---|---|---|
| Radius | 0 → 5 (lower = sharpens first) | 0.5 |
| H/V Ratio | 0 → 1 | 0.5 |
| Scaling | 0 → 10 | 1 |
| Mix | 0 → 1 | 1.0 |

### 9.5 Defog (ResolveFX Dehaze)

| Control | Purpose | Range | Default |
|---|---|---|---|
| Dehaze Strength | Contrast + saturation correction toward haze complement | 0 → 1 (Studio typical) | 0.2 (sensible; engine default 0.8 is heavy) |
| Haze Color | Color to subtract | RGB picker | white (neutral) |
| Display Depth | Show generated depth map | bool | false |
| Shadow / Highlight values | Per-zone adjustment | 0 → 1 | 0.5 |

### 9.6 Glow (ResolveFX Light)

| Control | Range | Default | UX hint |
|---|---|---|---|
| Glow Size | 0 → ~10 | 1 | Slider |
| Glow | 0 → 1 | 0.5 | Intensity |
| Method | Multi-box / Gaussian / Fast Gaussian / Blend / Hilight | Fast Gaussian | Dropdown |
| Apply Mode | Merge Over / Merge Under / Threshold | Merge Over | Dropdown |
| Threshold (Low / High) | 0 → 1 | 0 / 1 | Sliders |
| Color Scale (R / G / B) | 0 → 1 | 1 / 1 / 1 | Per-channel tint |
| Passes (Multi-box) | 1 → ~8 | 4 | Quality |

### 9.7 Halation (ResolveFX Light)

| Control | Range | Default |
|---|---|---|
| Isolation Threshold | 0 → 1 | 0.5 |
| View Isolated Regions | bool | false |
| Dye Layer Reflection Strength | 0 → 1 | 0.5 |
| Spread | 0 → ~5 | 1 |
| Saturation | 0 → 2 | 1 |
| Normalization (Feather) | 0 → 1 | 0.5 |

### 9.8 Film Grain (ResolveFX Texture)

| Control | Range | Default |
|---|---|---|
| Grain Strength | 0 → 1 | 0.3 |
| R / G / B | 0 → 1 (per channel) | 0.3 |
| Softness | 0 → 1 | 0.5 |
| Size | 0 → 1 | 0.5 |
| Spread (R/G/B curves) | 0 → 1 (per stop) | 0 |
| Affect Alpha | bool | false |

### 9.9 Flicker Removal (ResolveFX Revival → Deflicker)

| Control | Range | Default |
|---|---|---|
| Mo.Est. Type | Faster / Better / None | Better |
| Frames Either Side | 1 → 11 | 3 |
| Motion Range | Small / Medium / Large | Medium |
| Luma Threshold | 0 → 100 | 100 |
| Chroma Threshold | 0 → 100 | 100 |
| Gang Luma Chroma | bool | true |
| Motion Threshold | 0 → 1 | 0.5 |
| Reduced-Detail Motion | bool | true |
| Deflicker Setting | Simple / Advanced Controls | Simple |

### 9.10 Lens Blur, Radial Blur, Zoom Blur, Path Blur

Lens Blur (Studio only): Radius (0–100), Highlights threshold (0–1), Blade count (3–20), Rotation (0–360°), Catadioptric (bool), Anamorphic (bool).

Radial Blur (OpenFX): Center X/Y (−0.5→0.5), Smooth Strength (0–1), Border Type.

Zoom Blur: Center X/Y, Zoom Amount (0–~10), Center Exclusion (0–1), Border Type.

Path Blur is a Fusion page effect (Blur node set to **Path** mode, with a path input from a Paint/B-Spline/etc.). Key params: Motion Blur length, Blur Quality, Shutter Angle (Fusion).

### 9.11 Motion Blur (ResolveFX Temporal)

| Control | Range | Default |
|---|---|---|
| Motion Est. Type | Better / Faster | Better |
| Motion Range | Small / Medium / Large | Medium |
| Motion Blur | 0 → 100 | 25 |

### 9.12 Other relevant ResolveFX

- **Aperture Diffraction** (Studio): simulates lens diffraction; Amount, Blade, Aperture, Symmetry.
- **Lens Distortion** (Studio): Barrel/Pincushion −1→+1, Chromatic Aberration.
- **Color Compressor**: Highlights roll-off knee and threshold.
- **False Color** (Studio): Maps luma to false-color IRE/nit ranges.
- **Deflicker** (Studio): also acts on luma drift.
- **Chroma Aberration Removal** (Studio): Red/Blue channel offset.
- **Patch Replacer** (Studio): replaces areas across frames using reference.
- **Dead Pixel Fixer**: threshold-based dead-pixel removal.
- **Deband**: banding reduction.

---

## 10. Color Match / Shot Match

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **Color Match** (toolbar) | Match clip to a chart in frame | — | — | Button → pick chart (X-Rite ColorChecker, DSC Labs, Datacolor SpyderCheckr, etc.), align overlay, click Match |
| **Shot Match to This Clip** | Right-click → match current clip to a reference | — | — | Context menu on a reference thumbnail |
| **Auto Color (A button)** | Per-clip automatic balance | — | — | "A" button in Color page |
| **Use Legacy Auto Color/Shot Match** | Switch to old method (darkest→black, brightest→white) | bool | false | User Preferences → Color |

Legacy mode neutralizes RGB at extremes and maxes contrast between 0–100% with Master Lift/Gain.

---

## 11. Magic Mask (ResolveFX / palette; Studio only)

AI-driven object/person isolation. **Magic Mask v1** uses paint strokes; **Magic Mask 2** (Resolve 20+) uses click-to-select.

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **Add Stroke / Add (v2)** | Mark subject | — | — | Click/drag on viewer |
| **Subtract Stroke** | Remove from mask | — | — | Click/drag |
| **Person / Object Mode** (v1) | Type of subject | enum | Person | Dropdown |
| **Person Sub-feature** (v1) | hair / face / arms / shoes | enum | All | Dropdown |
| **Track Forward / Reverse** | Track mask in time | — | — | Buttons |
| **Quality** | Faster / Better | enum | Better | Dropdown (v2) |
| **Radius** | Shrink/grow mask | −1 → +1 | 0 | Slider |
| **Consistency** | Temporal stability | 0 → 1 | 0.5 | Slider (v2) |
| **Softness** | Edge falloff | 0 → 1 | 0 | Slider |
| **Smart Refine** | AI matte refinement | 0 → 1 | 0 | Slider |
| **Clean Black** | Background threshold | 0 → 1 | 0 | Slider |
| **Clean White** | Subject threshold | 0 → 1 | 0 | Slider |
| **Blur Radius** | Edge blur | 0 → 1 | 0 | Slider |
| **In/Out Ratio** | Edge offset | −1 → +1 | 0 | Slider |
| **Mode / Shape** | Mask mode | enum | Normal | Dropdown |
| **Invert Mask** | Flip polarity | bool | false | Checkbox |
| **Mask Overlay** | Visualize matte in viewer | bool | true | Checkbox |

---

## 12. LUTs

| Aspect | Detail |
|---|---|
| Format | `.cube` (Resolve-native 1D and 3D; not Adobe SpeedGrade.cube) |
| 3D sizes exported | 17³, 33³, 65³, Panasonic VLUT |
| Internal processing | 32-bit float |
| Shaper LUTs | Supported (1D + 3D pair) |
| Exportable adjustments | Primaries, Custom Curves, Color Space Transform, ACES Transform, Gamut Mapping (ResolveFX) only |
| NOT exportable | Power Windows, qualifiers, OpenFX like blur/sharpen, sizing, tracking |
| Where stored (Win) | `%AppData%\Blackmagic Design\DaVinci Resolve\Support\LUT` |
| Where stored (Mac) | `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/LUT` |
| Apply (per-clip) | Right-click clip → Input LUT / Output LUT |
| Apply (project) | Project Settings → Color Management → Lookup Tables |
| Apply (per-node) | LUT node in graph |

---

## 13. Scopes

Found in **Workspace → Video Scopes** or the Scope panel in Color page. 0–1023 IRE scale (or 0–100% percentage mode).

| Scope | Channels | Purpose | UX hint |
|---|---|---|---|
| **Waveform** | Luma (Y) | Brightness distribution vs horizontal position | Luminance bars, bottom=black top=white |
| **Parade** | R / G / B (or YRGB, YCbCr) | Per-channel balance | Three side-by-side waveforms |
| **Vectorscope** | U/V (chroma) | Hue + saturation, 75% color bar targets, optional skin-tone line (I) | Circular graph, center=neutral |
| **Histogram** | R / G / B / Lum | Pixel count per brightness level | Sideways waveform, left=black right=white |
| **CIE Chromaticity** | x/y (or u/v) | Gamut triangle + black-body locus | xy or uv chart, with Rec.709/2020/P3 triangle overlay |

| Setting | Options | Default |
|---|---|---|
| **Waveform Scale Style** | 0–1023 (IRE) / 0–100% / 0–1 | 0–1023 IRE |
| **Low Pass Filter** | on/off | off (reduces trace noise) |
| **Extents** | on/off | off (shows min/max trace) |
| **Colorize (Waveform/Parade)** | on/off | off |
| **Vectorscope Graticule** | crosshair / 75% targets / skin-tone line | on |
| **Display Qualifier Focus** | on/off | off (hover pixel shows on scope) |
| **CIE Mode** | CIE 1931 xy / CIE 1976 uv | xy |
| **CIE Second Gamut** | Rec.709 / Rec.2020 / P3 / None | None |
| **HDR Nit Scale** | on/off | off (ST.2084 only) |

---

## 14. HDR Scopes (False Color)

Activate in Project Settings → Color Management → set Output Color Space to ST.2084 (PQ). Then enable **HDR Scopes** in scope settings → units become **nits (cd/m²)**.

| Scope mode | Range displayed |
|---|---|
| Waveform (HDR nit) | 0 → 10,000 nits (or per-display max) |
| False Color (ResolveFX) | Maps luma to a color-coded lUT — common Resolve bands: 0 (black), 0–0.02 nits (below black), 0.02–0.1, 0.1–1, 1–10, 10–100, 100–200, 200–1000, 1000–4000, 4000+ (clipped) |

| False Color setting | Range | Default |
|---|---|---|
| Lower Clip Threshold | 0 → 10,000 nits | 0 |
| Upper Clip Threshold | 0 → 10,000 nits | 10,000 |
| Reference (mid-gray) | nits | 15 (ACES) |
| Skin Tone Reference | nits | configurable |
| Overlay opacity | 0 → 1 | 0.5 |
| Show in Viewer | bool | false |

HDR grading palette (Zone-based) ships its own scope display in nits.

---

## 15. Color Space / Gamma / Gamut Transforms (CST + RCM)

Resolve Color Management (RCM) is the framework; the **CST** OpenFX is the in-graph equivalent.

| Control | Purpose | Default | UX hint |
|---|---|---|---|
| **Color Science** | DaVinci YRGB / DaVinci YRGB Color Managed / ACEScc / ACEScct / ACEScg | DaVinci YRGB | Project Settings dropdown |
| **Timeline Color Space** | Working space | Rec.709-A | Dropdown |
| **Timeline Color Gamma** | Working gamma | Gamma 2.4 | Dropdown |
| **Input Color Space** (clip) | Source primaries | Auto | Per-clip override |
| **Input Gamma** (clip) | Source transfer | Auto | Per-clip override |
| **Output Color Space** | Display primaries | Rec.709 | Dropdown |
| **Output Color Gamma** | Display transfer | Gamma 2.4 | Dropdown |
| **Tone Mapping Method** | None / Clip / Simple / DaVinci / Luminance Mapping / Saturation Preserving | None | Dropdown |
| **Sat. Rolloff Start** (nits) | HDR saturation start | varies | Slider |
| **Sat. Rolloff Limit** (nits) | HDR saturation end | varies | Slider |
| **Max Input/Output Luminance** | nits ranges for tone map | 0–10,000 | Two fields |
| **Gamut Mapping Method** | None / Saturation Compression / Clip | None | Dropdown |
| **Saturation Knee** | 0 → 1 | 0.7 | Slider |
| **Saturation Max** | 0 → 1 | 1.0 | Slider |
| **Apply Forward OOTF** | bool | false | Checkbox |
| **Inverse OOTF** | bool | false | Checkbox |
| **ACES Reference Gamut Compression (RGC)** | bool | off | Checkbox |
| **Use Blackmagic Film Gen 5** (BRAW) | bool | true | Per-clip |
| **3D LUT** (project) | Path | — | File picker |
| **1D LUT** (shaper) | Path | — | File picker |

**CST OpenFX** mirrors project settings: Input CS, Input Gamma, Output CS, Output Gamma, plus Tone Mapping and Gamut Mapping sections.

**ResolveFX → ACES Transform**: IDT (input) and ODT (output) dropdowns mirroring ACEScct. Used for VFX pulls.

---

## 16. ACES / IDT / ODT

| Item | Type | Notes |
|---|---|---|
| **ACES IDT** (Input Device Transform) | input dropdown | Maps camera log → ACES AP0/Linear. Examples: ARRI LogC3 → AWG3, Sony SLog3 → SGamut3.CINE, RED Log3G10 → REDWideRGB, BMD Film Gen 5, Canon Log 2/3, Fuji F-Log2, Panasonic V-Log, GoPro ProTune |
| **ACES ODT** (Output Device Transform) | output dropdown | Maps ACES → display. Examples: Rec.709 (100 nits), Rec.2020 (100 nits), P3-D65 (108 nits), P3-D65 ST.2084 (1000 / 2000 / 4000 nits), Rec.2020 ST.2084 (1000 / 2000 / 4000 nits), HLG, DCDM (X'Y'Z' gamma 2.6), ACEScc/ACEScct/ACEScg (passthrough) |
| **ACES Mid Gray Luminance** | nits | 15.00 (default; do not change mid-grade) |
| **ACES RRT** | n/a | Reference Rendering Transform applied between IDT and ODT |
| **Custom DCTL IDTs/ODTs** | user files | Placed in IDT/ and ODT/ folders; appear in dropdowns after restart |

ACES versions: Resolve 18+ uses ACES 1.3 internally. AP0 = ACES2065-1 (linear, wide gamut). ACEScc/ACEScct are log working spaces. ACEScg is ACES linear with AP1 primaries (gamut-matched working space).

---

## 17. Camera RAW (debayer controls)

Found in the **Camera Raw palette** (Color page) and in Project Settings → Camera Raw. When RCM is enabled, these palettes are disabled.

Common parameters (per manufacturer — RED, ARRI, Sony, BMD BRAW, Canon, Panasonic, etc.):

| Control | Purpose | Range | Default | UX hint |
|---|---|---|---|---|
| **ISO** | Sensor gain; red+blue offsets relative to green | 50 → 6400 (RED) | 320 (RED) / 800 (BMD) | Slider |
| **Exposure** | Stops above/below unity | −7 → +7 stops | 0 | Slider |
| **Color Temp** | Kelvin | 2000 → 50,000 (varies) | 6500 (As Shot) | Slider |
| **Tint** | Green↔magenta | −100 → +100 (BMD), −150 → +150 (RED) | 0 | Slider |
| **White Balance** | preset or custom | Daylight / Cloudy / Shade / Tungsten / Fluorescent / Flash / Custom / As Shot | As Shot | Dropdown |
| **Highlight Recovery** | Reconstruct clipped highlights | bool | off | Checkbox |
| **Shadow Recovery** | Reconstruct clipped shadows | bool | off | Checkbox (some cameras) |
| **Decode Quality** | Debayer resolution | Full / Half / Quarter / Eighth | Full | Dropdown |
| **Color Space** | Output primaries (BMD) | Blackmagic Design / Rec.709 / Rec.2020 | BMD Film | Dropdown |
| **Gamma** | Output gamma (BMD) | BMD Film / Rec.709 / Linear | BMD Film | Dropdown |
| **Color Science** (BMD) | Generation | Camera Metadata / Gen 4 / Gen 5 | Camera Metadata | Dropdown |
| **Color Science** (RED) | IPP2 / Legacy | IPP2 | IPP2 | Dropdown |
| **Apply Pre Tone Curve** (CinemaDNG) | Old debayer path | bool | off | Checkbox |
| **Decode using RCM** | Managed pipeline | bool | off (overrides Camera Raw palette) | Project Settings |
| **Lift / Gamma / Gain / Offset / Contrast / Saturation** | Camera-specific pre-grade | −100 → +100 (each) | 0 | Sliders |
| **Hue** | Raw hue rotation | −180 → +180° | 0° | Slider |
| **Midtone Detail** | Raw sharpening | −100 → +100 | 0 | Slider |
| **Luminance Mix** | Y vs RGB on raw pre-grade | 0 → 100 | 100 | Slider |

---

## 18. Audio Sync / Link Group (Color & Edit)

Primarily Edit-page features; Color page inherits the relationship.

| Control | Purpose | Notes |
|---|---|---|
| **Auto Sync Audio** (Media Pool) | Sync external audio to video by waveform or timecode | Right-click → Auto Sync Audio → Based on Waveform / Based on Timecode |
| **Auto Align Clips** (Timeline) | Sync clips already on the timeline | Right-click → Auto Align Clips → Based on Waveform |
| **Create New Multicam Clip** | Multi-angle sync | Right-click → Create New Multicam Clip Using Selected Clips |
| **Link Clips** | Bind selected clips (or A/V pairs) as one unit | Shortcut: Ctrl/Cmd + Alt/Opt + L |
| **Linked Selection** (chain icon) | Whether A/V stays linked on select | Toggle in toolbar |
| **Bounce Clip to Files** | Render selected clips to single file (multi-channel for grouped audio) | Right-click → Bounce Clip to Files |
| **Group Pre-Clip / Clip / Group Post-Clip** | Hierarchy for grading within groups | Color page right-click → Add into Group |
| **Auto Select Audio/Video** | Include track in link ripple | Per-track header toggle |

---

## 19. Node Graph

A node has **RGB in/out (green triangle/square)** and **key in/out (blue triangle/square)** connectors. The right end is the output; the very right can host an **Alpha Output** for compositing.

### Node types

| Type | Inputs | Outputs | Behavior |
|---|---|---|---|
| **Serial** (`Alt+S` / `Opt+S`) | 1 RGB, 1 Key | 1 RGB, 1 Key | Linear chain: A→B→C |
| **Parallel** (`Alt+P` / `Opt+P`) | 1 RGB, 1 Key into mixer; N parallel branches | 1 RGB, 1 Key | Each branch gets same input; output is additive equal-weight mix |
| **Layer** (`Alt+L` / `Opt+L`) | 1 RGB, 1 Key into mixer; N layers | 1 RGB, 1 Key | Composited; lowest input has priority; **Composite Mode** (Normal, Add, Subtract, Multiply, Screen, Overlay, etc.) |
| **Outside** (`Alt+O` / `Opt+O`) | 1 RGB, 1 Key (auto-inverted) | 1 RGB, 1 Key | Applies correction to the inverse of the upstream key |
| **Key Mixer** | 2 Key | 1 Key | Combines keys: Add / Subtract / Intersect / Difference / etc. |
| **Splitter** | 1 RGB | 3 RGB (R, G, B) | Channel separation |
| **Combiner** | 3 RGB | 1 RGB | Channel re-combination |
| **Compound** | n/a | n/a | Collapsed sub-graph; acts as single node |
| **Corrector** | 1 RGB, 1 Key | 1 RGB, 1 Key | Standard grading node (default) |
| **LUT** | 1 RGB | 1 RGB | Apply a `.cube` |
| **CST** (OpenFX) | 1 RGB | 1 RGB | Color Space Transform |
| **External Matte** | 1 RGB, 1 Key (file path) | 1 RGB, 1 Key | Imported matte |
| **Alpha Output** | — | — | Special endpoint; routes key → clip alpha for compositing |

### Per-node display parameters

| Control | Range | Default | UX hint |
|---|---|---|---|
| **Bypass / Disable** | bool | false | Small "B" toggle on node |
| **Solo** | bool | false | "S" — isolate this node's effect |
| **Node Label** | string | — | Rename in graph |
| **Node Note** | string | — | Tooltip text |
| **Key Input Gain** | 0 → 1 | 1 | Per-node matte strength (Key palette) |
| **Key Output Gain** | 0 → 1 | 1 | Output gain of upstream matte |
| **Key Input Invert** | bool | false | Inverts received key (basis of Outside node) |

### Layer node Composite Modes (subset)

Normal, Add, Subtract, Multiply, Screen, Overlay, Soft Light, Hard Light, Darken, Lighten, Color Dodge, Color Burn, Difference, Exclusion, Hue, Saturation, Color, Luminosity.

---

## 20. Still / Album Galleries

| Control | Purpose | Notes |
|---|---|---|
| **Grab Still** | Save current frame + grade | Shortcut: Opt+Cmd+G (or right-click viewer) |
| **Gallery** | Library of stills (up to 30 in default) | Top-left of Color page |
| **Still Albums** | Folders for organizing stills | Click "+" to create; drag stills into them |
| **Wipe Still** | Overlay still on current clip with split-wipe | Double-click still in Gallery → drag wipe line |
| **Apply Grade** | Apply still's grade to selected clip(s) | Right-click still → Apply Grade |
| **Append Grade** | Add still's grade as a new node at end of current graph | Right-click still → Append Node |
| **Middle-click drag** | Copy grade from one clip to another | Filmstrip → Viewer |
| **Memories** | Five slots for instant grade recall (A–E) | Cmd/Ctrl + 1–5 to save/recall |
| **One Still Per Scene** | Auto-organize | Toggle in Gallery options |
| **Export Still** | PNG/JPEG of still | Right-click → Export |
| **Export Grade** | `.drx` (Resolve grade export) | Right-clip → Export Grade |
| **Lightbox** | Timeline thumbnails with grades applied | Top-right toggle |
| **Auto Save** | Auto-grab still on first edit of a clip | Toggle in Color Preferences |
| **Poster Frame** | Single representative still per clip | Used for bin icons |

---

## Quick counts

- Primary Wheels: **9** controls (4 master + 12 RGB channels effectively 16 faders)
- Bars: **20** faders + 4 reset
- Primaries shared: **15** controls
- Custom Curves: **4** channels + 3 ancillary + **7** HSL curve modes
- Qualifier: **12** range/softness + **7** Matte Finesse + 4 modes
- Power Windows: **5** shapes × ~8 params
- Tracking: **5** cloud + **11** point + **6** planar
- Vignette: **9** + 4 simulated-lens
- ResolveFX: **20+** effects with ~4–8 params each (well over **100** params total)
- Scopes: **5** types + **8** settings
- HDR / False Color: **5** + 4 settings
- Color management / CST: **16** controls
- ACES: **15+** IDTs, **10+** ODTs
- RAW: **15** common controls
- Audio sync / link: **8** commands
- Node graph: **10+** node types × **6** display params
- Gallery: **12** operations

Total distinct adjustable controls: **>200** (well beyond the 60 minimum).
