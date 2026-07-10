# Technical Spec — Visual Properties & Timeline Clip Controls  

**Scope:** Alight-Motion-inspired editor features: **Color & Fill**, **Border & Shadow/Bayangan**, **Blending & Opacity**, **Move & Transform**, plus **selected clip timeline controls** seperti geser kiri/kanan, trim/perpanjang kiri/kanan, dan playhead nudge.

> Catatan: ini bukan klaim struktur internal Alight Motion 1:1. Ini adalah spesifikasi teknis lengkap untuk membangun fitur serupa di editor kamu, dengan field-field yang serializable, keyframe-friendly, dan cocok untuk mobile editor.

---

# 0. Prinsip Arsitektur Umum

## 0.1 Layer-centric model

Semua objek visual diperlakukan sebagai **Layer**. Layer bisa berupa:

- `shape`
- `text`
- `image`
- `video`
- `audio`
- `group`
- `element`
- `camera`
- `null`

Setiap layer visual minimal punya:

```ts
interface VisualLayer {
  id: string;
  name: string;
  type: VisualLayerType;

  timing: LayerTiming;
  transform: Transform2D3D;
  style: VisualStyle;
  effects: EffectInstance[];

  keyframes: KeyframeTrack[];
  parentId?: string | null;

  locked: boolean;
  visible: boolean;
  muted?: boolean;

  metadata: LayerMetadata;
}
```

---

## 0.2 Render order yang disarankan

Render satu layer visual:

```txt
source geometry / source media
        ↓
intrinsic fill / media sampling
        ↓
Color & Fill
        ↓
Border / Stroke
        ↓
Shadow / Glow / Outer effects
        ↓
Layer Effects Stack
        ↓
Transform
        ↓
Blending & Opacity
        ↓
Group composite / mask composite
        ↓
Final scene render
```

Alternatif: beberapa engine menerapkan transform sebelum effect. Yang penting, konsisten dan jelas di data model. Untuk editor mobile, transform biasanya dihitung sebagai matrix sebelum final composite, sementara beberapa effect yang bergantung pixel bisa dirender offscreen.

---

## 0.3 Unit standar

Gunakan unit konsisten agar field gampang dianimasikan:

```ts
type Scalar = number;

type Normalized = number; 
// 0..1 untuk alpha, progress, normalized anchor, gradient stop.

type Degrees = number;
// Derajat. 0 = kanan/horizontal, 90 = bawah/atas tergantung coordinate system.

type Px = number;
// Logical pixel / project-space unit, bukan device pixel mentah.

type Ms = number;
// Millisecond timeline.

type Frame = number;
// Integer frame index.
```

---

## 0.4 Shared primitive types

```ts
interface Vec2 {
  x: number;
  y: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RGBAColor {
  r: number; // 0..1
  g: number; // 0..1
  b: number; // 0..1
  a: number; // 0..1
}

interface HSLAColor {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
  a: number; // 0..1
}

interface Keyframe<T = unknown> {
  id: string;
  timeMs: Ms;
  value: T;
  interpolation: InterpolationMode;
  easing?: EasingCurve;
}

type InterpolationMode =
  | "hold"
  | "linear"
  | "bezier"
  | "smooth"
  | "step";

interface EasingCurve {
  type:
    | "linear"
    | "ease-in"
    | "ease-out"
    | "ease-in-out"
    | "custom-cubic"
    | "bounce"
    | "elastic"
    | "back";
  cubic?: [number, number, number, number];
}

interface KeyframeTrack<T = unknown> {
  id: string;
  propertyPath: string;
  valueType: ValueType;
  keyframes: Keyframe<T>[];
  enabled: boolean;
  trackMode: TemporalTrackMode;
}

type ValueType =
  | "number"
  | "boolean"
  | "enum"
  | "vec2"
  | "vec3"
  | "color-rgba"
  | "gradient"
  | "path"
  | "matrix";

type TemporalTrackMode =
  | "absolute"
  | "edge-anchored-start"
  | "edge-anchored-end"
  | "normalized-to-layer-duration";
```

---

# 1. Color & Fill

## 1.1 Definisi fitur

**Color & Fill** adalah panel untuk mengatur isi visual layer. Fitur ini menentukan apakah layer punya warna isi, gradient, texture, atau tidak punya fill sama sekali.

Fitur ini harus tersedia untuk:

- Shape layer.
- Text layer.
- Vector drawing.
- Freehand drawing tertentu.
- Element/group wrapper.
- Solid color layer.
- Mask helper layer.

Untuk image/video layer, Color & Fill bisa berarti:

- tint overlay,
- solid matte,
- gradient overlay,
- replace fill pada alpha mask,
- colorize style.

---

## 1.2 Mode fill

```ts
type FillMode =
  | "none"
  | "solid"
  | "linear-gradient"
  | "radial-gradient"
  | "conic-gradient"
  | "image-texture"
  | "source-preserve";
```

### Penjelasan mode

| Mode | Definisi | Cocok untuk |
| --- | --- | --- |
| `none` | Tidak ada isi/fill. Stroke masih bisa tampil. | Drawing progress, outline text, mask stroke |
| `solid` | Warna tunggal RGBA. | Shape dasar, text, solid panel |
| `linear-gradient` | Gradient mengikuti garis arah tertentu. | Modern card, background, title |
| `radial-gradient` | Gradient dari pusat ke luar. | Glow, orb, spotlight |
| `conic-gradient` | Gradient melingkar berdasarkan angle. | Ring visualizer, color wheel |
| `image-texture` | Fill memakai gambar/texture. | Pattern, noise, paper texture |
| `source-preserve` | Mempertahankan warna asli source. | Image/video/text natural color |

---

## 1.3 Field utama

```ts
interface FillStyle {
  enabled: boolean;

  mode: FillMode;

  solid?: SolidFill;
  linearGradient?: LinearGradientFill;
  radialGradient?: RadialGradientFill;
  conicGradient?: ConicGradientFill;
  imageTexture?: ImageTextureFill;

  alpha: number; // 0..1, alpha khusus fill, beda dari layer opacity

  preserveLuminance?: boolean;
  preserveAlpha?: boolean;

  applyTo:
    | "fill-only"
    | "stroke-only"
    | "fill-and-stroke"
    | "source-alpha"
    | "entire-layer";

  colorSpace: ColorSpaceMode;

  blendWithSource?: FillSourceBlendMode;

  animatable: boolean;
}
```

---

## 1.4 Subfield solid fill

```ts
interface SolidFill {
  color: RGBAColor;
}
```

### Field detail

| Field | Type | Default | Range | Animatable | Keterangan |
| --- | --- | ---: | --- | --- | --- |
| `color.r` | number | `1` | `0..1` | Ya | Red channel |
| `color.g` | number | `1` | `0..1` | Ya | Green channel |
| `color.b` | number | `1` | `0..1` | Ya | Blue channel |
| `color.a` | number | `1` | `0..1` | Ya | Alpha warna |
| `alpha` | number | `1` | `0..1` | Ya | Alpha fill terpisah |

---

## 1.5 Subfield gradient stop

```ts
interface GradientStop {
  id: string;
  offset: number; // 0..1
  color: RGBAColor;
  midpoint?: number; // 0..1, optional
}
```

### Field detail gradient stop

| Field | Type | Default | Range | Animatable | Keterangan |
| --- | --- | ---: | --- | --- | --- |
| `id` | string | generated | - | Tidak | Identitas stop |
| `offset` | number | auto | `0..1` | Ya | Posisi stop |
| `color` | RGBAColor | white | `0..1` per channel | Ya | Warna stop |
| `midpoint` | number | `0.5` | `0..1` | Ya | Titik transisi antar stop |

---

## 1.6 Linear gradient

```ts
interface LinearGradientFill {
  stops: GradientStop[];

  start: Vec2; // normalized 0..1 in layer bounds
  end: Vec2;   // normalized 0..1 in layer bounds

  angleDeg: number;

  repeatMode: GradientRepeatMode;
  interpolation: GradientInterpolationMode;
}
```

```ts
type GradientRepeatMode =
  | "clamp"
  | "repeat"
  | "mirror";

type GradientInterpolationMode =
  | "srgb"
  | "linear-rgb"
  | "oklab"
  | "hsl-short"
  | "hsl-long";
```

### Field detail linear gradient

| Field | Type | Default | Range | Animatable | Keterangan |
| --- | --- | ---: | --- | --- | --- |
| `stops` | GradientStop[] | 2 stop | min 2 | Ya | Daftar warna |
| `start.x/y` | number | `0, 0.5` | `-1..2` | Ya | Titik awal gradient |
| `end.x/y` | number | `1, 0.5` | `-1..2` | Ya | Titik akhir gradient |
| `angleDeg` | number | `0` | bebas | Ya | Arah gradient |
| `repeatMode` | enum | `clamp` | enum | Hold | Cara gradient melewati batas |
| `interpolation` | enum | `srgb` | enum | Hold | Cara campur warna |

---

## 1.7 Radial gradient

```ts
interface RadialGradientFill {
  stops: GradientStop[];

  center: Vec2; // normalized
  radiusX: number;
  radiusY: number;

  focalPoint?: Vec2;
  repeatMode: GradientRepeatMode;
  interpolation: GradientInterpolationMode;
}
```

### Field detail radial gradient

| Field | Type | Default | Range | Animatable | Keterangan |
| --- | --- | ---: | --- | --- | --- |
| `center.x/y` | number | `0.5, 0.5` | `-1..2` | Ya | Pusat gradient |
| `radiusX` | number | `0.5` | `0..4` | Ya | Radius horizontal |
| `radiusY` | number | `0.5` | `0..4` | Ya | Radius vertikal |
| `focalPoint` | Vec2 | center | `-1..2` | Ya | Pusat cahaya alternatif |
| `stops` | GradientStop[] | 2 stop | min 2 | Ya | Daftar warna |

---

## 1.8 Conic gradient

```ts
interface ConicGradientFill {
  stops: GradientStop[];
  center: Vec2;
  startAngleDeg: number;
  clockwise: boolean;
  repeatMode: GradientRepeatMode;
}
```

### Kegunaan conic gradient

- Ring progress.
- Color wheel.
- Circular audio visualizer.
- Neon halo.
- Loading spinner.

---

## 1.9 Image texture fill

```ts
interface ImageTextureFill {
  assetId: string;

  mapping: TextureMappingMode;
  fit: TextureFitMode;

  scale: Vec2;
  offset: Vec2;
  rotationDeg: number;

  opacity: number;
  tileMode: TextureTileMode;

  sampleFiltering: TextureFilteringMode;
}
```

```ts
type TextureMappingMode =
  | "layer-bounds"
  | "object-space"
  | "screen-space"
  | "uv";

type TextureFitMode =
  | "fill"
  | "fit"
  | "stretch"
  | "crop"
  | "original-size";

type TextureTileMode =
  | "none"
  | "repeat-x"
  | "repeat-y"
  | "repeat"
  | "mirror";

type TextureFilteringMode =
  | "nearest"
  | "linear"
  | "mipmap";
```

---

## 1.10 UI/UX Color & Fill

### Panel layout

```txt
Color & Fill
├─ Fill toggle
├─ Mode: None / Solid / Gradient / Texture
├─ Color swatch
├─ Alpha slider
├─ Gradient editor
│  ├─ Stop list
│  ├─ Add stop
│  ├─ Remove stop
│  ├─ Reverse stops
│  └─ Angle / center control
├─ Advanced
│  ├─ Color space
│  ├─ Preserve alpha
│  ├─ Preserve luminance
│  └─ Repeat mode
└─ Keyframe button
```

### Mobile interaction

- Tap swatch membuka color picker.
- Long press swatch membuka recent colors.
- Drag gradient handle langsung di preview.
- Tap gradient line menambah stop.
- Drag stop keluar untuk hapus.
- Toggle keyframe di kanan setiap property utama.

---

## 1.11 Keyframe behavior Color & Fill

### Animatable fields

```ts
const colorFillAnimatable = [
  "style.fill.enabled",
  "style.fill.mode",
  "style.fill.alpha",
  "style.fill.solid.color",
  "style.fill.linearGradient.stops",
  "style.fill.linearGradient.start",
  "style.fill.linearGradient.end",
  "style.fill.linearGradient.angleDeg",
  "style.fill.radialGradient.center",
  "style.fill.radialGradient.radiusX",
  "style.fill.radialGradient.radiusY",
  "style.fill.conicGradient.startAngleDeg",
  "style.fill.imageTexture.offset",
  "style.fill.imageTexture.scale",
  "style.fill.imageTexture.rotationDeg",
  "style.fill.imageTexture.opacity"
] as const;
```

### Interpolation rules

| Properti | Interpolation |
| --- | --- |
| RGBA color | Linear per channel atau color-space aware |
| Alpha | Linear number |
| Gradient stop offset | Linear |
| Gradient stop color | Color interpolation |
| Fill mode | Hold/step, jangan crossfade otomatis |
| Texture assetId | Hold |
| Texture transform | Linear |

---

## 1.12 Validation Color & Fill

```ts
function validateFillStyle(fill: FillStyle): string[] {
  const errors: string[] = [];

  if (fill.alpha < 0 || fill.alpha > 1) {
    errors.push("fill.alpha must be between 0 and 1");
  }

  if (fill.mode.includes("gradient")) {
    const stops =
      fill.linearGradient?.stops ??
      fill.radialGradient?.stops ??
      fill.conicGradient?.stops;

    if (!stops || stops.length < 2) {
      errors.push("gradient fill requires at least 2 stops");
    }

    stops?.forEach((stop) => {
      if (stop.offset < 0 || stop.offset > 1) {
        errors.push(`gradient stop ${stop.id} offset must be 0..1`);
      }
    });
  }

  if (fill.mode === "image-texture" && !fill.imageTexture?.assetId) {
    errors.push("image-texture fill requires assetId");
  }

  return errors;
}
```

---

# 2. Border & Shadow / Bayangan

## 2.1 Definisi fitur

**Border & Shadow** adalah panel untuk memberi garis tepi, outline, stroke, dan bayangan pada layer. Pada editor motion graphics, fitur ini harus bisa dipakai untuk:

- Shape.
- Text.
- Vector drawing.
- Freehand drawing.
- Image/video dengan alpha.
- Group/element.

---

## 2.2 Perbedaan Border, Stroke, Outline

| Istilah | Definisi | Contoh |
| --- | --- | --- |
| Stroke | Garis mengikuti path shape/text/vector | Outline text, line art |
| Border | Garis tepi bounding/object alpha | Border image/video/shape |
| Outline | Stroke yang biasanya mengelilingi konten | Text outline |
| Shadow | Bayangan berdasarkan alpha shape/layer | Drop shadow |
| Glow | Shadow terang/blur dengan blend screen/add | Neon edge |

Untuk implementasi, lebih baik pakai satu model `StrokeStyle` dan `ShadowStyle`, lalu label UI bisa tetap “Border & Shadow”.

---

## 2.3 StrokeStyle fields

```ts
interface StrokeStyle {
  enabled: boolean;

  color: RGBAColor;
  width: number;

  alignment: StrokeAlignment;
  cap: StrokeCap;
  join: StrokeJoin;

  miterLimit: number;

  dash?: StrokeDashPattern;

  opacity: number;

  taper?: StrokeTaper;

  pressureSensitive?: boolean;

  renderOrder: StrokeRenderOrder;

  animatable: boolean;
}
```

```ts
type StrokeAlignment =
  | "inside"
  | "center"
  | "outside";

type StrokeCap =
  | "butt"
  | "round"
  | "square";

type StrokeJoin =
  | "miter"
  | "round"
  | "bevel";

type StrokeRenderOrder =
  | "above-fill"
  | "below-fill"
  | "replace-fill"
  | "mask-only";
```

---

## 2.4 Stroke dash

```ts
interface StrokeDashPattern {
  enabled: boolean;
  dash: number;
  gap: number;
  offset: number;
  pattern?: number[];
}
```

### Field detail dash

| Field | Type | Default | Range | Animatable | Keterangan |
| --- | --- | ---: | --- | --- | --- |
| `enabled` | boolean | `false` | boolean | Hold | Aktifkan dash |
| `dash` | number | `12` | `0..1000` | Ya | Panjang dash |
| `gap` | number | `8` | `0..1000` | Ya | Jarak antar dash |
| `offset` | number | `0` | bebas | Ya | Phase animasi dash |
| `pattern` | number[] | optional | min 2 | Ya | Custom pattern |

---

## 2.5 Stroke taper

```ts
interface StrokeTaper {
  enabled: boolean;

  startWidthMultiplier: number; // 0..1
  endWidthMultiplier: number;   // 0..1

  startLength: number; // 0..1 of path
  endLength: number;   // 0..1 of path

  easing: EasingCurve;
}
```

### Kegunaan taper

- Brush stroke.
- Calligraphy.
- Speed line.
- Signature.
- Hand-drawn vector line.

---

## 2.6 ShadowStyle fields

```ts
interface ShadowStyle {
  enabled: boolean;

  shadows: ShadowLayer[];

  quality: ShadowQualityMode;

  clipToLayerBounds: boolean;
  expandRenderBounds: number;

  animatable: boolean;
}
```

```ts
interface ShadowLayer {
  id: string;

  type: ShadowType;

  color: RGBAColor;
  opacity: number;

  blur: number;
  spread: number;

  offset: Vec2;
  distance: number;
  angleDeg: number;

  blendMode: ShadowBlendMode;

  enabled: boolean;
}
```

```ts
type ShadowType =
  | "drop"
  | "inner"
  | "outer-glow"
  | "inner-glow";

type ShadowQualityMode =
  | "preview-low"
  | "balanced"
  | "export-high";

type ShadowBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "add"
  | "overlay";
```

---

## 2.7 Field detail shadow

| Field | Type | Default | Range | Animatable | Keterangan |
| --- | --- | ---: | --- | --- | --- |
| `enabled` | boolean | `false` | boolean | Hold | Aktif/tidak |
| `type` | enum | `drop` | enum | Hold | Tipe shadow |
| `color` | RGBAColor | black | `0..1` | Ya | Warna shadow |
| `opacity` | number | `0.25` | `0..1` | Ya | Opacity shadow |
| `blur` | number | `12` | `0..500` | Ya | Blur radius |
| `spread` | number | `0` | `-500..500` | Ya | Perluasan area |
| `offset.x/y` | number | `0, 8` | bebas | Ya | Offset manual |
| `distance` | number | `8` | `0..5000` | Ya | Offset polar |
| `angleDeg` | number | `135` | bebas | Ya | Arah shadow |
| `blendMode` | enum | `normal` | enum | Hold | Composite shadow |

---

## 2.8 Border & Shadow UI/UX

```txt
Border & Shadow
├─ Stroke
│  ├─ Toggle
│  ├─ Width slider
│  ├─ Color swatch
│  ├─ Opacity
│  ├─ Alignment: Inside / Center / Outside
│  ├─ Cap: Butt / Round / Square
│  ├─ Join: Miter / Round / Bevel
│  ├─ Dash
│  └─ Taper
├─ Shadow
│  ├─ Toggle
│  ├─ Type: Drop / Inner / Outer Glow / Inner Glow
│  ├─ Color
│  ├─ Opacity
│  ├─ Blur
│  ├─ Spread
│  ├─ Angle
│  ├─ Distance
│  └─ Quality
└─ Keyframe toggles
```

---

## 2.9 Keyframe behavior Border & Shadow

### Animatable fields

```ts
const borderShadowAnimatable = [
  "style.stroke.enabled",
  "style.stroke.color",
  "style.stroke.width",
  "style.stroke.alignment",
  "style.stroke.cap",
  "style.stroke.join",
  "style.stroke.miterLimit",
  "style.stroke.dash.dash",
  "style.stroke.dash.gap",
  "style.stroke.dash.offset",
  "style.stroke.opacity",
  "style.stroke.taper.startWidthMultiplier",
  "style.stroke.taper.endWidthMultiplier",
  "style.shadow.shadows[].color",
  "style.shadow.shadows[].opacity",
  "style.shadow.shadows[].blur",
  "style.shadow.shadows[].spread",
  "style.shadow.shadows[].offset",
  "style.shadow.shadows[].distance",
  "style.shadow.shadows[].angleDeg"
] as const;
```

### Interpolation rules

| Properti | Interpolation |
| --- | --- |
| Stroke width | Linear number |
| Stroke color | Color interpolation |
| Stroke alignment | Hold |
| Cap/join | Hold |
| Dash/gap/offset | Linear |
| Shadow blur/spread | Linear, clamp >= 0 untuk blur |
| Shadow angle | Shortest angle interpolation |
| Shadow type | Hold |
| Shadow blend mode | Hold |

---

## 2.10 Performance rules Border & Shadow

Shadow dan blur adalah fitur berat. Gunakan rules ini:

```ts
interface ShadowPerformancePolicy {
  maxPreviewBlur: number;
  maxExportBlur: number;

  downsampleLargeBlur: boolean;
  cacheStaticShadow: boolean;

  disableDuringScrub: boolean;
  disableDuringMultiLayerDrag: boolean;

  qualityFallbackThresholdMs: number;
}
```

### Default policy

```ts
const defaultShadowPerformancePolicy: ShadowPerformancePolicy = {
  maxPreviewBlur: 80,
  maxExportBlur: 500,

  downsampleLargeBlur: true,
  cacheStaticShadow: true,

  disableDuringScrub: false,
  disableDuringMultiLayerDrag: true,

  qualityFallbackThresholdMs: 16
};
```

---

# 3. Blending & Opacity

## 3.1 Definisi fitur

**Blending & Opacity** mengatur bagaimana layer dicampur dengan layer di bawahnya dan seberapa transparan layer tersebut secara keseluruhan.

Perbedaan penting:

- `fill.alpha` = alpha fill saja.
- `stroke.opacity` = opacity stroke saja.
- `shadow.opacity` = opacity shadow saja.
- `layer.opacity` = opacity seluruh layer setelah style/effect dihitung.
- `blendMode` = cara layer berinteraksi dengan hasil render di bawahnya.

---

## 3.2 CompositeStyle fields

```ts
interface CompositeStyle {
  opacity: number; // 0..1

  blendMode: BlendMode;

  alphaMode: AlphaMode;
  premultipliedAlpha: boolean;

  isolateBlending: boolean;
  knockoutGroup: boolean;

  maskMode?: MaskCompositeMode;
  trackMatte?: TrackMatteSettings;

  preserveTransparency: boolean;

  animatable: boolean;
}
```

```ts
type AlphaMode =
  | "straight"
  | "premultiplied";

type BlendMode =
  | "normal"

  // Darken
  | "darken"
  | "multiply"
  | "color-burn"
  | "linear-burn"

  // Lighten
  | "lighten"
  | "screen"
  | "color-dodge"
  | "linear-dodge"
  | "add"

  // Contrast
  | "overlay"
  | "soft-light"
  | "hard-light"
  | "vivid-light"
  | "linear-light"

  // Difference
  | "difference"
  | "exclusion"
  | "subtract"
  | "divide"

  // Component
  | "hue"
  | "saturation"
  | "color"
  | "luminosity"

  // Mask/composite utility
  | "mask"
  | "alpha-mask"
  | "luma-mask"
  | "inverted-alpha-mask"
  | "inverted-luma-mask"
  | "exclude"
  | "punch-out";
```

---

## 3.3 Blend categories

```ts
interface BlendModeCategory {
  id: string;
  label: string;
  modes: BlendMode[];
}
```

```ts
const blendCategories: BlendModeCategory[] = [
  {
    id: "normal",
    label: "Normal",
    modes: ["normal"]
  },
  {
    id: "darken",
    label: "Darken",
    modes: ["darken", "multiply", "color-burn", "linear-burn"]
  },
  {
    id: "lighten",
    label: "Lighten",
    modes: ["lighten", "screen", "color-dodge", "linear-dodge", "add"]
  },
  {
    id: "contrast",
    label: "Contrast",
    modes: ["overlay", "soft-light", "hard-light", "vivid-light", "linear-light"]
  },
  {
    id: "difference",
    label: "Difference",
    modes: ["difference", "exclusion", "subtract", "divide"]
  },
  {
    id: "component",
    label: "Color Component",
    modes: ["hue", "saturation", "color", "luminosity"]
  },
  {
    id: "mask",
    label: "Mask",
    modes: ["mask", "alpha-mask", "luma-mask", "inverted-alpha-mask", "inverted-luma-mask", "exclude", "punch-out"]
  }
];
```

---

## 3.4 Mask composite

```ts
type MaskCompositeMode =
  | "none"
  | "add"
  | "subtract"
  | "intersect"
  | "exclude";

interface TrackMatteSettings {
  enabled: boolean;

  matteLayerId: string | null;

  sourceChannel:
    | "alpha"
    | "luma"
    | "red"
    | "green"
    | "blue";

  invert: boolean;

  preserveMatteLayerVisibility: boolean;

  fallbackWhenMissing:
    | "ignore"
    | "show-warning"
    | "hide-target";
}
```

---

## 3.5 Field detail Blending & Opacity

| Field | Type | Default | Range | Animatable | Keterangan |
| --- | --- | ---: | --- | --- | --- |
| `opacity` | number | `1` | `0..1` | Ya | Opacity seluruh layer |
| `blendMode` | enum | `normal` | enum | Hold | Cara layer dicampur |
| `alphaMode` | enum | `premultiplied` | enum | Tidak umum | Mode alpha internal |
| `isolateBlending` | boolean | `false` | boolean | Hold | Isolasi blend dalam group |
| `knockoutGroup` | boolean | `false` | boolean | Hold | Group memotong layer bawah |
| `preserveTransparency` | boolean | `false` | boolean | Hold | Menjaga alpha asli |
| `trackMatte.enabled` | boolean | `false` | boolean | Hold | Pakai matte layer |
| `trackMatte.matteLayerId` | string | `null` | layer id | Hold | Layer matte |
| `trackMatte.sourceChannel` | enum | `alpha` | enum | Hold | Channel matte |
| `trackMatte.invert` | boolean | `false` | boolean | Hold | Invert matte |

---

## 3.6 UI/UX Blending & Opacity

```txt
Blending & Opacity
├─ Opacity slider 0%..100%
├─ Blend Mode
│  ├─ Normal
│  ├─ Darken
│  ├─ Lighten
│  ├─ Contrast
│  ├─ Difference
│  ├─ Color Component
│  └─ Mask
├─ Preserve Transparency toggle
├─ Isolate Blending toggle
├─ Track Matte
│  ├─ Enable
│  ├─ Select matte layer
│  ├─ Channel
│  └─ Invert
└─ Keyframe opacity
```

---

## 3.7 Keyframe behavior Blending & Opacity

### Animatable fields

```ts
const blendingOpacityAnimatable = [
  "style.composite.opacity",
  "style.composite.blendMode",
  "style.composite.preserveTransparency",
  "style.composite.trackMatte.invert"
] as const;
```

### Rules

- `opacity` interpolasi linear/easing.
- `blendMode` hold/step, tidak crossfade.
- Kalau user ingin crossfade blend mode, buat dua layer duplicate dan animasikan opacity.
- `trackMatte.matteLayerId` hold, tidak interpolate.
- Perubahan mask mode harus diberi warning karena hasil bisa berubah ekstrem.

---

## 3.8 Render composite pseudo-code

```ts
function compositeLayer(
  backdrop: Texture,
  source: Texture,
  style: CompositeStyle
): Texture {
  const src = applyLayerOpacity(source, style.opacity);

  if (style.trackMatte?.enabled) {
    const matte = resolveMatte(style.trackMatte);
    const masked = applyMatte(src, matte, style.trackMatte);
    return blend(backdrop, masked, style.blendMode);
  }

  if (style.maskMode && style.maskMode !== "none") {
    return applyMaskComposite(backdrop, src, style.maskMode);
  }

  return blend(backdrop, src, style.blendMode);
}
```

---

# 4. Move & Transform

## 4.1 Definisi fitur

**Move & Transform** adalah fitur untuk mengatur posisi, ukuran, rotasi, anchor/pivot, dan transform layer. Ini adalah fitur utama untuk animasi keyframe.

Fitur ini harus berlaku untuk:

- Shape.
- Text.
- Image.
- Video.
- Group.
- Element.
- Null.
- Camera dengan aturan khusus.

---

## 4.2 Transform fields

```ts
interface Transform2D3D {
  position: Vec3;

  scale: Vec3;

  rotation: Rotation3D;

  anchor: Vec3;

  skew?: Vec2;

  flipX: boolean;
  flipY: boolean;

  size?: Vec2;

  boundsMode: BoundsMode;

  matrix?: Matrix4;

  transformOrder: TransformOrder[];

  coordinateSpace: CoordinateSpace;

  animatable: boolean;
}
```

```ts
interface Rotation3D {
  x: number;
  y: number;
  z: number;
}

type BoundsMode =
  | "layer-bounds"
  | "content-bounds"
  | "mask-bounds"
  | "custom-bounds";

type TransformOrder =
  | "translate"
  | "anchor"
  | "scale"
  | "skew"
  | "rotate"
  | "matrix";

type CoordinateSpace =
  | "local"
  | "parent"
  | "world"
  | "screen";
```

---

## 4.3 Matrix type

```ts
interface Matrix4 {
  m00: number; m01: number; m02: number; m03: number;
  m10: number; m11: number; m12: number; m13: number;
  m20: number; m21: number; m22: number; m23: number;
  m30: number; m31: number; m32: number; m33: number;
}
```

---

## 4.4 Field detail Move & Transform

| Field | Type | Default | Range | Animatable | Keterangan |
| --- | --- | ---: | --- | --- | --- |
| `position.x` | number | `0` | bebas | Ya | Posisi horizontal |
| `position.y` | number | `0` | bebas | Ya | Posisi vertikal |
| `position.z` | number | `0` | bebas | Ya | Depth/parallax |
| `scale.x` | number | `1` | `0..1000` | Ya | Skala X |
| `scale.y` | number | `1` | `0..1000` | Ya | Skala Y |
| `scale.z` | number | `1` | `0..1000` | Ya | Skala Z |
| `rotation.x` | number | `0` | bebas | Ya | Rotasi 3D X |
| `rotation.y` | number | `0` | bebas | Ya | Rotasi 3D Y |
| `rotation.z` | number | `0` | bebas | Ya | Rotasi 2D utama |
| `anchor.x` | number | `0.5` | bisa normalized/layer-space | Ya | Pivot X |
| `anchor.y` | number | `0.5` | bisa normalized/layer-space | Ya | Pivot Y |
| `anchor.z` | number | `0` | bebas | Ya | Pivot Z |
| `skew.x` | number | `0` | `-89..89` | Ya | Skew horizontal |
| `skew.y` | number | `0` | `-89..89` | Ya | Skew vertical |
| `flipX` | boolean | `false` | boolean | Hold | Mirror horizontal |
| `flipY` | boolean | `false` | boolean | Hold | Mirror vertical |
| `size.width` | number | source width | `>0` | Ya | Size layer |
| `size.height` | number | source height | `>0` | Ya | Size layer |

---

## 4.5 Transform evaluation

```ts
function evaluateTransform(layer: VisualLayer, timeMs: number): Matrix4 {
  const t = evaluateKeyframedTransform(layer.transform, layer.keyframes, timeMs);

  const anchor = translationMatrix(-t.anchor.x, -t.anchor.y, -t.anchor.z);
  const scale = scaleMatrix(
    t.flipX ? -t.scale.x : t.scale.x,
    t.flipY ? -t.scale.y : t.scale.y,
    t.scale.z
  );

  const skew = skewMatrix(t.skew?.x ?? 0, t.skew?.y ?? 0);

  const rotate =
    rotateZMatrix(t.rotation.z)
      .multiply(rotateYMatrix(t.rotation.y))
      .multiply(rotateXMatrix(t.rotation.x));

  const translate = translationMatrix(t.position.x, t.position.y, t.position.z);

  return translate.multiply(rotate).multiply(skew).multiply(scale).multiply(anchor);
}
```

---

## 4.6 Parent transform

```ts
interface Parenting {
  parentId: string | null;

  inheritPosition: boolean;
  inheritRotation: boolean;
  inheritScale: boolean;
  inheritOpacity?: boolean;

  rotationWeight: number; // 1 = normal
  scaleWeight: number;    // 1 = normal

  lockedRotation: boolean;
  lockedScale: boolean;

  autoRotateToMotionPath: boolean;
}
```

### World transform

```ts
function getWorldTransform(layer: VisualLayer, graph: LayerGraph, timeMs: number): Matrix4 {
  const local = evaluateTransform(layer, timeMs);

  if (!layer.parentId) return local;

  const parent = graph.get(layer.parentId);
  const parentWorld = getWorldTransform(parent, graph, timeMs);

  return parentWorld.multiply(local);
}
```

---

## 4.7 UI/UX Move & Transform

```txt
Move & Transform
├─ Position
│  ├─ X
│  ├─ Y
│  └─ Z
├─ Scale
│  ├─ X
│  ├─ Y
│  ├─ Lock ratio
│  └─ Z
├─ Rotation
│  ├─ Z / 2D rotation
│  ├─ X
│  └─ Y
├─ Anchor / Pivot
│  ├─ Preset grid 3x3
│  ├─ Manual X/Y/Z
│  └─ Show anchor handle
├─ Skew
├─ Flip
├─ Reset transform
└─ Keyframe toggles
```

---

## 4.8 Gesture behavior

| Gesture | No layer selected | Layer selected |
| --- | --- | --- |
| One-finger drag preview | Pan preview atau scrub jika mode timeline | Move layer |
| Two-finger pinch | Zoom preview | Scale selected layer jika transform mode aktif |
| Two-finger rotate | Rotate preview optional | Rotate selected layer |
| Drag anchor handle | Tidak ada | Move anchor |
| Long press layer | Context menu | Context menu |
| Double tap layer | Select/edit | Edit detail |

---

## 4.9 Keyframe behavior Move & Transform

### Animatable fields

```ts
const moveTransformAnimatable = [
  "transform.position.x",
  "transform.position.y",
  "transform.position.z",
  "transform.scale.x",
  "transform.scale.y",
  "transform.scale.z",
  "transform.rotation.x",
  "transform.rotation.y",
  "transform.rotation.z",
  "transform.anchor.x",
  "transform.anchor.y",
  "transform.anchor.z",
  "transform.skew.x",
  "transform.skew.y",
  "transform.size.width",
  "transform.size.height"
] as const;
```

### Rules

- Position, scale, rotation, anchor = interpolated.
- Flip = hold.
- Transform order = hold.
- Anchor animation harus menjaga visual jika option `preserveVisualPositionOnAnchorMove` aktif.
- Rotasi pakai shortest path jika nilai derajat tidak sengaja lompat.
- Untuk spin lebih dari 360°, simpan nilai derajat mentah, jangan normalize.

---

# 5. Timeline Selected Clip Controls

## 5.1 Definisi fitur

Fitur ini muncul saat user memilih clip/layer di timeline. Ada beberapa interaksi:

1. **Geser clip ke kiri/kanan**  
   Memindahkan posisi clip di timeline.

2. **Trim kiri**  
   Memotong bagian awal clip, menggeser in-point.

3. **Trim kanan**  
   Memotong bagian akhir clip, menggeser out-point.

4. **Perpanjang kiri**  
   Mengembalikan bagian awal clip yang sebelumnya dipotong jika source masih tersedia.

5. **Perpanjang kanan**  
   Mengembalikan bagian akhir clip yang sebelumnya dipotong jika source masih tersedia.

6. **Geser playhead kiri/kanan**  
   Memindahkan playhead frame-by-frame atau step tertentu.

7. **Split at playhead**  
   Membelah clip di posisi playhead.

8. **Trim to playhead**  
   Mengatur start/end clip tepat ke posisi playhead.

---

## 5.2 Timing model

```ts
interface LayerTiming {
  timelineStartMs: number;
  timelineEndMs: number;
  durationMs: number;

  source?: SourceTiming;

  speed: number;
  reversed: boolean;

  stretchMode: StretchMode;
  retimeMode: RetimeMode;

  minDurationMs: number;

  rippleMode: RippleMode;

  lockedTiming: boolean;
}
```

```ts
interface SourceTiming {
  sourceAssetId: string;

  sourceDurationMs: number;

  sourceInMs: number;
  sourceOutMs: number;

  originalSourceInMs?: number;
  originalSourceOutMs?: number;
}
```

```ts
type StretchMode =
  | "none"
  | "time-stretch"
  | "freeze-frame"
  | "loop"
  | "ping-pong";

type RetimeMode =
  | "constant-speed"
  | "speed-ramp"
  | "hold-frame";

type RippleMode =
  | "off"
  | "smart"
  | "always";
```

---

## 5.3 Selection model

```ts
type TimelineSelectionType =
  | "none"
  | "playhead"
  | "clip"
  | "clip-body"
  | "trim-left"
  | "trim-right"
  | "multi-clip"
  | "keyframe"
  | "edit-point";

interface TimelineSelection {
  type: TimelineSelectionType;

  layerIds: string[];

  activeLayerId?: string | null;

  activeEdge?: ClipEdge | null;

  activeKeyframeIds?: string[];

  selectionBounds?: Rect;

  startedAtMs?: number;
}
```

```ts
type ClipEdge =
  | "left"
  | "right";
```

---

## 5.4 Playhead model

```ts
interface PlayheadState {
  timeMs: number;
  frame: Frame;

  snappingEnabled: boolean;

  followPlayback: boolean;

  locked: boolean;

  displayMode:
    | "timecode"
    | "frames"
    | "seconds";

  nudgeStepFrames: number;
  nudgeLargeStepFrames: number;
}
```

---

## 5.5 Timeline editor state

```ts
interface TimelineState {
  fps: number;
  durationMs: number;

  playhead: PlayheadState;

  layers: Record<string, VisualLayer>;

  selection: TimelineSelection;

  snapping: SnappingSettings;

  ripple: RippleSettings;

  zoom: TimelineZoomState;

  history: HistoryState;
}
```

---

## 5.6 Snapping settings

```ts
interface SnappingSettings {
  enabled: boolean;

  snapToPlayhead: boolean;
  snapToClipEdges: boolean;
  snapToKeyframes: boolean;
  snapToMarkers: boolean;
  snapToGrid: boolean;

  thresholdPx: number;
  thresholdMs: number;

  showSnapGuides: boolean;
  hapticFeedback: boolean;
}
```

---

## 5.7 Ripple settings

```ts
interface RippleSettings {
  enabled: boolean;

  mode:
    | "off"
    | "main-track-only"
    | "selected-track"
    | "all-tracks";

  closeGapsOnDelete: boolean;
  shiftFollowingClipsOnTrim: boolean;

  protectLockedTracks: boolean;
}
```

---

## 5.8 Timeline zoom

```ts
interface TimelineZoomState {
  pixelsPerSecond: number;

  minPixelsPerSecond: number;
  maxPixelsPerSecond: number;

  scrollX: number;
  scrollY: number;

  autoScrollDuringDrag: boolean;

  playheadCenteredDuringPlayback: boolean;
}
```

---

# 6. Timeline Actions

## 6.1 Action enum

```ts
type TimelineAction =
  | { type: "SELECT_CLIP"; layerId: string }
  | { type: "SELECT_TRIM_EDGE"; layerId: string; edge: ClipEdge }
  | { type: "DESELECT_ALL" }

  | { type: "MOVE_PLAYHEAD"; timeMs: number }
  | { type: "NUDGE_PLAYHEAD"; frames: number }

  | { type: "MOVE_SELECTED_CLIP"; deltaFrames: number }
  | { type: "TRIM_SELECTED_LEFT"; deltaFrames: number }
  | { type: "TRIM_SELECTED_RIGHT"; deltaFrames: number }

  | { type: "EXTEND_SELECTED_LEFT"; deltaFrames: number }
  | { type: "EXTEND_SELECTED_RIGHT"; deltaFrames: number }

  | { type: "TRIM_LEFT_TO_PLAYHEAD"; layerId: string }
  | { type: "TRIM_RIGHT_TO_PLAYHEAD"; layerId: string }

  | { type: "SPLIT_AT_PLAYHEAD"; layerId: string }

  | { type: "SET_RIPPLE_MODE"; mode: RippleMode }
  | { type: "SET_SNAPPING"; enabled: boolean };
```

---

## 6.2 Arrow button behavior

### Problem

User menekan tombol kiri/kanan. Editor harus tahu maksudnya:

- Geser playhead?
- Geser clip?
- Trim sisi kiri?
- Trim sisi kanan?
- Perpanjang clip?
- Geser keyframe?

### Rule prioritas

```txt
1. Jika trim edge aktif → tombol kiri/kanan mengubah edge itu.
2. Jika clip body aktif → tombol kiri/kanan menggeser seluruh clip.
3. Jika keyframe aktif → tombol kiri/kanan menggeser keyframe.
4. Jika tidak ada clip aktif → tombol kiri/kanan menggeser playhead.
```

---

## 6.3 Arrow action resolver

```ts
type ArrowDirection = "left" | "right";

interface ArrowIntentContext {
  direction: ArrowDirection;

  selection: TimelineSelection;

  playhead: PlayheadState;

  modifier?: {
    shift?: boolean;
    alt?: boolean;
    ctrl?: boolean;
  };

  mode:
    | "default"
    | "trim"
    | "move"
    | "playhead"
    | "keyframe";
}
```

```ts
function resolveArrowAction(ctx: ArrowIntentContext): TimelineAction {
  const step =
    ctx.modifier?.shift
      ? ctx.playhead.nudgeLargeStepFrames
      : ctx.playhead.nudgeStepFrames;

  const sign = ctx.direction === "left" ? -1 : 1;
  const deltaFrames = sign * step;

  if (ctx.selection.type === "trim-left") {
    return { type: "TRIM_SELECTED_LEFT", deltaFrames };
  }

  if (ctx.selection.type === "trim-right") {
    return { type: "TRIM_SELECTED_RIGHT", deltaFrames };
  }

  if (ctx.selection.type === "clip" || ctx.selection.type === "clip-body") {
    return { type: "MOVE_SELECTED_CLIP", deltaFrames };
  }

  return { type: "NUDGE_PLAYHEAD", frames: deltaFrames };
}
```

---

# 7. Trim / Extend Logic

## 7.1 Frame conversion

```ts
function framesToMs(frames: number, fps: number): number {
  return (frames / fps) * 1000;
}

function msToFrames(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}
```

---

## 7.2 Trim left

Trim left berarti:

- timeline start maju/mundur,
- source in maju/mundur,
- timeline end tetap,
- duration berubah.

```ts
function trimLeft(layer: VisualLayer, deltaMs: number): VisualLayer {
  const timing = { ...layer.timing };

  if (!timing.source) return layer;

  const oldStart = timing.timelineStartMs;
  const oldEnd = timing.timelineEndMs;

  const newStart = clamp(
    oldStart + deltaMs,
    0,
    oldEnd - timing.minDurationMs
  );

  const appliedDelta = newStart - oldStart;

  const newSourceIn = clamp(
    timing.source.sourceInMs + appliedDelta * timing.speed,
    0,
    timing.source.sourceOutMs - timing.minDurationMs
  );

  timing.timelineStartMs = newStart;
  timing.durationMs = timing.timelineEndMs - timing.timelineStartMs;
  timing.source.sourceInMs = newSourceIn;

  return { ...layer, timing };
}
```

---

## 7.3 Trim right

Trim right berarti:

- timeline end maju/mundur,
- source out maju/mundur,
- timeline start tetap,
- duration berubah.

```ts
function trimRight(layer: VisualLayer, deltaMs: number): VisualLayer {
  const timing = { ...layer.timing };

  if (!timing.source) return layer;

  const oldEnd = timing.timelineEndMs;

  const maxTimelineEnd =
    timing.timelineStartMs +
    (timing.source.sourceDurationMs - timing.source.sourceInMs) / timing.speed;

  const newEnd = clamp(
    oldEnd + deltaMs,
    timing.timelineStartMs + timing.minDurationMs,
    maxTimelineEnd
  );

  const appliedDelta = newEnd - oldEnd;

  const newSourceOut = clamp(
    timing.source.sourceOutMs + appliedDelta * timing.speed,
    timing.source.sourceInMs + timing.minDurationMs,
    timing.source.sourceDurationMs
  );

  timing.timelineEndMs = newEnd;
  timing.durationMs = timing.timelineEndMs - timing.timelineStartMs;
  timing.source.sourceOutMs = newSourceOut;

  return { ...layer, timing };
}
```

---

## 7.4 Extend left

Extend left adalah trim left dengan delta negatif, tetapi harus clamp ke source start.

```ts
function extendLeft(layer: VisualLayer, deltaMs: number): VisualLayer {
  return trimLeft(layer, -Math.abs(deltaMs));
}
```

---

## 7.5 Extend right

Extend right adalah trim right dengan delta positif, tetapi harus clamp ke source end.

```ts
function extendRight(layer: VisualLayer, deltaMs: number): VisualLayer {
  return trimRight(layer, Math.abs(deltaMs));
}
```

---

## 7.6 Move selected clip

```ts
function moveClip(layer: VisualLayer, deltaMs: number): VisualLayer {
  const timing = { ...layer.timing };

  if (timing.lockedTiming) return layer;

  timing.timelineStartMs = Math.max(0, timing.timelineStartMs + deltaMs);
  timing.timelineEndMs = Math.max(
    timing.timelineStartMs + timing.minDurationMs,
    timing.timelineEndMs + deltaMs
  );

  return { ...layer, timing };
}
```

---

## 7.7 Split at playhead

```ts
interface SplitResult {
  left: VisualLayer;
  right: VisualLayer;
}
```

```ts
function splitAtPlayhead(layer: VisualLayer, playheadMs: number): SplitResult | null {
  const t = layer.timing;

  if (playheadMs <= t.timelineStartMs || playheadMs >= t.timelineEndMs) {
    return null;
  }

  const left = structuredClone(layer);
  const right = structuredClone(layer);

  left.id = generateId("layer");
  right.id = generateId("layer");

  left.timing.timelineEndMs = playheadMs;
  left.timing.durationMs = left.timing.timelineEndMs - left.timing.timelineStartMs;

  right.timing.timelineStartMs = playheadMs;
  right.timing.durationMs = right.timing.timelineEndMs - right.timing.timelineStartMs;

  if (t.source) {
    const sourceSplitMs =
      t.source.sourceInMs +
      (playheadMs - t.timelineStartMs) * t.speed;

    left.timing.source!.sourceOutMs = sourceSplitMs;
    right.timing.source!.sourceInMs = sourceSplitMs;
  }

  right.name = `${layer.name} Split`;

  return { left, right };
}
```

---

# 8. Trim Handle UI

## 8.1 Selected clip visual states

```ts
type ClipVisualState =
  | "normal"
  | "hover"
  | "selected"
  | "trim-left-active"
  | "trim-right-active"
  | "dragging"
  | "disabled"
  | "locked";
```

---

## 8.2 Clip handle fields

```ts
interface ClipTrimHandle {
  edge: ClipEdge;

  visible: boolean;
  active: boolean;

  widthPx: number;
  minTouchTargetPx: number;

  color: string;

  icon:
    | "bracket"
    | "arrow"
    | "bar"
    | "none";

  hapticOnSnap: boolean;
}
```

### Default

```ts
const defaultTrimHandle: ClipTrimHandle = {
  edge: "left",
  visible: true,
  active: false,
  widthPx: 12,
  minTouchTargetPx: 48,
  color: "#FFB000",
  icon: "bracket",
  hapticOnSnap: true
};
```

---

## 8.3 Timeline toolbar when clip selected

```ts
interface SelectedClipToolbar {
  visible: boolean;

  buttons: SelectedClipButton[];

  layout:
    | "bottom-sheet"
    | "floating-toolbar"
    | "inline-above-clip";

  compact: boolean;
}
```

```ts
type SelectedClipButtonId =
  | "move-left"
  | "move-right"
  | "trim-left"
  | "trim-right"
  | "extend-left"
  | "extend-right"
  | "split"
  | "trim-left-to-playhead"
  | "trim-right-to-playhead"
  | "duplicate"
  | "delete"
  | "close-gap"
  | "ripple-toggle"
  | "snapping-toggle";
```

```ts
interface SelectedClipButton {
  id: SelectedClipButtonId;
  label: string;
  icon: string;

  enabled: boolean;
  visible: boolean;

  longPressBehavior?: "repeat" | "open-menu" | "none";

  stepFrames?: number;
  largeStepFrames?: number;

  tooltip?: string;
}
```

---

# 9. Playhead Interactions

## 9.1 Playhead drag

```ts
interface PlayheadDragState {
  dragging: boolean;

  startTimeMs: number;
  currentTimeMs: number;

  snapCandidate?: SnapCandidate | null;

  showTimeBubble: boolean;

  updatePreviewFrame: boolean;
}
```

```ts
interface SnapCandidate {
  type:
    | "clip-start"
    | "clip-end"
    | "keyframe"
    | "marker"
    | "grid"
    | "project-start"
    | "project-end";

  timeMs: number;
  layerId?: string;
  distancePx: number;
}
```

---

## 9.2 Playhead nudge

```ts
function nudgePlayhead(state: TimelineState, frames: number): TimelineState {
  const deltaMs = framesToMs(frames, state.fps);

  const timeMs = clamp(
    state.playhead.timeMs + deltaMs,
    0,
    state.durationMs
  );

  return {
    ...state,
    playhead: {
      ...state.playhead,
      timeMs,
      frame: msToFrames(timeMs, state.fps)
    }
  };
}
```

---

# 10. State Machine Timeline Controls

## 10.1 State diagram

```txt
idle
 ├─ tap clip → clip-selected
 ├─ drag playhead → playhead-dragging
 └─ tap empty → idle

clip-selected
 ├─ drag body → clip-dragging
 ├─ tap left handle → trim-left-selected
 ├─ tap right handle → trim-right-selected
 ├─ press split → split-at-playhead
 └─ tap empty → idle

trim-left-selected
 ├─ drag handle → trimming-left
 ├─ arrow left/right → trim-left by frame
 └─ tap clip body → clip-selected

trim-right-selected
 ├─ drag handle → trimming-right
 ├─ arrow left/right → trim-right by frame
 └─ tap clip body → clip-selected

playhead-dragging
 ├─ release → idle or previous selection
 └─ snap candidate → show snap guide
```

---

## 10.2 Explicit machine type

```ts
type TimelineInteractionState =
  | { name: "idle" }
  | { name: "clip-selected"; layerId: string }
  | { name: "clip-dragging"; layerId: string; startPointer: Vec2; originalStartMs: number }
  | { name: "trim-left-selected"; layerId: string }
  | { name: "trim-right-selected"; layerId: string }
  | { name: "trimming-left"; layerId: string; startPointer: Vec2; originalTiming: LayerTiming }
  | { name: "trimming-right"; layerId: string; startPointer: Vec2; originalTiming: LayerTiming }
  | { name: "playhead-dragging"; startPointer: Vec2; originalTimeMs: number };
```

---

# 11. Full VisualStyle Model

```ts
interface VisualStyle {
  fill: FillStyle;

  stroke: StrokeStyle;

  shadow: ShadowStyle;

  composite: CompositeStyle;

  visible: boolean;

  styleVersion: number;
}
```

---

# 12. Full Layer Model Example

```ts
const exampleShapeLayer: VisualLayer = {
  id: "layer_001",
  name: "Animated Lower Third",
  type: "shape",

  timing: {
    timelineStartMs: 1200,
    timelineEndMs: 5200,
    durationMs: 4000,

    source: undefined,

    speed: 1,
    reversed: false,

    stretchMode: "none",
    retimeMode: "constant-speed",

    minDurationMs: 33.333,

    rippleMode: "smart",

    lockedTiming: false
  },

  transform: {
    position: { x: 0, y: 420, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
    anchor: { x: 0.5, y: 0.5, z: 0 },
    skew: { x: 0, y: 0 },
    flipX: false,
    flipY: false,
    size: { x: 820, y: 160 },
    boundsMode: "layer-bounds",
    transformOrder: ["anchor", "scale", "skew", "rotate", "translate"],
    coordinateSpace: "local",
    animatable: true
  },

  style: {
    fill: {
      enabled: true,
      mode: "linear-gradient",
      solid: {
        color: { r: 1, g: 1, b: 1, a: 1 }
      },
      linearGradient: {
        stops: [
          {
            id: "stop_1",
            offset: 0,
            color: { r: 0.05, g: 0.05, b: 0.07, a: 1 }
          },
          {
            id: "stop_2",
            offset: 1,
            color: { r: 0.16, g: 0.16, b: 0.22, a: 1 }
          }
        ],
        start: { x: 0, y: 0.5 },
        end: { x: 1, y: 0.5 },
        angleDeg: 0,
        repeatMode: "clamp",
        interpolation: "srgb"
      },
      alpha: 1,
      preserveLuminance: false,
      preserveAlpha: true,
      applyTo: "fill-only",
      colorSpace: "srgb",
      blendWithSource: "replace",
      animatable: true
    },

    stroke: {
      enabled: true,
      color: { r: 1, g: 1, b: 1, a: 0.25 },
      width: 3,
      alignment: "center",
      cap: "round",
      join: "round",
      miterLimit: 4,
      dash: {
        enabled: false,
        dash: 12,
        gap: 8,
        offset: 0
      },
      opacity: 1,
      pressureSensitive: false,
      renderOrder: "above-fill",
      animatable: true
    },

    shadow: {
      enabled: true,
      shadows: [
        {
          id: "shadow_1",
          type: "drop",
          color: { r: 0, g: 0, b: 0, a: 1 },
          opacity: 0.32,
          blur: 24,
          spread: 0,
          offset: { x: 0, y: 10 },
          distance: 10,
          angleDeg: 90,
          blendMode: "normal",
          enabled: true
        }
      ],
      quality: "balanced",
      clipToLayerBounds: false,
      expandRenderBounds: 64,
      animatable: true
    },

    composite: {
      opacity: 1,
      blendMode: "normal",
      alphaMode: "premultiplied",
      premultipliedAlpha: true,
      isolateBlending: false,
      knockoutGroup: false,
      maskMode: "none",
      preserveTransparency: false,
      animatable: true
    },

    visible: true,
    styleVersion: 1
  },

  effects: [],

  keyframes: [
    {
      id: "track_pos_y",
      propertyPath: "transform.position.y",
      valueType: "number",
      enabled: true,
      trackMode: "absolute",
      keyframes: [
        {
          id: "kf_1",
          timeMs: 1200,
          value: 480,
          interpolation: "bezier",
          easing: {
            type: "ease-out"
          }
        },
        {
          id: "kf_2",
          timeMs: 1500,
          value: 420,
          interpolation: "bezier",
          easing: {
            type: "custom-cubic",
            cubic: [0.2, 0.8, 0.2, 1]
          }
        }
      ]
    },
    {
      id: "track_opacity",
      propertyPath: "style.composite.opacity",
      valueType: "number",
      enabled: true,
      trackMode: "absolute",
      keyframes: [
        {
          id: "kf_3",
          timeMs: 1200,
          value: 0,
          interpolation: "linear"
        },
        {
          id: "kf_4",
          timeMs: 1500,
          value: 1,
          interpolation: "bezier",
          easing: {
            type: "ease-out"
          }
        }
      ]
    }
  ],

  parentId: null,

  locked: false,
  visible: true,

  metadata: {
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    source: "user-created"
  }
};
```

---

# 13. Additional Types

```ts
type VisualLayerType =
  | "shape"
  | "text"
  | "image"
  | "video"
  | "audio"
  | "group"
  | "element"
  | "camera"
  | "null";

type ColorSpaceMode =
  | "srgb"
  | "display-p3"
  | "linear-rgb"
  | "oklab";

type FillSourceBlendMode =
  | "replace"
  | "multiply-with-source"
  | "screen-with-source"
  | "overlay-source"
  | "tint-source";

interface EffectInstance {
  id: string;
  effectType: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
  keyframes?: KeyframeTrack[];
}

interface LayerMetadata {
  createdAt: string;
  updatedAt: string;
  source:
    | "user-created"
    | "imported"
    | "template"
    | "generated"
    | "element";
}
```

---

# 14. Implementation Checklist

## Color & Fill

- [ ] Support `none`.
- [ ] Support `solid`.
- [ ] Support `linear-gradient`.
- [ ] Support `radial-gradient`.
- [ ] Support fill alpha separate from layer opacity.
- [ ] Support gradient stops.
- [ ] Support keyframe fill color.
- [ ] Support keyframe gradient handle/angle.
- [ ] Support source-preserve mode for media.
- [ ] Validate gradient minimum 2 stops.

## Border & Shadow

- [ ] Support stroke toggle.
- [ ] Support stroke width.
- [ ] Support stroke color.
- [ ] Support inside/center/outside alignment.
- [ ] Support cap and join.
- [ ] Support dash/gap/offset.
- [ ] Support taper for line/freehand.
- [ ] Support multiple shadows.
- [ ] Support drop shadow.
- [ ] Support inner shadow.
- [ ] Support glow.
- [ ] Support shadow caching.
- [ ] Support keyframe stroke and shadow.

## Blending & Opacity

- [ ] Support opacity 0..1.
- [ ] Support blend mode categories.
- [ ] Support normal/multiply/screen/overlay/add/subtract/exclude/mask.
- [ ] Support group isolation.
- [ ] Support track matte.
- [ ] Support opacity keyframes.
- [ ] Treat blendMode as hold keyframe.

## Move & Transform

- [ ] Support position X/Y/Z.
- [ ] Support scale X/Y/Z.
- [ ] Support rotation X/Y/Z.
- [ ] Support anchor/pivot.
- [ ] Support flip X/Y.
- [ ] Support optional skew.
- [ ] Support transform keyframes.
- [ ] Support parent/world transform.
- [ ] Support preview handles.
- [ ] Support reset transform.

## Timeline Controls

- [ ] Show handles when clip selected.
- [ ] Drag left edge for trim/extend left.
- [ ] Drag right edge for trim/extend right.
- [ ] Arrow button moves playhead when nothing selected.
- [ ] Arrow button nudges clip when clip body selected.
- [ ] Arrow button trims active edge when trim handle selected.
- [ ] Support split at playhead.
- [ ] Support trim left to playhead.
- [ ] Support trim right to playhead.
- [ ] Support frame snapping.
- [ ] Support clip edge snapping.
- [ ] Support keyframe snapping.
- [ ] Support haptic feedback on snap.
- [ ] Keep edits nondestructive.
- [ ] Clamp trim to source bounds.
- [ ] Preserve minimum layer duration.
- [ ] Add undo/redo transactions.

---

# 15. Recommended UI Labels

## Indonesian labels

| Internal | Label UI |
| --- | --- |
| `Color & Fill` | Warna & Isi |
| `Border & Shadow` | Border & Bayangan |
| `Blending & Opacity` | Blending & Opacity |
| `Move & Transform` | Gerak & Transformasi |
| `Trim Left` | Potong Kiri |
| `Trim Right` | Potong Kanan |
| `Extend Left` | Perpanjang Kiri |
| `Extend Right` | Perpanjang Kanan |
| `Nudge Left` | Geser Kiri |
| `Nudge Right` | Geser Kanan |
| `Move Playhead Left` | Playhead ke Kiri |
| `Move Playhead Right` | Playhead ke Kanan |
| `Split at Playhead` | Split di Playhead |
| `Trim to Playhead` | Potong ke Playhead |

---

# 16. Final Notes

Spesifikasi ini sengaja dibuat property-first. Artinya setiap fitur tidak cuma punya UI, tapi juga:

- field serializable,
- default value,
- range,
- animatable flag,
- validation rule,
- render behavior,
- timeline behavior,
- reducer/action model.

Dengan model seperti ini, editor kamu bisa:

- menyimpan project secara stabil,
- mendukung keyframe hampir semua properti,
- menghindari duplikasi fitur,
- membuat preset/element reusable,
- dan membuat UX timeline lebih jelas ketika user memilih clip, menggeser playhead, atau menekan tombol kiri/kanan.
