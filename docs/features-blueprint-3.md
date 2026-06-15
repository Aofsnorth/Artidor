```markdown
# Adobe After Effects & Premiere Pro — Complete Feature Reference
# Version: 2024 (v24.x / v25.x)
# Format: Exhaustive Markdown Reference
# Generated: 2025

---
---

# ═══════════════════════════════════════════════════════════════════
# PART A: AFTER EFFECTS — COMPLETE REFERENCE
# ═══════════════════════════════════════════════════════════════════

---

## AE-01: What Is After Effects

After Effects is Adobe's professional motion graphics, visual effects, and compositing application. It operates on a timeline-based layer system (as opposed to node-based compositing found in Nuke or Fusion). It is part of the Adobe Creative Cloud ecosystem and integrates deeply with Premiere Pro, Photoshop, Illustrator, Audition, Media Encoder, Animate, and other Adobe applications.

### Core Capabilities:
- 2D/2.5D motion graphics design and animation
- Visual effects compositing and green/blue screen keying
- 3D compositing with built-in 3D camera, lights, and layers
- Camera and object tracking (point tracking, planar tracking via Mocha)
- Roto Brush and Refine Edge for automatic rotoscoping
- Expression-based animation (JavaScript-based scripting within properties)
- Character animation with the Puppet tool
- Particle effects and physics simulations
- Text animation (per-character, per-word, per-line)
- Shape layer vector animation
- Paint and clone stamp on footage
- Color correction and color grading
- Audio visualization and waveform animation
- Procedural animation via expressions and scripting (ExtendScript, CEP, UXP)
- Multi-Frame Rendering for parallel CPU processing
- GPU-accelerated effects and previews via Mercury GPU Acceleration
- Global Performance Cache for persistent disk-based caching
- Team Projects for cloud-based collaborative editing
- Dynamic Link for live connection to Premiere Pro and Audition
- Integration with Cinema 4D via Cineware and .c4d files
- Support for EXR, DPX, ProRes, DNxHR, H.264/H.265, AVI, MOV, image sequences
- 32-bit float per channel (linear color) compositing
- HDR/HLG workflows with PQ and HLG transfer functions
- Content-Aware Fill for video (remove objects from footage)
- Data-driven animation (JSON, CSV data import)
- Media Replacement in Motion Graphics Templates (MOGRTs)
- Lottie/Bodymovin export for web animation

---

## AE-02: System Requirements

### Windows Minimum:
| Component | Requirement |
|---|---|
| Processor | Multicore Intel or AMD with 64-bit support |
| Operating System | Windows 10 (64-bit) v22H2 or later |
| RAM | 16 GB |
| GPU | 2 GB VRAM, OpenGL 2.0 |
| Storage | 15 GB available (SSD required for best performance) |
| Display | 1920×1080 minimum |
| Internet | Required for activation and cloud features |

### macOS Minimum:
| Component | Requirement |
|---|---|
| Processor | Apple Silicon (M1/M2/M3/M4) or Multicore Intel with 64-bit |
| Operating System | macOS 12.0 (Monterey) or later |
| RAM | 16 GB |
| GPU | Apple Silicon integrated or 2 GB discrete GPU |
| Storage | 15 GB available (SSD required) |
| Display | 1920×1080 minimum |
| Internet | Required for activation and cloud features |

### Recommended Configuration:
- CPU: 12-core+ (Apple M2 Pro/M3 Pro or AMD Ryzen 9 / Intel i9)
- RAM: 64 GB or more (128 GB for heavy 4K/8K compositing)
- GPU: NVIDIA RTX 4070+ or AMD Radeon Pro / Apple M-series
- Storage: NVMe SSD for OS + apps, separate NVMe for cache, separate for project files
- Display: Dual monitor setup, 4K primary, hardware color calibrated

### Performance Notes:
- Multi-Frame Rendering (MFR) scales with CPU core count
- GPU acceleration affects specific effects (Gaussian Blur, Lumetri, etc.)
- Disk cache benefits enormously from NVMe SSD speed
- RAM preview buffer directly tied to available RAM
- 16 GB is functional but severely limiting; 32 GB is practical minimum for professional work

---

## AE-03: Installation & Licensing

### Installation Steps:
1. Install Creative Cloud Desktop application from adobe.com
2. Sign in with Adobe ID (create if needed)
3. Navigate to Apps tab > find After Effects > Install
4. Choose installation language and location
5. Wait for download + installation (typically 3–5 GB download)
6. Launch from Creative Cloud or Start Menu / Applications folder

### Licensing Models:
- **Individual**: Single-user subscription (monthly/annual)
- **Business/Teams**: Admin console, centralized deployment, pooled licenses
- **Enterprise**: Custom deployment, directory integration, managed services
- **Education**: Discounted for verified students and teachers
- **Device License**: Shared computer licensing for labs/classrooms

### Activation:
- Online activation (automatic on sign-in)
- Up to 2 concurrent activations per user (desktop + laptop)
- Remote sign-out via account.adobe.com

### Updates:
- Auto-update via Creative Cloud Desktop app
- Manual update control per application
- Access to beta builds via Creative Cloud Beta apps
- Rollback to previous version supported (keep previous version option)

---

## AE-04: Interface Components

### Application Bar (Top):
- Workspace switcher dropdown
- Search bar (Adobe Stock, Effects, Help)
- Edit tab switch (Standard/Graph Editor)
- Account info and notifications
- Sync settings toggle

### Menu Bar:
File | Edit | Composition | Layer | Effect | Animation | View | Window | Help

### Toolbar (Left Side):
| Tool | Shortcut | Function |
|---|---|---|
| Selection | V | Select and move layers |
| Hand | H | Pan/scroll the view |
| Zoom | Z | Zoom in (click) / out (Alt+click) |
| Rotation | W | Rotate 3D layers / 2D layers |
| Camera | C | Orbit, Pan, Dolly camera in 3D |
| Pan Behind | Y | Move anchor point |
| Rectangle | Q | Draw rectangle shape |
| Rounded Rectangle | Q (cycle) | Draw rounded rectangle |
| Ellipse | Q (cycle) | Draw ellipse shape |
| Polygon | Q (cycle) | Draw polygon |
| Star | Q (cycle) | Draw star |
| Pen | G | Draw Bezier mask or shape path |
| Add Vertex | G (with path) | Add point to path |
| Delete Vertex | G (with path) | Remove point from path |
| Convert Vertex | G (with path) | Cusp ↔ smooth point |
| Mask Feather | G (cycle) | Add feather point on mask edge |
| Horizontal Type | Ctrl+T | Create horizontal text |
| Vertical Type | Ctrl+T (cycle) | Create vertical text |
| Brush | Ctrl+B | Paint on layer |
| Clone Stamp | Ctrl+B (cycle) | Clone paint source |
| Eraser | Ctrl+B (cycle) | Erase paint strokes |
| Puppet | Ctrl+P | Add puppet pins for deformation |

### Panel System:
- All panels are dockable, floatable, and tabbable
- Panels can be grouped into tab stacks
- Resizable by dragging panel borders
- Saved as part of workspaces

---

## AE-05: All Workspaces

### Preset Workspaces:
1. **All Panels** — Every available panel visible; maximum information density
2. **Animation** — Timeline-focused layout optimized for keyframe work
3. **Effects** — Effects & Presets panel prominent; effect parameter editing
4. **Libraries** — Creative Cloud Libraries panel for shared assets
5. **Minimal** — Bare essentials for distraction-free work
6. **Motion Tracking** — Tracker panel, Composition, and Timeline focus
7. **Paint** — Paint, Brushes, Clone Stamp tools prominent
8. **Standard** — Balanced default layout (startup default)
9. **Undocked** — All panels floating independently

### Workspace Operations:
- Switch: Application bar > Workspace name
- Save: Window > Workspace > Save as New Workspace
- Delete: Window > Workspace > Delete Workspace
- Reset: Window > Workspace > Reset [Workspace Name]
- Import/Export: Window > Workspace > Import/Export Workspace (XML)
- Keyboard shortcut: assign via Edit > Keyboard Shortcuts

### Custom Workspace:
1. Arrange panels (dock, undock, resize, group)
2. Window > Workspace > Save as New Workspace
3. Name it, press Enter
4. Optionally assign keyboard shortcut

---

## AE-06: File Menu — Complete

### New:
- **New Project**: Ctrl+Alt+Shift+N — Creates blank project
- **New Composition**: Ctrl+N — Opens Composition Settings dialog
- **New Composition from Footage**: Select footage > Ctrl+N
- **New Folder**: Ctrl+Alt+Shift+N — Creates folder in Project panel
- **New Adobe Photoshop File**: Creates linked .psd file and opens Photoshop
- **New MAXON CINEMA 4D File**: Creates linked .c4d file and opens C4D
- **New Text Layer**: Ctrl+Alt+Shift+T
- **New Solid**: Ctrl+Y — Solid color layer (custom size/color)
- **New Null Object**: Ctrl+Alt+Shift+Y
- **New Shape Layer**: Draw with shape or pen tool
- **New Adjustment Layer**: Ctrl+Alt+Y
- **New Camera**: Ctrl+Alt+Shift+C — 1-node or 2-node camera
- **New Light**: Ctrl+Alt+Shift+L — Point, Spot, Ambient, Parallel

### Open:
- **Open Project**: Ctrl+O
- **Open Recent**: List of recent project files
- **Browse in Bridge**: Ctrl+Alt+Shift+O — Opens Adobe Bridge

### Close:
- **Close**: Ctrl+W — Close active project
- **Close Project**: Ctrl+Shift+W — Close project but keep AE open

### Save:
- **Save**: Ctrl+S
- **Save As**: Ctrl+Shift+S
- **Save a Copy**: Saves duplicate without switching to it
- **Save a Copy As**: Versioned save
- **Increment and Save**: Ctrl+Alt+Shift+S — Auto-increments filename (project_01.aep → project_02.aep)
- **Revert**: Revert to last saved version (discards all unsaved changes)

### Import:
- **File**: Ctrl+I — Import single or multiple files
- **Multiple Files**: Ctrl+Alt+I — Import dialog stays open for batch import
- **Recent Footage**: Quick access to recently imported files
- **Watch Folder**: Monitors folder for auto-import of dropped files

### Export:
- **Add to Render Queue**: Ctrl+Shift+/
- **Add to Adobe Media Encoder Queue**: Ctrl+Alt+M

### Project Settings:
- **Display Style**: Timecode, Frames, Feet+Frames (16mm, 35mm)
- **Color Settings**: Working color space, linearize working space, blend colors using gamma 1.0
- **Audio**: Sample rate (8000–192000 Hz)

### Dependencies:
- **Reduce Project**: Removes unused footage, compositions, and folders
- **Collect Files**: Copies all source files into a single folder
- **Consolidate All Footage**: Merges duplicate footage references
- **Remove Unused Footage**: Removes footage not referenced in any composition
- **Find Missing Footage**: Locate and relink offline/missing files
- **Find Missing Fonts**: Identify and replace missing fonts
- **Find Missing Effects**: Identify third-party effects not installed

---

## AE-07: Edit Menu — Complete

### History & Undo:
- **Undo**: Ctrl+Z (multiple levels, configurable 1–99 in Preferences)
- **Redo**: Ctrl+Shift+Z
- **History Panel**: Full undo history with named operations

### Clipboard:
- **Cut**: Ctrl+X
- **Copy**: Ctrl+C
- **Paste**: Ctrl+V
- **Clear**: Delete
- **Copy with Property Links**: Creates expressions linking copied properties
- **Paste Special > Paste in Place**: Pastes maintaining source position

### Selection:
- **Select All**: Ctrl+A
- **Deselect All**: Ctrl+Shift+A or F2
- **Select Label Group**: Select all layers with same label color

### Layer Operations:
- **Duplicate**: Ctrl+D — Duplicate selected layer(s)
- **Split Layer**: Ctrl+Shift+D — Split at current time
- **Lift Work Area**: Remove selection leaving gap
- **Extract Work Area**: Remove selection and close gap

### Purge (Memory Management):
- **Undo Memory**: Purge undo buffer
- **Image Cache Memory**: Purge RAM preview cache
- **Snapshot Memory**: Purge stored snapshots
- **All Memory & Disk Cache**: Purge all cached data
- **Disk Cache**: Delete on-disk cache files

### Templates:
- **Render Settings Templates**: Define reusable render presets
- **Output Module Templates**: Define reusable output format presets

### Preferences — All Categories:
1. **General**: Undo levels, palettes, default interpolation, scripting
2. **Previews**: Adaptive resolution, fast previews, GPU settings
3. **Display**: Layer handles, motion path, keyframe selection
4. **Import**: Default footage interpretation settings
5. **Output**: Default output module, file name templates
6. **Grids & Guides**: Grid spacing, subdivisions, guide color, smart guides
7. **Labels**: Layer label colors, default label assignments
8. **Media & Disk Cache**: Cache location, maximum size, database location
9. **Video Preview**: External video output device settings
10. **Appearance**: UI brightness, highlight color, chart colors
11. **Audio Hardware**: Input/output device, latency buffer
12. **Auto-Save**: Interval, maximum versions, project path

### Keyboard Shortcuts:
- **Edit > Keyboard Shortcuts**: Ctrl+Alt+Shift+K
- Search for any command
- Assign custom shortcuts
- Save and share shortcut sets
- Multiple preset schemes available

---

## AE-08: Composition Settings (Ctrl+N / Ctrl+K)

### Basic Tab:
- **Name**: Composition name
- **Preset**: Dropdown with common presets (HDTV 1080 29.97, 4K UHD, etc.)
- **Width**: 1–30000 px
- **Height**: 1–30000 px
- **Lock Aspect Ratio**: Toggle to constrain width/height proportionally
- **Pixel Aspect Ratio**: Square Pixels (1.0), D1/DV NTSC (0.9/1.2), Anamorphic, etc.
- **Frame Rate**: 1–99 fps (common: 23.976, 24, 25, 29.97, 30, 50, 59.94, 60, 120)
- **Resolution**: Full, Half, Third, Quarter, Custom
- **Start Timecode**: Default 0;00;00;00 or custom
- **Start Frame**: 0 or 1 (for frame numbering)
- **Duration**: HH;MM;SS;FF format
- **Background Color**: Color picker (default: black)

### Advanced Tab:
- **Anchor**: X,Y offset for layer anchor in composition
- **Shutter Angle**: 0–720° (motion blur; default 180°)
- **Shutter Phase**: -360° to 360°
- **Composition Marker**: Color, comment, duration
- **Rendering Plug-in**: Mercury GPU Acceleration / Mercury Software Only
- **Preserve frame rate when nested or in Render Queue**: Keep comp FPS
- **Preserve resolution when nested**: Keep comp resolution
- **Motion Blur > Samples Per Frame**: 2–64
- **Motion Blur > Adaptive Sample Limit**: 16–128

---

## AE-09: Layer Types — Complete

### 1. Footage Layer
- Imported source material (video, image sequence, audio, image)
- Source can be replaced, reinterpreted, or reloaded
- Can have in/out points trimmed, time remapped

### 2. Solid Layer (Ctrl+Y)
- Flat color rectangle
- Configurable size, color, name, pixel aspect ratio
- Often used as: matte, background, effect source, adjustment (before adjustment layer existed)

### 3. Text Layer (Ctrl+Alt+Shift+T)
- Vector-based text
- Full typography controls (font, size, kerning, leading, etc.)
- Per-character animation via Animator system
- Continuously rasterizes (always sharp)
- Two modes: Point Text, Paragraph Text (area text box)

### 4. Shape Layer
- Vector-based shapes (rectangle, ellipse, polygon, star, custom path)
- Grouped in shape groups with transforms
- Fill, Stroke, Merge Paths, Trim Paths, Pucker & Bloat, Wiggle Transform, etc.
- Animatable per-group and per-shape
- Continuously rasterizes

### 5. Null Object (Ctrl+Alt+Shift+Y)
- Invisible layer used as parent/orientation driver
- Has all Transform properties
- Used for camera targeting, layer linking, effect drivers

### 6. Adjustment Layer (Ctrl+Alt+Y)
- Transparent layer that applies effects to all layers below it
- Can be masked to limit effect area
- Has all standard Transform properties

### 7. Camera Layer (Ctrl+Alt+Shift+C)
- **1-Node Camera**: Position, Point of Interest, Zoom, Depth of Field
- **2-Node Camera**: Same + built-in point of interest control
- Presets: 15mm, 20mm, 24mm, 35mm, 50mm, 80mm, 135mm, 200mm
- Properties: Zoom, Depth of Field, Focus Distance, Aperture, F-Stop, Blur Level
- Multiple cameras allowed; timeline determines which is active

### 8. Light Layer (Ctrl+Alt+Shift+L)
- Types: Parallel, Spot, Point, Ambient
- Properties: Intensity, Color, Cone Angle, Cone Feather, Casts Shadows, Shadow Darkness, Shadow Diffusion
- 3D lights affect 3D layers only

### 9. Photoshop Layer (.psd import)
- Maintains layer structure, blending modes, masks, effects (limited)
- Editable in original app, updates in AE

### 10. Illustrator Layer (.ai import)
- Vector-based, continuously rasterized
- Can convert to Shape Layer or keep as footage

### 11. Cinema 4D Layer (.c4d)
- Rendered by Cineware engine
- Editable in Cinema 4D
- Limited C4D effect support

### 12. Pre-composition (Pre-comp)
- Nested composition used as a layer
- Can be opened and edited independently
- "Collapse transformations" for continuous rasterization + 3D pass-through

---

## AE-10: Layer Properties — Complete Transform

### Transform (Every Layer):
- **Anchor Point**: 0,0,0 — Pivot point for rotation and scaling
- **Position**: X, Y (2D) or X, Y, Z (3D layer)
- **Scale**: Width%, Height% (default 100%, 100%)
- **Rotation**: Degrees (0–3600° for multiple revolutions)
- **Opacity**: 0–100%

### 3D Layer Additional Properties:
- **X Rotation**: Rotation around X axis
- **Y Rotation**: Rotation around Y axis
- **Z Rotation**: Rotation around Z axis (same as 2D Rotation)
- **Material Options**:
  - Casts Shadows: On/Off
  - Light Transmission: 0–100%
  - Accepts Shadows: On/Off
  - Accepts Lights: On/Off
  - Ambient: 0–100%
  - Diffuse: 0–100%
  - Specular Intensity: 0–100%
  - Specular Shininess: 2–100%
  - Metal: 0–100%
  - Reflection Intensity: 0–100%
  - Reflection Sharpness: 0–100%
  - Reflection Rolloff: 0–100%

### Audio Properties (Audio Layers):
- **Audio Levels**: dB (-∞ to +12 dB)
- **Audio Waveform**: Visual display in Timeline

### Text Properties:
- **Source Text**: The text string itself
- **Path Options**: Path, Reverse Path, First Margin, Last Margin, Perpendicular To Path, Force Alignment, Grouping Alignment
- **More Options**: Anchor Point Grouping, Fill & Stroke, Inter Character Blending

### Mask Properties:
- **Mask Path**: Bezier path
- **Mask Feather**: Per-point feather distance
- **Mask Opacity**: 0–100%
- **Mask Expansion**: Pixels (+/- to expand/contract)

### Effect Properties:
- Vary by effect (see AE-30 through AE-45 for all effects)

### Layer Switches & Indicators:
| Switch | Icon | Function |
|---|---|---|
| Video | Eye | Show/hide layer |
| Audio | Speaker | Enable/disable audio |
| Solo | S | Solo this layer |
| Lock | Padlock | Lock layer from editing |
| Shy | Face | Hide in Timeline when Shy master is active |
| Collapse | Sun icon | Collapse transformations / continuously rasterize |
| Quality | Star | Best / Draft / Wireframe |
| Effects | fx | Enable/disable all effects |
| Frame Blend | FB | Frame blending mode (Off / Frame Mix / Pixel Motion) |
| Motion Blur | MB | Enable motion blur per layer |
| Adjustment | Adj | Make this an adjustment layer |
| 3D | Cube | Enable 3D layer |

---

## AE-11: Timeline Panel — Deep Dive

### Header Controls:
- Composition name (click to navigate to comp)
- Current time display (click to type exact time)
- Search bar (filter layers by name)
- Shy layers master toggle
- Master motion blur toggle
| Master 3D renderer toggle |
- Graph Editor / Layer switches toggle

### Layer Columns:
- **#**: Layer index number
- **Layer Name / Source Name**: Toggle via Timeline menu
- **Label**: 16 color options (customizable per type in Preferences)
- **Parent**: Parent layer dropdown or pick whip
- **Comment**: Custom text notes per layer
- **Custom Columns**: Add via Timeline menu (footage name, file path, etc.)

### Time Navigation:
- **Time Ruler**: Frames or timecode (zoomable)
- **CTI (Current Time Indicator)**: Red marker, drag or click
- **Home**: Go to 0;00;00;00
- **End**: Go to comp duration end
- **J**: Go to previous keyframe
- **K**: Go to next keyframe
- **PgUp**: Previous frame
- **PgDn**: Next frame
- **Shift+PgUp**: Jump 10 frames back
- **Shift+PgDn**: Jump 10 frames forward
- **Alt+Shift+J**: Go to specific time (type timecode)

### Work Area:
- **B**: Set work area beginning
- **N**: Set work area end
- Used for: RAM Preview range, Render Queue range, Pre-compose range

### Property Groups:
Each layer expands to show:
- Transform
  - Anchor Point, Position, Scale, Rotation, Opacity
- Masks
  - Mask 1, Mask 2, ... (each with Path, Feather, Opacity, Expansion)
- Effects
  - Effect 1, Effect 2, ... (each with specific parameters)
- Audio
  - Audio Levels
- Time Remap (when enabled)
- Marker
- Comment

### Adding Keyframes:
1. Position CTI at desired time
2. Click the stopwatch icon next to a property → creates first keyframe
3. Change value → creates new keyframe automatically
4. Or: Move to time, click Add Keyframe diamond icon

### Keyframe Types:
- **Linear**: Constant rate of change, sharp corners
- **Bezier**: Smooth curves, adjustable handles
- **Auto Bezier**: Automatic smooth curve
- **Hold**: No interpolation (value jumps)
- **Rove Across Time**: Keyframes automatically distribute timing
- **Easy Ease**: Ctrl+Shift+F9
- **Easy Ease In**: Shift+F9
- **Easy Ease Out**: Ctrl+F9

### Keyframe Interpolation Dialog:
- Temporal Interpolation: Linear, Bezier, Hold
- Spatial Interpolation: Linear, Bezier, Auto Bezier
- Separate Dimensions: Split Position into X, Y (, Z)

---

## AE-12: Graph Editor

### Modes:
- **Value Graph**: Shows actual property values over time
- **Speed Graph**: Shows rate of change (speed) over time

### Controls:
- Auto-zoom Graph Height
- Fit Selection
- Fit All Graphs
- Show Reference Value (horizontal line)
- Snap (magnetic alignment)
- Keyframe handles (tangent handles for Bezier curves)
- Separate Dimensions (for Position)
- Edit Speed/Value curves

### Operations:
- Select keyframes: click, Shift+click, marquee select
- Move keyframes: drag
- Adjust handles: drag tangent handles
- Add keyframe: Ctrl+click on curve
- Delete: select and press Delete
- Copy/Paste: standard clipboard operations

### Speed Graph Specific:
- Influence handle controls how fast transitions occur
- Zero speed = hold position
- Spike = sudden acceleration
- Smooth curve = gradual easing

---

## AE-13: Graph Editor vs Layer Bar

### Layer Bar Mode (default):
- Keyframes shown as colored icons
- Diamond (linear), Hourglass (bezier), Square (hold)
- Easy to see keyframe positions at a glance
- Limited curve control (via keyframe interpolation dialog)

### Graph Editor Mode:
- Full visual curve editing
- Handles for precise timing control
- Multiple properties visible simultaneously
- Better for fine-tuning animation

---

## AE-14: Composition Panel — Deep Dive

### Viewport Controls:
- **Magnification**: Dropdown (6.25%–16000%)
- **Title/Action Safe**: Toggle (3: title, 10: title safe, 20: action safe)
- **Rulers**: Ctrl+R
- **Guides**: Ctrl+; (toggle visibility)
- **Snap to Guides**: Ctrl+Shift+;
- **Grid**: Ctrl+’ (toggle)
- **3D View**: Active Camera, Front, Back, Left, Right, Top, Bottom, Custom View 1–3
- **View Layout**: 1-Up, 2-Up Horizontal/Vertical, 4-Up
- **Pixel Aspect Ratio Correction**: Toggle non-square pixel display
- **Fast Previews**: Off, Adaptive Resolution, Wireframe, Adaptive Resolution GPU, Draft
- **Transparency Grid**: Toggle checkerboard
- **Exposure**: HDR display control
- **Channels**: RGB, Red, Green, Blue, Alpha
- **Take Snapshot**: Ctrl+Shift+F5
- **Show Snapshot**: F5
| **Histogram**: Toggle display

### 3D View Options:
- Select view camera or layer
- Lock/unlock view
- Assign shortcut to each view
- Sync multiple views for 3D navigation

### Guides:
- Drag from rulers to create
- View > Guides > Clear Guides
- View > Guides > Lock Guides
- View > Create Guides (dialog: number, spacing, center, horizontal/vertical)

### Grid:
- Edit > Preferences > Grids & Guides
- Gridline spacing, subdivisions, color

### Region of Interest:
- Tool in Composition panel
- Draw rectangle to limit preview/render area
- Comp > Crop Comp to Region of Interest

---

## AE-15: Effects & Presets Panel

### Organization:
- **3D Channel**: 3D Channel Extract, Depth Matte, Fog 3D, ID Matte, IDentifier
- **Audio**: Backwards, Bass & Treble, Delay, Flange & Chorus, High-Low Pass, Modulator, Parametric EQ, Reverb, Stereo Mixer, Tone
- **Blur & Sharpen**: Bilateral Blur, Box Blur, Camera Lens Blur, CC Cross Blur, CC Radial Blur, CC Radial Fast Blur, CC Vector Blur, Channel Blur, Compound Blur, Directional Blur, Fast Box Blur, Gaussian Blur, Radial Blur, Reduce Interlace Flicker, Sharpen, Smart Blur, Unsharp Mask
- **Channel**: Alpha Levels, Arithmetic, Blend, Calculations, CC Composite, Channel Combiner, Channel Mixer, Compound Arithmetic, Invert, Minimax, Remove Color Matting, Set Channels, Set Matte, Shift Channels, Solid Composite
- **CINEMA 4D Effects**: CINEWARE effect
- **Color Correction**: Auto Color/Contrast/Levels, Black & White, Brightness & Contrast, Broadcast Colors, CC Color Neutralizer, CC Toner, Change Color, Change To Color, Channel Mixer, Color Balance, Color Balance (HLS), Color Link, Colorama, Curves, Equalize, Exposure, Gamma/Pedestal/Gain, Hue/Saturation, Leave Color, Levels, Lumetri Color, Photo Filter, PS Arbitrary Map, Selective Color, Shadow/Highlight, Tint, Tritone, Vibrance
- **Distort**: Bezier Warp, Bulge, CC Bend It, CC Blobbylize, CC Flo Motion, CC Griddler, CC Lens, CC Page Turn, CC Power Pin, CC Ripple Pulse, CC Slant, CC Smear, CC Split, CC Split 2, CC Tiler, Corner Pin, Displacement Map, Liquify, Magnify, Mesh Warp, Mirror, Offset, Optics Compensation, Polar Coordinates, Reshape, Ripple, Rolling Shutter Repair, Spherize, Transform, Turbulent Displace, Twirl, Ultra-warp (via mesh), Warp, Wave Warp
- **Expression Controls**: Angle Control, Checkbox Control, Color Control, Dropdown Menu Control, Layer Control, Point Control, Slider Control, 3D Point Control
- **Generate**: 4-Color Gradient, Advanced Lightning, Audio Spectrum, Audio Waveform, Beam, CC Glue Gun, CC Light Burst, CC Light Rays, CC Light Sweep, Cell Pattern, Checkerboard, Circle, Ellipse, Eyedropper Fill, Fill, Fractal Noise, Grid, Lens Flare, Paint Bucket, Radio Waves, Ramp, Scribble, Stroke, Vegas, Write-on
- **Keying**: CC Simple Wire Removal, Color Difference Key, Color Key, Color Range, Difference Matte, Extract, Inner/Outer Key, Key Cleaner, Keylight (1.4), Linear Color Key, Primatte Keyer (third-party), Simple Choker, Spill Suppressor
- **Matte**: Matte Choker, Simple Choker, Matte Cleanup
- **Noise & Grain**: Add Grain, Dust & Scratches, Fractal Noise, Match Grain, Median, Noise, Noise Alpha, Noise HLS, Noise HLS Auto, Remove Grain, Turbulent Noise
- **Obsolete**: Basic 3D, Basic Text, Color Key (old), Gaussian Blur (old), Lightning, Luma Key, Matte tools (old), Path Text, Spill Suppressor (old)
- **Perspective**: 3D Glasses, Bevel Alpha, Bevel Edges, CC Cylinder, CC Sphere, CC Star Burst, Drop Shadow, Radial Shadow
- **Simulation**: Card Dance, Caustics, CC Ball Action, CC Bubbles, CC Drizzle, CC Hair, CC Mr. Mercury, CC Particle Systems, CC Particle World, CC Pixel Polly, CC Rainfall, CC Scatterize, CC Snowfall, CC Star Burst, Foam, Particle Playground, Shatter, Wave World
- **Stylize**: Brush Strokes, Cartoon, CC Block Load, CC Burn Film, CC Glass, CC HexTile, CC Kaleida, CC Mr. Smoothie, CC Plastic, CC RepeTile, CC Threshold, CC Threshold RGB, Color Emboss, Emboss, Find Edges, Glow, Mosaic, Motion Tile, Posterize, Roughen Edges, Scatter, Strobe Light, Texturize, Tiles
- **Text**: Numbers, Timecode
- **Time**: CC Force Motion Blur, CC Time Blend, CC Wide Time, Echo, Echo Time Blend, Posterize Time, Time Difference, Time Displacement, Timewarp
- **Transform**: Auto-Orient, CC Composite, Corners to Mesh (not a standard effect), Transform
- **Transition**: Block Dissolve, Card Wipe, CC Glass Wipe, CC Grid Wipe, CC Image Wipe, CC Jaws, CC Light Wipe, CC Line-Spin, CC Radial ScaleWipe, CC Scale Wipe, CC Threshold, CC Tiler, CC Twist, Dissolve, Gradient Wipe, Iris Wipe, Linear Wipe, Radial Wipe, Venetian Blinds, Wipe
- **UML/VR**: VR Blur, VR Chromatic Aberrations, VR Color Gradients, VR Converter, VR Denoise, VR Digital Glitch, VR Flicker Reduce, VR Glow, VR Iris Blur, VR Plane to Sphere, VR Rotate Sphere, VR Sharpen, VR Sphere to Plane
- **Utility**: Apply Color LUT, Cineon Converter, Color Profile Converter, Grow Bounds, HDR Compander, HDR Highlight Effect, Profile-to-Profile

### Presets:
- **Animation Presets**: Pre-built animations (Behaviors, Expressions, Image - Utilities, Shape effects, Text, Transitions, Various)
- **Browse Presets**: Opens Bridge for visual preset browsing
- **Apply**: Select layer, double-click preset
- **Save**: Select modified effect, Animation > Save Animation Preset
- **Recent Animation Presets**: List of recently used

### Effect Operations:
- Apply: Effect > [Category] > [Effect Name] or drag from panel
- Reorder: drag effects in Timeline or Effect Controls
- Copy/Paste: Edit > Copy/Paste (select effect in Timeline)
- Remove: select effect > Delete
- Bypass: Toggle fx icon
- Solo: Show only this effect
- Reset: Reset to default parameters
- Save as Preset: Animation > Save Animation Preset
- Remove All: Layer > Remove All Effects

---

## AE-16: All Built-in Effects — Detailed Parameters (Top 50 Most Used)

### 1. Gaussian Blur (Legacy)
- Blurriness: 0–1000
- Blur Dimensions: Horizontal, Vertical, Both
- Repeat Edge Pixels: On/Off

### 2. Fast Box Blur (newer)
- Blur Radius: 0–1000
- Iterations: 1–10
- Blur Dimensions: Horizontal, Vertical, Both
- Repeat Edge Pixels: On/Off

### 3. Lumetri Color
- Basic Correction: Input LUT, White Balance (Temperature, Tint), Tone (Exposure, Contrast, Highlights, Shadows, Whites, Blacks), Saturation
- Creative: Look (LUT), Vibrance, Faded Film, Saturation
- Curves: RGB curves, Hue vs Saturation, Hue vs Hue, Hue vs Luma, Luma vs Saturation, Sat vs Sat
- Color Wheels: Shadow, Midtone, Highlight, Master (color balance and brightness)
- HSL Secondary: Key selection by Hue, Saturation, Luma ranges + adjustments
- Vignette: Amount, Midpoint, Roundness, Feather
- Color Wheels & Master

### 4. Levels
- Channel: RGB, Red, Green, Blue, Alpha
- Input Black/White: 0–255 (8-bit) or 0–32768 (16-bit) or 0–1.0 (32-bit)
- Gamma: 0.01–10.0
- Output Black/White: 0–255
- Histogram display

### 5. Curves
- Channel: RGB, Red, Green, Blue, Alpha
- Curve editor: add/move/delete points
- Eyedropper: black point, gray point, white point
- Draw: freehand curve drawing
- Smooth: smooth drawn curve

### 6. Hue/Saturation
- Channel Range: Master, Reds, Yellows, Greens, Cyans, Blues, Magentas
- Hue: -180° to +180°
- Saturation: -100 to +100
- Lightness: -100 to +100
- Colorize: On/Off
- Colorize Hue: 0–360°
- Colorize Saturation: 0–100
- Colorize Lightness: 0–100

### 7. Brightness & Contrast
- Brightness: -100 to +100
- Contrast: -100 to +100
- Use Legacy: Off/On (pre-CS6 behavior)

### 8. Tint
- Map Black To: color
- Map White To: color
- Amount to Tint: 0–100%

### 9. Tritone
- Highlights: color
- Midtones: color
- Shadows: color
- Blend with Original: 0–100%

### 10. Exposure
- Master: exposure value
- Individual: Red, Green, Blue exposure
- Offset: additive offset
- Gamma Correction: 0.01–10.0
- Use Linear Light: toggle

### 11. Color Balance
- Shadow/Midtone/Highlight Red-Green-Blue: -100 to +100 each
- Preserve Luminosity: On/Off

### 12. Colorama
- Input Phase: Get Phase From (Red, Green, Blue, etc.)
- Output Cycle: Use Preset Palette or custom
- Modify: Select and Modify parameters
- Pixel Selection: Matching Color, Matching Tolerance, Matching Softness
- Mask: Layer, Invert
- Blend With Original: 0–100%

### 13. Curves (same as #5)

### 14. Drop Shadow
- Opacity: 0–100%
- Direction: 0–360°
- Distance: 0–1000
- Softness: 0–1000

### 15. Bevel Alpha
- Edge Thickness: 0–100
- Light Intensity: 0–10

### 16. Bevel Edges
- Edge Thickness: 0–100
- Light Intensity: 0–10
- Surface Angle: 0–360°

### 17. Glow
- Glow Threshold: 0–100%
- Glow Radius: 0–1000
- Glow Intensity: 0–10
- Glow Colors: A/B Colors, A & B, Original Colors
- Color A/B: color pickers
- Color Looping: Sawtooth, Triangle
- Color Loops: 1–10
- Glow Dimensions: Horizontal, Vertical, Both

### 18. Fractal Noise
- Fractal Type: Basic, Turbulent Basic, Dynamic, Dynamic Twist, Max, Smeary, Smooth, Strings, Threads, Rocky
- Noise Type: Block, Linear, Soft Linear, Spline, Subtle, Hair
- Invert: On/Off
- Contrast: 0–500
- Brightness: -100 to +100
- Uniformity: 0–1
- Complexity: 1–10
- Sub Settings: Sub Influence, Sub Scaling, Sub Evolution, Sub Offset
- Transform: Rotation, Scale, Scale Width, Offset Turbulence, Complexity, Perspective Offset
- Evolution: 0–∞
- Evolution Options: Cycle Evolution, Cycle (revolutions)
- Opacity: 0–100%
- Blending Mode: Normal, Add, Multiply, Screen, Overlay, etc.

### 19. Camera Lens Blur
- Blur Radius: 0–50
- Shape: Hexagon, Pentagon, Octagon, etc.
- Sides: 3–10
- Curvature: 0–100
- Rotation: 0–360°
- Brightness: -1 to 1
- Saturation: -1 to 1
- Noise: Uniform/Gaussian, Amount 0–1
- Highlight: Brightness, Threshold
- Source: None/Alpha/Channel
- Blur Map: Layer, Channel, Blur Radius, Scale

### 20. CC Particle World
- Grid & Guides: Show, Expire, Floor
- Birth/Death Rate: 0–100
- Particle Type: Line, Star, Faded Sphere, etc.
- Birth Size / Death Size: 0–10
- Size Variation: 0–100%
- Max Opacity: 0–100%
- Birth/Death Color
- Physics: Animation (Explosive, Vortex, etc.), Velocity, Gravity, Resistance, Mass, etc.
- Producer: Position X/Y/Z, Radius X/Y/Z

### 21. Shatter
- View: Rendered, Wireframe, Layers
- Shape: Pattern (Bricks, Hexagon, etc.), Custom Shatter Map, Repetition, Direction, Depth
- Force 1/2: Position, Depth, Radius, Strength
- Physics: Rotation, Tumble, Viscosity, Mass, Gravity
- Textures: Front/Back/Side
- Lighting: Light type, intensity, color
- Camera System: Comp Camera, Camera 1/2/3
- Materials: Ambient, Diffuse, Specular, Reflection

### 22. Keylight (1.4)
- View: Source, Source Alpha, Status, etc.
- Screen Colour: eyedropper
- Screen Gain: 0–300
- Screen Balance: 0–100
- Screen Pre-blur: 0–10
- Clip Black: 0–100
- Clip White: 0–100
- Screen Matte: Black Clip, White Clip, Shrink/Grow, Softness, Contrast, Edge Color/Thickness
- Inside/Outside Mask
- Foreground Colour Correction
- Source Cancellation
- Alpha Bias, Fringe Colour Suppression, Edge Colour Suppression

### 23. Color Key
- Key Colour: eyedropper
- Color Tolerance: 0–100
- Edge Thin: -5 to 5
- Edge Feather: 0–100

### 24. Color Difference Key
- View: A (Matte), B (Matte), Alpha
- Key Colour: eyedropper
- Color A/B Y, Cb, Cr: Matte controls
- Black Matte/A/B: clip, gamma, gain
- White Matte/A/B: clip, gamma, gain

### 25. Inner/Outer Key
- Inner/Outer Layer selection
- Edge Feather: 0–200
- Edge Thin: -5 to 5
- Edge Threshold: 0–100
- Invert Extraction: On/Off
- Blend with Original: 0–100%

### 26. Simple Choker
- Choke Matte: -100 to 100

### 27. Matte Choker
- Geometric Softness: 0–100
- Gray Level Softness: 0–1
- Repeat Edge Pixels: On/Off

### 28. 3D Glasses
- Left/Right View: Layer selection
- Left/Right View Method
- Swap Left-Right
- 3D View: various stereo methods
- Balance: 0–100

### 29. Radial Blur
- Amount: 0–100
- Center: X, Y
- Type: Spin / Zoom
- Antialiasing: Low / High

### 30. Directional Blur
- Direction: 0–360°
- Blur Length: 0–500

### 31. Echo
- Echo Time (seconds): -2.0 to 2.0
- Number of Echoes: 1–200
- Echo Operator: Maximum, Minimum, Add, Screen, Composite In Back, Composite In Front

### 32. Time Displacement
- Time Displacement Layer: layer selection
- Max Displacement Time: -60 to 60 seconds
- Time Resolution: 1–60

### 33. Posterize
- Level: 2–255

### 34. Mosaic
- Horizontal Blocks: 1–500
- Vertical Blocks: 1–500
- Sharp Colors: On/Off

### 35. Turbulent Displace
- Displacement: Twist, Turbulent, Turbulent Smoother, Bulge, etc.
- Amount: -500 to 500
- Size: 1–500
- Complexity: 1–10
- Offset: X, Y
- Evolution: 0–∞
- Evolution Options
- Pin: Unpinned Edges, All Edges, Top, Right, Bottom, Left, Top Right, etc.
- Oversize Behavior: Wrap, Smooth

### 36. Wave Warp
- Wave Type: Sine, Square, Triangle, Sawtooth, etc.
- Wave Height: 0–200
- Wave Width: 1–500
- Direction: 0–360°
- Wave Speed: -200 to 200
- Phase: 0–360°
- Antialiasing: Low / Medium / High
- Pinning: Unpinned Edges, All Edges, etc.

### 37. Mirror
- Reflection Center: X, Y
- Reflection Angle: 0–360°

### 38. Offset
- Shift Center To: X, Y
| Pixel Blending: Wrap, Tile

### 39. Spherize
- Radius: 0–1000
- Center: X, Y
- Mode: Normal, Limit to Sphere

### 40. Ripple
- Radius: 0–1000
| Center: X, Y
| Type: Asymmetric / Symmetric
| Wave Amplitude: 0–200
| Wave Speed: -100 to 100
| Wave Width: 1–500
| Antialiasing: Low / High

### 41. Polar Coordinates
| Type: Rect to Polar / Polar to Rect
| Interpolation: 0–100%

### 42. Optical Compensation
| Field Of View: 0–160
| Reverse Lens Distortion: On/Off
| Optimal Pixels: On/Off
| View Center: X, Y

### 43. Transform (Effect)
| Anchor Point: X, Y
| Position: X, Y
| Scale Width/Height: 0–2000%
| Skew: -80 to 80
| Skew Axis: 0–360°
| Rotation: 0–360°
| Opacity: 0–100%
| Use Composition's Shutter Angle
| Shutter Angle: 0–720°
| Sampling: Nearest Neighbor, Bilinear, Bicubic

### 44. Noise
| Amount: 0–500
| Noise Type: Uniform / Gaussian
| Clipping: On/Off

### 45. Add Grain
| Preset: many film stock presets
| Viewing Mode: Preview/Blended
| Tweaking: Intensity, Size, Softness, etc.
| Shadow/Highlight/Midtone: Saturation, Size, Size Variation
| Color: color tint
| Animation: Animated, Animation Speed
| Blend With Original: 0–100%

### 46. Match Grain
| Same as Add Grain but with source sampling for grain matching

### 47. Remove Grain
| Viewing Mode: Preview/Blended/Final
| Noise Reduction Settings: Noise Reduction, Passes
| Fine Tuning: various controls
| Temporal Filtering
| Unsharp Mask
| Sampling: Sample Selection

### 48. Posterize Time
| Frame Rate: 1–99

### 49. Exposure (same as #11)

### 50. Channel Mixer
| Red/Green/Blue/Const for each output channel
| Monochrome: creates grayscale

---

## AE-17: Masking — Complete

### Creating Masks:
- **Rectangle Tool** (Q): Draw rectangular mask
- **Ellipse Tool** (Q cycle): Draw elliptical mask
- **Pen Tool** (G): Draw custom Bezier mask
- **Auto-trace**: Layer > Auto-trace (creates mask from alpha/brightness)

### Mask Properties:
- **Mask Path**: Bezier path with vertices and tangent handles
- **Mask Feather**: Per-point feather (inward)
  - Global feather: uniform feather all points
  - Per-point feather: individual feather per vertex
- **Mask Opacity**: 0–100% (transparency of mask)
- **Mask Expansion**: Pixels to expand (+) or contract (-) mask edge

### Mask Modes:
| Mode | Function |
|---|---|
| None | No mask effect |
| Add | Add to alpha (default) |
| Subtract | Subtract from alpha |
| Intersect | Keep only overlapping area |
| Lighten | Lighter of current and mask alpha |
| Darken | Darker of current and mask alpha |
| Difference | XOR of current and mask alpha |

### Mask Interpolation:
- Spatial: Linear or Bezier
- Temporal: Linear or Bezier (when keyframing mask paths)
- Mask Interpolation panel for automated interpolation

### Mask Shortcuts:
- **M**: Reveal mask property (press again for all mask properties)
- **MM**: Show all mask properties
- **Ctrl+Shift+I**: Invert mask
- **F**: Mask Feather
- **TT**: Mask Opacity
- **MM**: All mask properties

### Multiple Masks:
- Multiple masks on one layer
- Interact based on modes (per mask)
- Render order: top to bottom in stack

### Mask Tracking:
- Mask path can be tracked using the Tracker
- Or keyframed manually

### Mask Feather Per-Point:
- Each vertex can have independent feather amount
- Drag feather handle on each point
- Creates varying feather around mask edge

---

## AE-18: Track Mattes

### Types:
| Matte Type | Function |
|---|---|
| Alpha Matte | Uses matte layer's alpha channel |
| Alpha Inverted Matte | Uses inverted alpha |
| Luma Matte | Uses matte layer's luminance |
| Luma Inverted Matte | Uses inverted luminance |

### Setup:
1. Matte layer sits directly above the fill layer in the timeline
2. Fill layer's Track Matte dropdown set to desired type
3. Matte layer can be hidden (video toggle off) after setup

### Track Matte Column:
- Toggle via Timeline panel menu > Columns > Track Matte
- Dropdown per layer: None, Alpha Matte, Alpha Inverted Matte, Luma Matte, Luma Inverted Matte

### Notes:
- Only works with the layer immediately above
- Can use shape layers, text, adjustment layers, footage as matte
- Animated mattes create animated reveals
- Can pre-compose for complex matte setups

---

## AE-19: Parenting & Linking

### Parenting:
- Assign parent via dropdown or pick whip
- Child inherits: Position, Scale, Rotation from parent
- Multiple levels of parenting (grandparent chains)
- Parent column in Timeline (toggle via Timeline menu)

### Pick Whip:
- Drag from child's Parent pick whip to parent layer
- Visual connection indicator

### Link via Expressions:
- Pick whip from any property to any other property
- Creates JavaScript expression linking values
- More flexible than parenting (any property, not just transform)

### Parenting vs Expressions:
| Feature | Parenting | Expressions |
|---|---|---|
| Scope | Transform only | Any property |
| Complexity | Simple | Can be complex |
| Inheritance | Full transform chain | Single property link |
| Offset | Automatic | Manual offset calculation |

---

## AE-20: 3D Layers & Compositing

### Enabling 3D:
- Click 3D toggle (cube icon) on layer switch
- Layer gains Z-axis for Position and separate X/Y/Z Rotation
- Responds to lights and cameras
- Material Options become available

### 3D Layer Types:
- **2D Layer in 3D Space**: Position Z, but no 3D properties
- **3D Layer**: Full 3D transform, responds to lights/cameras
- **Pre-compose Collapse**: Passes 3D properties through pre-comp
- **Shape Layer in 3D**: Vector + 3D positioning

### Camera:
- **1-Node Camera**: Position + Point of Interest
- **2-Node Camera**: Position + auto-created point of interest
- **Presets**: 15mm, 20mm, 24mm, 35mm, 50mm, 80mm, 135mm, 200mm
- **Properties**:
  - Point of Interest: X, Y, Z
  - Position: X, Y, Z
  - Zoom: pixels
  - Depth of Field: On/Off
  - Focus Distance: 0–10000
  - Aperture: 0–1000
  - F-Stop: 0.1–128
  - Blur Level: 0–100%
- **Depth of Field**: Creates realistic camera blur based on distance

### Lights:
- **Parallel**: Directional light, infinite distance (like sunlight)
- **Spot**: Directional with cone, casts shadows
- **Point**: Omnidirectional, casts shadows
- **Ambient**: Global fill light, no direction
- **Properties**:
  - Intensity: 0–300%
  - Color
  - Cone Angle: 1–179°
  - Cone Feather: 0–100%
  - Casts Shadows: On/Off
  - Shadow Darkness: 0–100%
  - Shadow Diffusion: 0–1000

### Material Options (3D Layers):
- Casts Shadows: On/Off
- Light Transmission: 0–100%
- Accepts Shadows: On/Off
- Accepts Lights: On/Off
- Ambient: 0–100%
- Diffuse: 0–100%
- Specular Intensity: 0–100%
- Specular Shininess: 2–100%
- Metal: 0–100%
- Reflection Intensity: 0–100%
- Reflection Sharpness: 0–100%
- Reflection Rolloff: 0–100%
- Transparency: 0–100%
- Index of Refraction: 1.0–2.0

### 3D Renderers:
- **Classic 3D**: Standard renderer (default)
- **Advanced 3D** (formerly Cinema 4D renderer): Better text extrusion, continuous rasterization of shape layers in 3D
- Switch: Composition Settings > Advanced > Rendering Plug-in

### 3D Compositing Tips:
- Enable Collapse Transformations for pre-comps in 3D
- Use Adjustment Layers in 3D space for selective effects
- Null objects as camera/orientation targets
- Multiple cameras for different setups

---

## AE-21: Expressions

### Basics:
- JavaScript-based expression language
- Attached to individual properties
- Access current time, value, other properties, other layers
- Enable: Alt+click stopwatch icon
- Expression field appears in Timeline (pink text)

### Common Expressions:

**Loop Out:**
```javascript
loopOut("cycle", 0);  // Loops keyframes infinitely
// Types: "cycle", "pingpong", "offset", "continue"
```

**Wiggle:**
```javascript
wiggle(freq, amp);  // wiggles position
// wiggle(2, 50) = 2 wiggles/sec, 50px amplitude
```

**Time:**
```javascript
time * 100;  // Value increases with time
value + time * 50;  // Current value + time-based offset
```

**Random:**
```javascript
random(min, max);  // Random number
seedRandom(5, true);  // Fixed random seed
```

**Layer References:**
```javascript
thisComp.layer("Null 1").transform.position;
thisLayer.index;
comp("Other Composition").layer("Shape 1").opacity;
```

**Property References:**
```javascript
value;  // Current property value
effect("Slider Control")("Slider");
transform.position[0];  // X component
```

**Math:**
```javascript
Math.sin(time * 2) * 100;
Math.cos(time * 2) * 100;
Math.PI;
linear(t, tMin, tMax, value1, value2);  // Map range
clamp(value, min, max);
```

**Index:**
```javascript
index;  // Layer index number
// Used for stacking offsets: (index - 1) * 50
```

**If/Else:**
```javascript
if (time < 2) {
  0
} else {
  100
}
```

**Expression Controls:**
- Slider Control: effect("Slider")("Slider")
- Point Control: effect("Point")("Point")
- Checkbox Control: effect("Checkbox")("Checkbox")
- Color Control: effect("Color")("Color")
- Angle Control: effect("Angle")("Angle")
- Dropdown Menu Control: effect("Dropdown")("Menu")
- 3D Point Control

### Expression Engine:
- Legacy: original expression engine
- JavaScript: modern engine (recommended)
- Switch: File > Project Settings > Expressions > Engine

---

## AE-22: Keyframe Animation — Advanced

### Keyframe Types:
- Linear: straight interpolation
- Bezier: curved interpolation with handles
- Auto Bezier: automatic smooth curve
- Hold: value jumps at keyframe
- Rove Across Time: keyframes auto-distribute timing

### Keyframe Velocity:
- Ctrl+Shift+K or right-click > Keyframe Velocity
- Incoming/Outgoing Speed
- Influence (temporal bezier handle size)
- Continuous/Independent toggle

### Spatial Interpolation:
- Linear: straight path
- Bezier: curved path with handles
- Auto Bezier: automatic curve
- Continuous Bezier: tangent handles are continuous

### Speed Graph:
- Shows speed (pixels/second) over time
- Zero = hold
- Peak = maximum speed
- Smooth curve = gradual acceleration/deceleration

### Value Graph:
- Shows actual values over time
- Cross-dimensional interpolation for Position

### Separate Dimensions:
- Right-click Position > Separate Dimensions
- X, Y (, Z) become individual properties
- Each can have independent keyframes and curves
- Enables different easing on X vs Y axis

### Keyframe Shortcuts:
- **J**: Previous keyframe
- **K**: Next keyframe
- **U**: Show all animated properties (properties with keyframes)
- **UU**: Show all modified properties
- **F9**: Easy Ease
- **Shift+F9**: Easy Ease In
- **Ctrl+Shift+F9**: Easy Ease Out
- **Ctrl+Alt+K**: Keyframe Velocity
- **Ctrl+click**: Add keyframe in Graph Editor

### Multi-Property Animation:
- Animate multiple properties simultaneously
- Layer markers for timing reference
- Pre-compose for grouped animation

---

## AE-23: Text Animation

### Creating Text:
- Horizontal Type Tool (T or Ctrl+T)
- Vertical Type Tool (T cycle)
- Point text (click) or Paragraph/area text (drag box)

### Text Properties:
- Source Text: editable text content + character-level formatting
- Path Options: path, margins, alignment
- Text Animators

### Text Animator System:
1. Add Animator: Animate > [Property] (Position, Scale, Rotation, Opacity, etc.)
2. Animator appears with Range Selector
3. Adjust Start/End/Offset to control which characters are affected
4. Multiple animators per text layer
5. Multiple range selectors per animator

### Animator Properties:
- Position offset
- Scale
- Rotation (or X/Y/Z Rotation)
- Opacity
- Fill Color (RGB)
- Fill Opacity
- Stroke Color
- Stroke Opacity
- Stroke Width
- Tracking
- Line Anchor
- Blur
- Character Offset
- Character Value
- Line Offset
- Word Offset

### Range Selector:
- Start: 0–100%
- End: 0–100%
- Offset: -100% to 200%
- Units: Percentage, Index
- Based On: Characters, Characters Excluding Spaces, Words, Lines
- Mode: Add, Subtract, Intersect, Min, Max, Difference
- Advanced:
  - Shape: Square, Ramp Up, Ramp Down, Triangle, Round, Smooth
  - Smoothness: 0–100%
  - Ease High/Low: 0–100%
  - Randomize Order: On/Off
  - Random Seed: 0–10000

### Text Animator Shortcuts:
- Animate menu in Timeline
- Add multiple animators for complex effects
- Pre-compose text for additional effects

### Text Animation Presets:
- Browse via Effects & Presets > Animation Presets > Text
- Categories: 3D Text, Animate In, Animate Out, Curves and Spins, Organic, etc.

---

## AE-24: Shape Layers

### Creating Shapes:
- Shape tools (Q cycle): Rectangle, Rounded Rectangle, Ellipse, Polygon, Star
- Pen tool (G): Custom shape paths
- Double-click shape tool: creates shape filling comp

### Shape Layer Structure:
- Layer
  - Contents (Shape Group 1)
    - Path (Rectangle/Ellipse/etc.)
    - Fill (color)
    - Stroke (color, width)
    - Transform (within group)
  - Contents (Shape Group 2)
    - ...
  - Transform (layer-level)

### Shape Properties:
- **Path**: Rectangle (size, roundness), Ellipse (size), Polygon (points, roundness, radius), Star (points, inner/outer radius, inner/outer roundness), Custom Path
- **Fill**: Color, opacity, fill rule (Non-Zero, Even Odd)
- **Stroke**: Color, opacity, stroke width, line cap, line join, miter limit, dashes, offset
- **Transform per Group**: Position, Anchor Point, Scale, Rotation, Opacity

### Shape Modifiers:
- **Merge Paths**: Combine/intersect/subtract shapes within group
- **Offset Path**: Expand/contract path
- **Pucker & Bloat**: Inward/outward distortion
- **Round Corners**: Round sharp corners
- **Trim Paths**: Animate start/end/offset of path (line drawing effects)
- **Twist**: Twist shape around center
- **Wiggle Transform**: Randomize transform properties
- **Wiggle Paths**: Randomize path vertices
- **Zig Zag**: Convert straight lines to zig-zag

### Shape Layer Animation:
- Animate any property with keyframes
- Trim Paths: start 0→100% for line drawing animation
- Wiggle Transform: procedural motion
- Repeater: duplicate shapes with offset transforms (create patterns)

---

## AE-25: Pre-composition

### Methods:
- Select layers > Ctrl+Shift+C
- Move All Attributes: all keyframes/effects/transforms move into new comp
- Leave All Attributes: transforms stay on new comp layer

### Use Cases:
- Group related layers for organizational clarity
- Apply effects to multiple layers as a unit
- Nest compositions for complex projects
- Enable collapse transformations for 3D pass-through

### Collapse Transformations:
- Toggle on pre-comp layer (sun/collapse icon)
- Renders pre-comp layers as if directly in parent comp
- Maintains continuous rasterization (sharp vectors)
- Passes 3D camera and lights through
- Enables blending modes to interact with layers inside pre-comp

---

## AE-26: Rendering & Output

### Render Queue:
- Add to Render Queue: Ctrl+Shift+/
- Render Queue panel shows: Render Settings, Output Module, Output To

### Render Settings:
- Best Settings / Current Settings / Draft Settings / Custom
- Quality: Best, Draft, Wireframe
- Resolution: Full, Half, Third, Quarter, Custom
- Frame Rate: Use comp or custom
- Proxy Use: Use All Proxies, Use Comp Proxies Only, Use No Proxies
- Effects: Use All, Use No
- Frame Blending: On for Checked Layers, On for All, Off
- Field Render: Off, Upper First, Lower First
- 3:2 Pulldown: various options
- Motion Blur: On for Checked Layers, On for All, Off
- Time Span: Length of Comp, Work Area, Custom
- Use Storage Overflow: On/Off

### Output Module:
- Format: AVI, MOV, PNG Sequence, JPEG Sequence, TIFF Sequence, WAV, etc.
- Post-Render Action: Import, Import & Play, Set Proxy, None
- Channels: RGB, Alpha, RGB + Alpha
- Color Depth: 8, 16, 32 (format dependent)
- Audio Output: On/Off, 44.1/48/96 kHz, 16-bit
- Resize: custom dimensions
- Crop: custom crop region
- Color Profile: assign output profile

### Adobe Media Encoder (Ctrl+Alt+M):
- Sends composition to AME for encoding
- AME continues rendering while AE is free
- Supports H.264, H.265, ProRes, DNxHR, GIF, etc.
- Queue multiple compositions
- Watch folders for automated encoding

### Output Module Templates:
- Save common output configurations
- Example: "YouTube 1080p", "ProRes 422 HQ", "PNG Sequence + Alpha"

### Render Settings Templates:
- Save common render configurations
- Example: "Final Best", "Draft Preview", "Multi-Machine"

### Multi-Machine Rendering:
- Shared project file on network
- Each machine renders different frames
- Collect Files first for portability

---

## AE-27: Tracking & Stabilization

### Point Tracking:
- Track panel: Track Motion / Stabilize Motion
- Feature region + Search region + Attach point
- Channel: RGB, Saturation, Luminance
- Process Before Matching: blur/sharpen
- Sub-pixel Matching: higher accuracy
- Adapt Feature: update feature on every frame

### Track Types:
- **Transform**: Position, Rotation, Scale
- **Parallel Corner Pin**: Position, Rotation, Scale (no perspective)
- **Perspective Corner Pin**: Full perspective transform

### Stabilization:
- Stabilize Motion in Tracker panel
- Tracks motion and applies inverse to stabilize
- Auto-delete tracking points with bad data
- Smoothness: 0–1000
- Method: Position, Position/Scale, Position/Rotation/Scale, Subspace Warp

### Mocha AE (Bundled):
- Planar tracking (tracks surfaces, not just points)
- Launch: Animation > Track in Mocha AE
- Separate interface
- Tracks: translation, rotation, scale, perspective
- Export tracking data to AE layers
- Corner Pin or Transform data export
- Essential for screen replacements, sign tracking, object removal

### Camera Tracker:
- Effect > Perspective > 3D Camera Tracker
- Analyzes footage to extract camera motion
- Creates 3D null points in scene
- Can attach 3D text, objects to tracked scene
- Shot Type: Variable Zoom, Fixed Angle, Specify Angle
- Advanced: keyframe features, solve method

### Warp Stabilizer:
- Effect > Distort > Warp Stabilizer
- Stabilization Method: Position, Position/Scale, Perspective, Subspace Warp
- Framing: Stabilize/Crop/Auto-scale, Stabilize/Synthesize Edges
- Smoothness: 0–100%
- Auto-delete tracking points
- Detailed analysis for complex motion

---

## AE-28: Rotoscoping

### Roto Brush Tool:
- Draw strokes on subject in first frame
- AI propagates selection through frames
- Refine with additional strokes
- Freeze: lock propagation
- View modes: Overlay, Onion Skin, Black/White Alpha, etc.

### Refine Edge:
- Enable for hair/fur/semi-transparent edges
- Draw strokes on edges
- Better handling of complex boundaries
- Separate from Roto Brush

### Roto Brush 3.0:
- Improved AI-based propagation
- Better edge detection
- Consistent masks across frames

### Roto Brush & Refine Edge Panel:
- Freeze button (locks processing)
- View modes
- Quality settings
- Edge detection parameters

### Traditional Rotoscoping:
- Manual mask keyframing
- Mocha AE for planar-based roto
- Mask interpolation for smooth transitions

---

## AE-29: Paint & Clone

### Paint Panel:
- Duration: Single Frame, Custom, Write On
- Channels: RGBA, RGB, Alpha

### Brush Tool (Ctrl+B):
- Diameter, Hardness, Roundness, Angle
- Opacity, Flow, Color
- Blending modes for paint strokes
- Write On: animate paint stroke appearing over time

### Clone Stamp:
- Alt+click to set source point
- Aligned/Unaligned
- Source time: Current Frame, First Frame, Custom
- Source layer

### Eraser:
- Erases paint strokes
- Same diameter/hardness controls

### Paint Keyframes:
- Paint strokes exist at specific frames
- Duration controls how long they persist
- Write On mode animates stroke reveal

---

## AE-30: Keying

### Keylight (1.4) — Primary Keyer:
1. Apply Keylight to footage
2. Use eyedropper to select screen color (green/blue)
3. View > Screen Matte to check matte quality
4. Clip Black: raise to remove background noise
5. Clip White: lower to fill holes in subject
6. Screen Matte > Shrink/Grow: refine edge
7. Screen Matte > Softness: edge softness
8. Screen Pre-blur: soften source before keying
9. Edge Color Correction: remove spill from edges
10. Core Matte: separate pass for solid areas

### Color Key:
- Simple keyer for uniform backgrounds
- Key Color, Color Tolerance, Edge Thin, Edge Feather

### Color Range:
- Select color range in Lab, YUV, or RGB
- Fuzziness control for tolerance

### Difference Matte:
- Compares subject to clean background plate
- Difference creates matte

### Color Difference Key:
- Traditional film keying method
- Separate matte controls for A and B channels

### Inner/Outer Key:
- Define inner and outer boundaries
- Best for complex edges (hair)

### Key Cleaner:
- Post-processing for cleaned mattes
- Remove matting artifacts, edge refinement

### Spill Suppressor:
- Removes color spill (green/blue tinting)
- Applied after keyer
- Method: Standard, Ultra

### Compositing Workflow:
1. Shoot with green/blue screen, evenly lit
2. Apply keyer (Keylight preferred)
3. Refine matte (Clip Black/White, Shrink/Grow, Softness)
4. Add Spill Suppressor
5. Color match foreground to background
6. Add grain matching (Match Grain)
7. Add light wrap (via effect or manual)
8. Final color grade

---

## AE-31: Color Correction Workflow

### Order of Operations:
1. **Primary Correction**: Exposure, white balance, contrast
2. **Secondary Correction**: Isolate and adjust specific colors
3. **Creative Grade**: Look/style (LUTs, color shifts)
4. **Output**: Match to delivery format

### Tools:
- Lumetri Color (comprehensive)
- Curves (precise control)
- Levels (quick adjustments)
- Hue/Saturation (color-specific)
- Color Balance (shadow/mid/highlight)
- Colorama (creative effects)
- Photo Filter
- Tint / Tritone / Tritone
- Exposure (HDR)
- Vibrance
- Selective Color
- Channel Mixer

### Scopes:
- Histogram: tonal distribution
- RGB parade: channel levels
- Vectorscope: color hue and saturation
- Available in Lumetri panel and external monitors

---

## AE-32: Puppet Tool

### Puppet Types:
- **Puppet Pin**: Position deformation (default)
- **Advanced Pin**: Position + Scale per pin
- **Overlap Pin**: Controls overlap ordering + depth
- **Starch Pin**: Stiffens area around pin

### Workflow:
1. Select Puppet tool (Ctrl+P)
2. Click on layer to add pins
3. Triangulation mesh is created
4. Animate pin positions over time
5. Expansion: expand/contract mesh
6. Triangle Size: mesh density
7. Record speed during playback (real-time puppeting)

### Puppet Options:
- Expansion: -100 to 100
- Triangles: 50–3000 (mesh density)
- Show: Mesh (display triangulation)

### Puppet Overlap:
- Defines which part of mesh is in front
- In Front/Behind determines layering
- Extent: area affected by overlap pin

### Puppet Starch:
- Makes areas rigid
- Extent controls area of stiffness

---

## AE-33: Content-Aware Fill for Video

### Workflow:
1. Create mask around object to remove
2. Track mask if object moves
3. Effect > Generate > Content-Aware Fill
4. Select Fill Method: Object, Surface, Edge Blend
5. Choose Fill Target: Current Layer, Other Layer, Alpha
6. Generate Fill Layer

### Fill Methods:
- **Object**: Best for moving objects (analyzes background)
- **Surface**: Best for flat/textured backgrounds
- **Edge Blend**: Best for simple backgrounds

### Properties:
- Fill Target: layer/channel
- Alpha Expansion: 0–100
- Fill Method
- Range: Work Area or Custom

---

## AE-34: Cineware (Cinema 4D Integration)

### Setup:
- Import .c4d file directly
- Or create via File > New > MAXON CINEMA 4D File
- Cineware effect applied automatically

### Cineware Properties:
- Renderer: Standard, Final, Current
- Camera: Comp Camera, C4D Camera
- Multi-Pass: Ambient, Diffuse, Shadow, Specular, etc.
- Render Settings: anti-aliasing, quality

### Features:
- Live link to C4D file
- Camera synchronization
- Multi-pass compositing
- 3D object integration in AE 3D space

---

## AE-35: Motion Graphics Templates (MOGRTs)

### Creating in After Effects:
1. Create composition with essential properties
2. Essential Graphics panel (Window > Essential Graphics)
3. Drag properties to panel: sliders, colors, text, checkboxes
4. Add Media Replacement for replaceable footage/images
5. Export: File > Export > Motion Graphics Template
6. Options: editable text, transform, style

### Using in Premiere Pro:
- Import .mogrt file into Premiere Pro
- Edit properties in Essential Graphics panel
- Dynamic Link updates automatically

### Essential Graphics Panel:
- Master Properties for template controls
- Grouping, reordering
- Poster image
- Responsive Design - Time (intro/outro protected ranges)

---

## AE-36: Dynamic Link

### With Premiere Pro:
- Import AE comp into Premiere timeline (live)
- Edit in After Effects, updates appear in Premiere
- Replace with After Effects Composition
- Send clips from Premiere to AE for effects

### With Audition:
- Send audio clip to Audition for editing
- Return to AE after processing

### With Media Encoder:
- Send comp to AME for encoding
- Multiple formats simultaneously
- AME renders while AE is free

---

## AE-37: Scripting & Automation

### ExtendScript (JSX):
- JavaScript-based scripting language for Adobe apps
- Automate repetitive tasks
- Batch process compositions
- Create tools and panels

### CEP (Common Extensibility Platform):
- HTML/CSS/JS panels
- Build custom UI panels for AE
- Distribute via Adobe Add-ons

### UXP (Unified Extensibility Platform):
- Newer plugin framework
- Better security, performance
- Cross-app compatibility

### Useful Script Functions:
- app.project: access project
- app.project.activeItem: current comp
- app.project.activeItem.selectedLayers: selected layers
- layer.property("Position"): access properties
- keyframes, expressions, effects manipulation

### ScriptUI:
- Create dialog boxes, panels, buttons
- Script Editor: Edit > Preferences > Scripting

### Expression vs Scripting:
- Expressions: per-property, evaluated per-frame, real-time
- Scripts: one-time execution, batch operations, UI tools

---

## AE-38: Keyboard Shortcuts — Complete Reference

### File Operations:
| Action | Shortcut |
|---|---|
| New Project | Ctrl+Alt+N |
| Open Project | Ctrl+O |
| Browse in Bridge | Ctrl+Alt+Shift+O |
| Save | Ctrl+S |
| Save As | Ctrl+Shift+S |
| Increment & Save | Ctrl+Alt+Shift+S |
| Import File | Ctrl+I |
| Import Multiple | Ctrl+Alt+I |
| Render Queue | Ctrl+Shift+/ |
| Media Encoder | Ctrl+Alt+M |
| Close | Ctrl+W |
| Close Project | Ctrl+Shift+W |

### Edit Operations:
| Action | Shortcut |
|---|---|
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |
| Cut | Ctrl+X |
| Copy | Ctrl+C |
| Paste | Ctrl+V |
| Duplicate | Ctrl+D |
| Select All | Ctrl+A |
| Deselect All | F2 |
| Find | Ctrl+F |
| Keyboard Shortcuts | Ctrl+Alt+Shift+K |
| Preferences | Ctrl+Alt+; |

### Composition:
| Action | Shortcut |
|---|---|
| New Comp | Ctrl+N |
| Comp Settings | Ctrl+K |
| Trim to Work Area | — |
| Save Frame as File | Ctrl+Alt+S |
| Save Frame as PSD | Ctrl+Alt+Shift+S |
| Pre-compose | Ctrl+Shift+C |

### Layer Operations:
| Action | Shortcut |
|---|---|
| New Solid | Ctrl+Y |
| New Null | Ctrl+Alt+Shift+Y |
| New Adj Layer | Ctrl+Alt+Y |
| New Camera | Ctrl+Alt+Shift+C |
| New Light | Ctrl+Alt+Shift+L |
| New Text | Ctrl+Alt+Shift+T |
| Split Layer | Ctrl+Shift+D |
| Set In Point | [ |
| Set Out Point | ] |
| Move In to CTI | Alt+[ |
| Move Out to CTI | Alt+] |
| Bring to Front | Ctrl+Shift+] |
| Bring Forward | Ctrl+] |
| Send Backward | Ctrl+[ |
| Send to Back | Ctrl+Shift+[ |
| Toggle 3D | F4 (custom) |

### Timeline Navigation:
| Action | Shortcut |
|---|---|
| Go to In | Home |
| Go to End | End |
| Previous Frame | PgUp |
| Next Frame | PgDn |
| Jump 10 Frames Back | Shift+PgUp |
| Jump 10 Frames Forward | Shift+PgDn |
| Go to Time | Alt+Shift+J |
| Previous Keyframe | J |
| Next Keyframe | K |
| Show Animated Props | U |
| Show Modified Props | UU |

### Viewport:
| Action | Shortcut |
|---|---|
| Zoom In | Ctrl+= |
| Zoom Out | Ctrl+- |
| Fit to Comp | Ctrl+Shift+0 |
| Fit to 100% | Ctrl+0 |
| Hand/Pan | Space+drag |
| Toggle Rulers | Ctrl+R |
| Toggle Guides | Ctrl+; |
| Snap to Guides | Ctrl+Shift+; |
| Toggle Grid | Ctrl+’ |
| Toggle Transparency | Alt+Shift+T (custom) |

### Preview:
| Action | Shortcut |
|---|---|
| RAM Preview | Space |
| From Current | Numpad . |
| Audio Preview | Numpad . |
| Stop Preview | Esc |
| Purge All | Ctrl+F12 (custom) |

### Keyframes:
| Action | Shortcut |
|---|---|
| Easy Ease | F9 |
| Easy Ease In | Shift+F9 |
| Easy Ease Out | Ctrl+F9 |
| Keyframe Velocity | Ctrl+Shift+K |
| Keyframe Interp | Ctrl+Alt+K |

### Tools:
| Tool | Shortcut |
|---|---|
| Selection | V |
| Hand | H |
| Zoom | Z |
| Rotation | W |
| Camera Orbit | C |
| Pan Behind | Y |
| Shape tools | Q |
| Pen | G |
| Text | Ctrl+T |
| Brush | Ctrl+B |
| Puppet | Ctrl+P |

---

## AE-39: Preferences — All Settings

### General:
- Levels of Undo: 1–99
- Show Tool Tips: On/Off
- Create Layers at Composition Start Time
- Switch to Layer panel on double-click
- Default Spatial Interpolation: Linear/Bezier
- Preserve Constant Vertex Count
- Default anchor to layer center
- Synchronize Time of All Related Items
- Allow Scripts to Write Files
- Enable JavaScript Debugger
- Use System Color Picker

### Previews:
- Adaptive Resolution Limit: 1/1 to 1/16
- GPU Accelerated Preview
- Fast Previews: Off, Adaptive, Wireframe, etc.
- Cache Frames when Idle
- Number of Processors for MFR
- Disk Cache Size (MB)
- Disk Cache Folder Location

### Display:
- Show Layer Controls (handles, motion paths)
- All Keyframes / Selected Keyframes
- Motion Path: All / No More Than / No More Than
- Default View: 1-Up / 2-Up / 4-Up

### Import:
- Default footage interpretation for stills (frame rate)
- Sequence footage: frame rate
- Interpret Alpha: Ask, Ignore, Straight, Premultiplied
- Default Drag Import: Create Comp / Single Composition

### Output:
- Default Output Module
- Default file name template
- Default Render Settings template
- Segment Sequences / Segment Size

### Grids & Guides:
- Grid: color, style, subdivision
- Guides: color, style (line/dash/dot)
- Proportional Grid: divisions
- Ruler: pixels/inches/cm/mm/picas/points
- Safe Margins: title safe, action safe percentages

### Labels:
- 16 label colors
- Default label assignments: Comp, Video, Audio, Still, Folder, Solid, Camera, Light, Null, Shape, Text

### Media & Disk Cache:
- Disk Cache: Enable, Max Size, Location
- Database: location, size
- Conformed Media Cache location

### Video Preview:
- Output device (AJA, Blackmagic, etc.)
- Mirroring, offset, deinterlace
- Resolution, frame rate

### Appearance:
- UI Brightness: 4 shades
- Highlight Color
- Chart Colors (for graph editor)

### Audio Hardware:
- Default Input/Output
- Latency: Low/Medium/High
- Sample Rate

### Auto-Save:
- Enable Auto-Save
- Save Every: 1–99 minutes
- Maximum Project Versions: 1–99
- Save in same folder as project

---

## AE-40: File Formats & Codecs

### Import Formats:
| Category | Formats |
|---|---|
| Video | AVI, MOV, MP4, MKV (limited), MXF, MTS, M2TS, WMV, FLV, WebM, VOB, OGG |
| Image Sequence | PNG, JPEG, TIFF, TGA, BMP, EXR, DPX, CIN, SGI, PIC, RLA, RPF |
| Still Image | PSD, AI, EPS, PDF, PNG, JPEG, TIFF, BMP, TGA, GIF, SVG, WebP, HEIF/HEIC |
| Audio | WAV, MP3, AAC, AIFF, M4A, OGG, FLAC, WMA |
| Project | AEP, AEPX (XML), AET (template) |
| 3D | C4D, OBJ, STL, FBX (via Cineware) |
| Data | JSON, CSV (for data-driven animation) |
| HDR | EXR (multi-channel), HDR, RGBE |

### Export Formats:
| Category | Formats |
|---|---|
| Video (Render Queue) | AVI, MOV, PNG Seq, JPEG Seq, TIFF Seq, TGA Seq, WAV |
| Video (Media Encoder) | H.264, H.265, ProRes, DNxHR, WMV, GIF, WebM, AV1 |
| Image Sequence | PNG, JPEG, TIFF, TGA, BMP, EXR, DPX |
| Audio | WAV, AIFF |
| Template | MOGRT (Motion Graphics Template) |
| Web | Lottie (via Bodymovin plugin) |

### Alpha Channel Support:
- Straight alpha: alpha stored independently
- Premultiplied alpha: color channels pre-multiplied with alpha
- Interpret footage to match source alpha mode
- Most common with: PNG, TGA, EXR, TIFF, MOV (with alpha codec)

### Color Space:
- sRGB (Rec. 709): standard HD color space
- Rec. 2020: wide color gamut
- PQ (Perceptual Quantizer): HDR transfer function
- HLG (Hybrid Log-Gamma): HDR broadcast
- ACES: Academy Color Encoding System
- Linear: for compositing math

---

## AE-41: Performance Optimization

### Multi-Frame Rendering (MFR):
- Renders multiple frames simultaneously
- Uses all available CPU cores
- Enable: Preferences > Previews > Enable MFR
- Optimal: 1 core reserved, rest for rendering

### GPU Acceleration:
- Mercury GPU Acceleration (CUDA/OpenCL/Metal)
- Specific effects use GPU: Gaussian Blur, Lumetri, etc.
- GPU VRAM important for large compositions

### Disk Cache:
- Stores rendered frames on disk
- Persistent across sessions
- SSD required for speed
- Set cache size: Preferences > Media & Disk Cache
- Location: dedicated SSD partition

### RAM Management:
- Increase RAM reserved for other applications if needed
- Purge RAM cache regularly for large projects
- RAM preview buffer = available RAM - system needs

### Proxy Workflow:
- Create low-res proxies for heavy footage
- Toggle proxy in Composition panel
- Reduces preview load during editing

### Composition Optimization:
- Reduce pre-comp complexity
- Use adjustment layers instead of per-layer effects
- Collapse transformations on pre-comps
- Disable unused layers (solo, shy)
- Lower preview resolution during work
- Use Draft quality for previews
- Purge cache periodically

### Footage Optimization:
- Transcode to edit-friendly codecs (ProRes, DNxHR)
- Pre-render heavy pre-comps
- Use proxy files for 4K+ footage

---

## AE-42: Collaboration & Version Control

### Team Projects:
- Cloud-based collaborative editing
- Version history with conflict resolution
- Invite team members
- Requires Creative Cloud for Teams/Enterprise

### Collect Files:
- File > Dependencies > Collect Files
- Gathers all source files into single folder
- Options: Collect Source Files, For All Comps / Selected Comps
- Essential for archiving or sharing projects

### Project Organization:
- Name compositions descriptively
- Use folders for: Sources, Comps, Pre-comps, Renders, Assets
- Label colors for visual organization
- Comment column for notes

### Version Control:
- Increment and Save for versioning
- File naming: project_v01.aep, project_v02.aep
- No built-in Git-like version control
- External: use Git LFS or Perforce for binary files

---

## AE-43: Common Workflows

### Logo Reveal:
1. Import logo (vector preferred)
2. Create composition
3. Add Trim Paths for line-draw animation
4. Add scale/opacity animation
5. Add background (gradient, particle, solid)
6. Add light wrap and glow
7. Render with alpha for overlay use

### Lower Third:
1. Design in Photoshop/Illustrator
2. Import and animate in AE
3. Add text animator for text entry
4. Pre-compose and export as MOGRT
5. Use in Premiere Pro

### Green Screen Compositing:
1. Apply Keylight
2. Sample green screen color
3. Refine matte (clip, shrink/grow, softness)
4. Add Spill Suppressor
5. Color match to background plate
6. Add film grain match
7. Add depth of field blur

### Kinetic Typography:
1. Create text layer
2. Add multiple animators per text
3. Offset range selectors
4. Animate position, scale, opacity, rotation per character
5. Add expressions for automation

### Particle Effects:
1. Apply CC Particle World or Particle Playground
2. Adjust emitter, physics, particle type
3. Customize birth/death colors and sizes
4. Layer multiple particle systems
5. Add glow and blur for polish

---

## AE-44: Tips & Best Practices

### Project Organization:
- Name everything clearly (layers, compositions, folders)
- Use label colors consistently
- One main comp per project or scene
- Pre-compose for cleanliness
- Delete unused assets periodically

### Animation:
- Block out key poses first (linear), then refine with easing
- Use Graph Editor for precise timing
- Anticipation, action, follow-through
- Overlap animations for natural feel
- Secondary motion adds realism

### Rendering:
- Always render test frames before full render
- Check alpha channel when needed
- Use AME for final encoding (AE stays free)
- Render to intermediate format, encode separately

### Performance:
- Lower preview resolution during work
- Purge cache when AE feels slow
- Close unused projects
- Reduce undo levels if RAM is tight
- Use proxies for heavy footage

### Common Mistakes:
- Forgetting to enable motion blur
- Not checking alpha interpretation
- Over-using effects (less is more)
- Not pre-comping when needed
- Leaving unused keyframes or effects

---

## AE-45: Troubleshooting

### Common Issues:
| Problem | Solution |
|---|---|
| Slow previews | Lower resolution, purge cache, enable MFR |
| Missing footage | File > Dependencies > Find Missing Footage |
| Expression errors | Check expression syntax, layer names, property paths |
| Plugin missing | Install third-party effect or contact vendor |
| Crashes | Update AE, GPU drivers, check RAM |
| Render errors | Check disk space, output path, format compatibility |
| Audio sync issues | Match frame rates, sample rates |
| Green/black preview | Toggle GPU acceleration, check Mercury settings |
| Memory errors | Purge cache, reduce comp complexity, increase RAM |
| Out of disk space | Clear disk cache, move cache location |

### Debugging Expressions:
- Enable JavaScript debugger in preferences
- Check layer/property name references
- Test with simple values first
- Use `try/catch` for error handling

### Corrupted Project:
- Try opening .aep backup (Auto-Save folder)
- Increment and Save to create checkpoints
- Collect Files as backup
- Check Adobe Community forums

---

## AE-46: ExtendScript / Automation — Reference

### Basic Script Structure:
```javascript
{
    // Get active project
    var project = app.project;
    
    // Get active composition
    var comp = app.project.activeItem;
    
    // Check if comp exists
    if (comp instanceof CompItem) {
        // Access selected layers
        var selectedLayers = comp.selectedLayers;
        
        // Loop through selected layers
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            // Do something with layer
            layer.name = "Layer_" + i;
        }
    }
}
```

### Common Operations:
```javascript
// Create new composition
var newComp = app.project.items.addComp("New Comp", 1920, 1080, 1, 10, 30);

// Import file
var importOptions = new ImportOptions(File("~/Desktop/video.mp4"));
var footage = app.project.importFile(importOptions);

// Add to render queue
var renderItem = app.project.renderQueue.items.add(comp);
renderItem.outputModules[1].file = new File("~/Desktop/output.mov");

// Set keyframe
var position = layer.property("Transform").property("Position");
position.setValueAtTime(0, [960, 540]);
position.setValueAtTime(1, [100, 100]);

// Apply effect
layer.effect.addProperty("ADBE Gaussian Blur 2");
```

### ScriptUI Dialog:
```javascript
var dialog = new Window("dialog", "My Script");
dialog.add("statictext", undefined, "Select an option:");
var dropdown = dialog.add("dropdownlist", undefined, ["Option 1", "Option 2"]);
dropdown.selection = 0;
var button = dialog.add("button", undefined, "Apply");
button.onClick = function() {
    // Do something
    dialog.close();
};
dialog.show();
```

---

## AE-47: Essential Keyboard Shortcut Quick Reference (Printable)

### Most Important:
| Action | Shortcut |
|---|---|
| New Composition | Ctrl+N |
| Import File | Ctrl+I |
| RAM Preview | Space |
| Undo | Ctrl+Z |
| Save | Ctrl+S |
| Render Queue | Ctrl+Shift+/ |
| Media Encoder | Ctrl+Alt+M |
| Show Keyframes | U |
| Show All Modified | UU |
| Easy Ease | F9 |
| Split Layer | Ctrl+Shift+D |
| Pre-compose | Ctrl+Shift+C |
| Duplicate | Ctrl+D |
| Select All | Ctrl+A |
| New Solid | Ctrl+Y |
| New Null | Ctrl+Alt+Shift+Y |
| New Camera | Ctrl+Alt+Shift+C |
| New Light | Ctrl+Alt+Shift+L |
| Text Tool | Ctrl+T |
| Pen Tool | G |
| Selection Tool | V |
| Hand Tool | H |
| Zoom Tool | Z |
| Rotation Tool | W |
| Previous Frame | PgUp |
| Next Frame | PgDn |
| Home | Start |
| End | End |
| Previous Keyframe | J |
| Next Keyframe | K |
| Set In Point | [ |
| Set Out Point | ] |
| Move In to CTI | Alt+[ |
| Move Out to CTI | Alt+] |

---
---

# ═══════════════════════════════════════════════════════════════════
# PART B: PREMIERE PRO — COMPLETE REFERENCE
# ═══════════════════════════════════════════════════════════════════

---

## PP-01: What Is Premiere Pro

Adobe Premiere Pro is a professional non-linear video editing application and the industry standard for film, broadcast, streaming, corporate, social media, and personal video production. It is part of the Adobe Creative Cloud suite.

### Core Capabilities:
- Non-linear, multi-track video and audio editing
- Support for virtually any video format and codec
- Advanced color correction and grading (Lumetri Color)
- Professional audio editing and mixing (Essential Sound)
- Multi-cam editing (sync and switch between multiple camera angles)
- VR/360° video editing
- Motion Graphics Templates (MOGRT) from After Effects
- Auto-transcription and text-based editing
- AI-powered features (Sensei): Auto Reframe, Scene Edit Detection, Speech to Text, Color Match
- Proxy workflow for high-resolution media
- Dynamic Link with After Effects, Audition, Media Encoder
- Team Projects for cloud collaboration
- Extensive export options via Adobe Media Encoder
- Hardware-accelerated playback and encoding (GPU, Quick Sync)
- Scripting and panel development (CEP, UXP)
- Integration with Frame.io for review and approval

---

## PP-02: System Requirements

### Windows Minimum:
| Component | Requirement |
|---|---|
| Processor | Intel 6th Gen or AMD equivalent (64-bit) |
| Operating System | Windows 10 (64-bit) v22H2 or later |
| RAM | 8 GB (16 GB for HD, 32 GB for 4K) |
| GPU | 4 GB VRAM |
| Storage | 8 GB available (SSD required) |
| Display | 1920×1080 |
| Sound | ASIO or Microsoft WDM |

### macOS Minimum:
| Component | Requirement |
|---|---|
| Processor | Apple Silicon (M1+) or Intel 6th Gen+ |
| Operating System | macOS 12.0 or later |
| RAM | 8 GB (16 GB for HD, 32 GB for 4K) |
| GPU | Apple Silicon integrated or 4 GB discrete |
| Storage | 8 GB available (SSD required) |
| Display | 1920×1080 |

### Recommended:
- CPU: 10+ cores (Apple M2 Pro+, AMD Ryzen 9, Intel i9)
- RAM: 64 GB (128 GB for 8K/HDR workflows)
- GPU: NVIDIA RTX 3070+ or AMD equivalent
- Storage: NVMe for OS, NVMe for projects/cache, HDD for archive
- Display: Dual monitor, hardware color calibrated, 4K primary

---

## PP-03: Installation & Licensing

### Same as After Effects:
- Creative Cloud Desktop > Install Premiere Pro
- Adobe ID, subscription-based
- 2 concurrent activations
- Individual, Teams, Enterprise, Education licenses
- Auto-update via Creative Cloud app
- Beta versions available

---

## PP-04: Interface Overview

### Panels:
1. **Source Monitor**: View/trim individual clips before adding to timeline
2. **Program Monitor**: View the current sequence output
3. **Timeline Panel**: Multi-track editing workspace (sequences)
4. **Project Panel / Libraries**: Media organization and asset management
5. **Effect Controls Panel**: Modify effects per clip
6. **Audio Track Mixer**: Multi-track audio mixing with effects
7. **Tools Panel**: Editing tools
8. **Info Panel**: Clip and sequence information
9. **Media Browser**: Browse file system for media
10. **Markes Panel**: Manage markers across sequences and clips
11. **History Panel**: Undo history
12. **Essential Graphics Panel**: Motion graphics template editing
13. **Essential Sound Panel**: Quick audio adjustments
14. **Lumetri Color Panel**: Color correction and grading
15. **Text Panel**: Auto-transcription and text-based editing
16. **Captions Panel**: Edit captions/subtitles
17. **Progress Panel**: Background tasks

---

## PP-05: Workspaces

### Preset Workspaces:
1. **Assembly**: Media-focused, quick ingest
2. **Editing**: Default balanced layout for editing
3. **Color**: Lumetri Scopes, Color Wheels, Lumetri Color
4. **Effects**: Effects panel prominent
5. **Audio**: Audio Track Mixer, Essential Sound
6. **Graphics**: Essential Graphics, Program Monitor
7. **Libraries**: Creative Cloud Libraries
8. **Learning**: Tutorial panel
9. **Review**: Frame.io integration
10. **Captions**: Text panel, Captions panel
11. **Vertical**: Social media vertical video editing

### Workspace Operations:
- Switch: Window > Workspaces > [Name]
- Save: Window > Workspaces > Save as New Workspace
- Reset: Window > Workspaces > Reset to Saved Layout
- Delete: Window > Workspaces > Delete Workspace
- Import/Export: XML workspace files
- Keyboard shortcut assignment

---

## PP-06: File Menu — Complete

### New:
- **New Project**: Ctrl+Alt+N
- **New Sequence**: Ctrl+N
- **New Sequence from Clip**: drag clip to New Item button
- **New Bin**: Ctrl+B
- **New Offline Clip**: placeholder for offline media
- **New Title**: Ctrl+T (Legacy Title, deprecated)
- **New Photoshop File**: linked PSD
- **New Bars and Tone**: test pattern generator
- **New Black Video**: black solid
- **New Color Matte**: custom color solid
- **New Universal Counting Leader**: countdown leader
- **New Transparent Video**: transparent solid

### Open Project: Ctrl+O
### Open Recent: list
### Close Project: Ctrl+Shift+W
### Close: Ctrl+W

### Save: Ctrl+S
### Save As: Ctrl+Shift+S
### Save a Copy: saves without switching
### Revert: revert to last save

### Import: Ctrl+I
### Import Recent Footage: list
### Export:
- Media: Ctrl+M (opens Export Settings)
- Selection as Premiere Project
- EDL, AAF, XML (for interchange)
- Captions (SRT, MCC, etc.)
- Send to Adobe Media Encoder: Ctrl+Shift+M

### Get Properties for: file info
### Project Settings:
- General: Video/Audio settings, capture format
- Ingest Settings: auto-ingest options
- Scratch Disks: media cache, previews, auto-save locations

### Project Manager:
- Consolidate and Transcode
- Collect and Copy
- Project Trim options
- Exclude unused clips

---

## PP-07: Edit Menu — Complete

### Basic:
- Undo: Ctrl+Z
- Redo: Ctrl+Shift+Z
- Cut: Ctrl+X
- Copy: Ctrl+C
- Paste: Ctrl+V
- Paste Insert: Ctrl+Shift+V
- Paste Attributes: Ctrl+Alt+V
- Clear: Delete
- Ripple Delete: Shift+Delete
- Duplicate: Ctrl+Shift+/

### Selection:
- Select All: Ctrl+A
- Select All on Track: (specific track select)
- Deselect All: Ctrl+Shift+A

### Find: Ctrl+F
### Label: submenu for label colors

### Edit Original: opens in original application
### Edit in Adobe Audition: send clip to Audition

### Preferences:
- General, Appearance, Audio, Audio Hardware, Audio Output Mapping, Auto Save, Collaboration, Captions, Clipboard, Color, Control Surface, Device Control, Device Manager, Graphics, Interactive Len Graphics, Keyboard Shortcuts, Labels, Marker Colors, Media, Memory, Mercury Transmit, Multi-Camera, Playback, Program Monitor, Review with Frame.io, Sequence, Sync Settings, Technology Preview, Timeline, Timeline (Trim), Titler, Transport

---

## PP-08: Clip Menu — Complete

### Rename: rename clip in project or sequence
### Make Subclip: create subclip from In/Out
### Edit Subclip: modify subclip boundaries
### Edit Disabling: enable/disable clip in sequence

### Audio Options:
- Audio Gain: G
- Source Channel Mappings
- Breakout to Mono
- Fill Left/Fill Right
- Swap Channels

### Video Options:
- Frame Hold Options
- Field Options
- Frame Blend
- Scale to Frame Size / Set to Frame Size
- Render and Replace / Restore Unrendered

### Speed/Duration: Ctrl+R
- Speed percentage
- Duration
- Reverse Speed
- Maintain Audio Pitch
- Ripple Edit, Shifting Adjacent Clips

### Nest Sequence: nest sequence in another
### Unnest: reverse nesting
### Flatten: flatten multicam or nested sequence

### Merge Clips:
- Based on Timecode
- Based on Audio (waveform sync)
- Based on Markers

### Synchronize:
- Based on Timecode
- Based on Audio
- Based on Markers
- Based on Clip Start/End

### Multi-Camera:
- Enable/Disable
- Camera selection
- Flatten

### Auto Transcribe Sequence: AI speech-to-text
### Generate Captions: create captions from transcript
### Create Multi-Camera Source Sequence
### Replace with After Effects Composition (Dynamic Link)
### Replace with Clip:
- From Source Monitor
- From Bin

### Analysis Data: view clip analysis

---

## PP-09: Sequence Menu — Complete

### Sequence Settings: view/change
### Delete Tracks: remove tracks
### Add Tracks: Ctrl+Shift+T
### Render Effects in Work Area: Enter
### Render In to Out: Ctrl+Enter
### Render Audio: render audio previews
### Delete Render Files
### Match Frame: F
### Reverse Match Frame: Shift+F
### Add Edit: Cmd+K (at playhead)
### Add Edit to All Tracks: Ctrl+Shift+K
- **Insert**: overwrite, insert, replace
- **Lift**: remove selection leaving gap
- **Extract**: remove selection closing gap
### Apply Default Transition: Ctrl+D
### Apply Default Video Transition: Ctrl+D
### Apply Default Audio Transition: Ctrl+Shift+D
### Apply Video Transition: from Transition to selected edit point
### Apply Audio Transition: from Transition to selected edit point
### Go to Sequence In/Out: Shift+I / Shift+O
### Snap: S
### Selection Follows Playhead
### Show Keyframes / Show Clip Keyframes / Show Track Keyframes
### Normalize Master Track / Maximize Frame / Maximize or Restore Frame Under Cursor: Shift+`

---

## PP-10: Sequence Settings

### General:
- Editing Mode: Custom, DSLR, AVCHD, ProRes, DNxHD, etc.
- Timebase: 23.976, 24, 25, 29.97, 30, 50, 59.94, 60
- Frame Size: Width × Height (custom or preset)
- Pixel Aspect Ratio: Square (1.0), DV NTSC, DV PAL, Anamorphic, etc.
- Fields: No Fields (Progressive), Upper/Lower First
- Display Format: Timecode, Frames, Feet+Frames (16mm/35mm)
- Preview File Format: I-Frame Only MPEG, QuickTime
- Codec: various preview codecs
- Maximum Bit Depth
- Maximum Render Quality
- VR Properties: Stereoscopic, Monoscopic, Layout

### Audio:
- Sample Rate: 8000–192000 Hz (48000 standard)
- Display Format: Audio Samples or Milliseconds

### Video Rendering and Playback:
- Renderer: Mercury Playback Engine GPU Acceleration (CUDA/OpenCL/Metal) or Software Only

---

## PP-11: Timeline Panel — Deep Dive

### Track Structure:
- Video tracks: V1, V2, V3... (stacking order, higher = on top)
- Audio tracks: A1, A2, A3...
- Master Audio Track: final output
- Track headers: Lock, Sync Lock, Toggle Track Output, Toggle Track Record, Collapse/Expand

### Track Header Controls:
| Control | Function |
|---|---|
| Toggle Sync Lock | Lock track to sync when inserting/extracting |
| Toggle Track Lock | Prevent edits on this track |
| Toggle Track Output | Mute video/audio track |
| Show/Hide Keyframes | Toggle keyframe visibility |
| Track Name | Rename track |
| Target Track | Assign editing target |

### Timeline Controls:
- Time Ruler with zoom
- CTI (Playhead) — Blue triangle
- In/Out points (green/red markers)
- Work Area Bar
- Snap toggle (magnetic alignment)
- Linked Selection toggle
- Automation modes (audio)
- Track height adjustments (mouse drag)
- Zoom: +/- at bottom, or scroll wheel

### Clip Display:
- Thumbnails (first frame or continuous)
- Waveform display (audio clips)
- Clip name overlay
- FX badge (effects applied)
- Keyframe graphs
- Opacity rubber band (video)
- Volume rubber band (audio)
- Speed/duration indicator (speed changes)
- In/Out point handles

### Timeline Editing:
- Insert Edit: overwrite at playhead, push other clips
- Overwrite Edit: replace at playhead
- Replace Edit: swap clip at playhead
- Three-Point Edit: Source In/Out + Sequence In
- Four-Point Edit: Source In/Out + Sequence In/Out
- Lift: remove without closing gap
- Extract: remove and close gap
- Ripple Delete: close gap by deleting

### Trimming:
- Regular Trim: trim edge of clip
- Ripple Trim: trim and shift adjacent clips
- Roll Trim: adjust edit point between two clips
- Slip Trim: adjust in/out of clip without moving it
- Slide Trim: move clip in timeline without changing its content
- Trim Mode: dedicated trim view with A/B roll

---

## PP-12: Source Monitor

### Opening Clips:
- Double-click clip in Project panel
- Clip opens in Source Monitor
- Set In (I), Set Out (O)
- Clear In (Ctrl+Shift+X), Clear Out (Alt+X), Clear In and Out (Alt+X)

### Source Monitor Controls:
- Play/Stop (Space), Shuttle, Jog, Scrub
- Mark In (I), Mark Out (O)
- Insert (comma), Overwrite (period)
- Drag to timeline (insert or overwrite)
- Go to In, Go to Out
- Loop playback
- Safe Margins, Zoom
- View: Audio Waveform, Video, Audio + Video

### Source Patching:
- Source track indicators (A1, V1, etc.)
- Match to timeline track targets
- Toggle source tracks on/off

### Subclip:
- Set In/Out in Source Monitor
- Clip > Make Subclip
- Name and save

---

## PP-13: Program Monitor

### Controls:
- Play/Stop, Shuttle, Jog, Scrub
- Mark In (I), Mark Out (O) for sequence
- Safe Margins toggle
- Loop playback
- Zoom (fit, 100%, 200%, etc.)
- Wrench icon: settings (safe margins, guides, overlays, rulers)
- Comparison View: compare frames side by side
- Transport controls
- Resolution playback quality
- VR headset toggle
- Overlays: timecode, safe margins, guides, safe title/action
- Playback Resolution: Full, 1/2, 1/4, 1/8, 1/16

---

## PP-14: Effects Panel

### Categories:
- **Obsolete Effects**: Legacy effects
- **Audio Effects**: Adobe audio effects + third-party
- **Audio Transitions**: Crossfade, Constant Gain, Constant Power
- **Video Effects**:
  - Adjust
  - Blur & Sharpen
  - Channel
  - Color Correction
  - Distort
  - Generate
  - Image Control
  - Keying
  - Noise & Grain
  - Obsolete
  - Perspective
  - Stylize
  - Time
  - Transform
  - Utility
  - Video (third-party)
- **Video Transitions**:
  - 3D Motion
  - Dissolve
  - Iris
  - Page Peel
  - Slide
  - Wipe
  - Zoom

### Applying Effects:
- Drag from Effects panel to clip in timeline
- Drag to Effect Controls panel
- Select clip, double-click effect in panel

### Effect Controls Panel:
- Per-clip effect parameters
- Keyframe animation (stopwatch icon)
- Toggle effect on/off (fx icon)
- Reset effect
- Paste effects from clipboard
- Motion (built-in): Position, Scale, Rotation, Anchor Point, Anti-flicker Filter, Opacity
- Opacity: built-in (always present)
- Time Remapping: speed/duration
- Volume: built-in for audio

---

## PP-15: Top 50 Video Effects — Parameters

### 1. Lumetri Color
- Basic Correction: Input LUT, White Balance, Tone (Exposure, Contrast, Highlights, Shadows, Whites, Blacks), Saturation
- Creative: Look, Faded Film, Vibrance, Saturation
- Curves: RGB, Hue vs Sat, Hue vs Hue, Hue vs Luma, Luma vs Sat, Sat vs Sat
- Color Wheels: Shadow, Midtone, Highlight, Master
- HSL Secondary: Key-based color isolation
- Vignette: Amount, Midpoint, Roundness, Feather

### 2. Gaussian Blur
- Blurriness: 0–1000
- Blur Dimensions: Horizontal, Vertical, Both
- Repeat Edge Pixels

### 3. Fast Blur (Legacy)
- Blurriness: 0–500
- Repeat Edge Pixels

### 4. Directional Blur
- Direction: 0–360°
- Blur Length: 0–500

### 5. Camera Blur
- Blur: 0–100
- Iris Shape: Triangle, Square, Pentagon, Hexagon, Octagon

### 6. Unsharp Mask
- Amount: 0–500
- Radius: 0.0–250.0
- Threshold: 0–255

### 7. Brightness & Contrast
- Brightness: -100 to +100
- Contrast: -100 to +100

### 8. Color Balance
- Shadow/Midtone/Highlight: Red-Green-Blue (-100 to +100)
- Preserve Luminosity

### 9. Color Balance (HLS)
- Hue: 0–360°
- Lightness: -100 to +100
- Saturation: -100 to +100

### 10. Curves
- Channel: RGB, R, G, B
- Curve editor with control points

### 11. Levels
- Channel: RGB, R, G, B
- Input/Output: Black, White, Gamma

### 12. RGB Color Corrector
- Black/White/Gamma for R, G, B individually

### 13. Three-Way Color Corrector
- Shadow/Midtone/Highlight color wheels
- Input/Output Levels
- Saturation, Tonal Range Definition

### 14. Fast Color Corrector
- Color wheel (balance)
- Saturation, Hue, Tonal Range

### 15. Video Limiter
- Max signal clamp
- Luma Max/Min, Chroma Max

### 16. ProcAmp
- Brightness, Contrast, Hue, Saturation

### 17. Tint
- Map Black To, Map White To
- Amount to Tint: 0–100%

### 18. Black & White
- Channel-specific color conversion
- Red, Yellow, Green, Cyan, Blue, Magenta

### 19. Gamma Correction
- Gamma: 0.1–10.0

### 20. Hue/Saturation
- Channel Range (Master, R, Y, G, C, B, M)
- Hue, Saturation, Lightness
- Colorize

### 21. Invert
- Channel: RGB, R, G, B, A

### 22. Black/White Gain and Gamma
- Red/Green/Blue Black/Gamma/Gain

### 23. Leave Color
- Color to Leave: eyedropper
- Amount to Decolor: 0–100%
- Tolerance, Edge Softness, Match Colors

### 24. Change Color
- Color To Change: eyedropper
- Hue Transform, Lightness Transform, Saturation Transform
- Color Tolerance, Similarity

### 25. Change to Color
- From: eyedropper
- To: color
- Change By, Tolerance, Softness

### 26. Posterize
- Level: 2–255

### 27. Mosaic
- Horizontal Blocks, Vertical Blocks
- Sharp Colors

### 28. Emboss
- Direction: 0–360°
- Relief: 0–10
- Contrast: 0–500
- Blend with Original: 0–100%

### 29. Find Edges
- Invert: On/Off
- Blend with Original: 0–100%

### 30. Strobe Light
- Strobe Color, Blend With Original
- Strobe Period, Duration, Random Strobe Probability

### 31. Color Emboss
- Direction, Relief, Contrast
- Blend with Original

### 32. Roughen Edges
- Border: 0–100
- Edge Type: various
- Edge Color, Fractal Influence, Scale, Stretch, Offset, Complexity
- Evolution: 0–∞

### 33. Glow (via Stylize)
- Glow Based On: Color Channels, Alpha Channel
- Glow Threshold, Glow Radius, Glow Intensity

### 34. Brush Strokes
- Stroke Angle, Brush Size, Stroke Length, Paint Surface
- Paint Density, Stroke Randomness, Spatula Depth, Texture Depth

### 35. Solarize
- Threshold: 0–1

### 36. Posterize Time
- Frame Rate: 1–30

### 37. Mirror
- Reflection Center, Reflection Angle

### 38. Transform (Effect)
- Position, Scale Width/Height, Skew, Skew Axis, Rotation, Anchor Point, Opacity
- Shutter Angle, Composition Shutter Angle

### 39. Crop
- Left, Top, Right, Bottom (%)
- Zoom: On/Off

### 40. Edge Feather
- Number of Edge Pixels: 1–200

### 41. Horizontal/Vertical Flip
- No parameters

### 42. Camera View
- Camera View adjustments (longitude, latitude, roll, focal length, distance)

### 43. Lens Distortion
- Curvature: -100 to +100
- Vertical/Horizontal Prism FX

### 44. Wave Warp
- Wave Type, Height, Width, Speed, Direction, Phase, Pinning

### 45. Twirl
- Angle: -999 to 999
- Twirl Radius: 0–200
- Twirl Center: X, Y

### 46. Spherize
- Radius, Center, Plane to Sphere

### 47. Ripple
- Radius, Center, Wave Amplitude, Speed, Width

### 48. Lighting Effects
- Light Type, Intensity, Color, Properties
- Multiple lights

### 49. Lens Flare
- Flare Center, Brightness (10%–300%)
- Lens Type: 50-300mm Zoom, 35mm Prime, 105mm Prime, Movie Prime

### 50. Drop Shadow
- Color, Opacity, Direction, Distance, Softness

---

## PP-16: Video Transitions — Complete

### 3D Motion:
- Cube Spin, Flip Over, Page Roll, Page Turn, Swing In, Swing Out

### Dissolve:
- Additive Dissolve, Audio/Video Dissolve, Cross Dissolve, Dither Dissolve, Dip to Black, Dip to White, Film Dissolve, Morph Cut, Non-Additive Dissolve

### Iris:
- Iris Box, Iris Cross, Iris Diamond, Iris Eye, Iris Points, Iris Round, Iris Shapes, Iris Star

### Page Peel:
- Center Peel, Page Peel, Page Back, Page Turn, Peel Back

### Slide:
- Band Slide, Center Split, Multi-Spin, Push, Slash Slide, Slide, Split, Swap, Swirl, Tumble Away

### Wipe:
- Band Wipe, Barn Doors, Checkerboard Wipe, Clock Wipe, Gradient Wipe, Inset, Paint Splatter, Pinwheel, Radial Wipe, Random Blocks, Random Wipe, Spiral Boxes, Venetian Blinds, Wedge Wipe, Wipe, Zig-Zag Blocks

### Zoom:
- Cross Zoom, Zoom, Zoom Boxes, Zoom Trails

### Applying Transitions:
- Default transition: Ctrl+D (video), Ctrl+Shift+D (audio)
- Drag transition to edit point
- Adjust duration in Effect Controls or directly on transition
- Alignment: Center at Cut, Start at Cut, End at Cut, Custom Start/End

---

## PP-17: Audio Editing

### Audio Track Mixer:
- Per-track faders (volume)
- Pan/Balance per track
- Mute (M), Solo (S), Record (R) per track
- Audio effects per track (insert effects)
- Send effects (auxiliary sends)
- Automation modes: Off, Read, Latch, Touch, Write
- Master fader for final output

### Audio Effects (Built-in):
- Amplitude and Compression: Amplify, Compressor, Dynamics, Expander/Gate, Multiband Compressor, Single-Band Compressor
- Delay and Echo: Analog Delay, Delay, Echo
- Filter and EQ: EQ, FFT Filter, Graphic EQ, Notch, Parametric EQ
- Modulation: Chorus, Flanger, Phaser
- Noise Reduction: DeNoiser, DeReverb
- Reverb: Convolution Reverb, Full Reverb, Reverb, Studio Reverb
- Special: Chorus/Flanger, DeClicker, DeCrackler, DeEsser, DeHummer, Distortion, Pitch Shifter, Ring Modulator
- Stereo Imagery: Balance, Channel Volume, Fill Left/Fill Right, Swap Channels
- Time and Pitch: Pitch Shifter, Stretch

### Essential Sound Panel:
- Dialogue: Loudness, Repair, Clarity
- Music: Loudness, Ducking
- SFX: Loudness, Repair, Creative
- Ambience: Loudness, Reverb

### Audio Clip Mixer:
- Per-clip volume and pan
- View in timeline
- Rubber band editing (drag volume line)

### Audio Gain:
- Clip > Audio Gain: G
- Set Gain, Adjust Gain, Normalize Max Peak, Normalize All Peaks
- Gain values in dB

---

## PP-18: Color Correction (Lumetri Color)

### Lumetri Color Panel Tabs:
1. **Basic Correction**:
   - Input LUT (dropdown)
   - White Balance: Temperature (-100 to +100), Tint (-100 to +100)
   - Tone: Exposure, Contrast, Highlights, Shadows, Whites, Blacks (all -100 to +100)
   - Saturation: -100 to +100
   - Auto button

2. **Creative**:
   - Look: dropdown of LUTs
   - Faded Film: 0–100
   - Sharpen: 0–100
   - Vibrance: -100 to +100
   - Saturation: -100 to +100
   - Tint Balance/Intensity
   - Shadow/Highlight Tint Color wheels

3. **Curves**:
   - RGB Curves (master + per-channel)
   - Hue vs Saturation
   - Hue vs Hue
   - Hue vs Luma
   - Luma vs Saturation
   - Saturation vs Saturation

4. **Color Wheels**:
   - Shadow, Midtone, Highlight color wheels (hue + brightness)
   - Master wheel
   - Input/Output Levels sliders

5. **HSL Secondary**:
   - Color key selection (H, S, L ranges)
   - Key: eyedropper, H/S/L sliders with soft/hard selection
   - Refine: Denoise, Blur
   - Adjustments: White Balance, Color, Lightness

6. **Vignette**:
   - Amount: -100 to +100
   - Midpoint: 0–100
   - Roundness: -100 to +100
   - Feather: 0–100

### Lumetri Scopes:
- Waveform (Luma/RGB)
- Vectorscope (YUV)
- Parade (RGB)
- Histogram
- View > Lumetri Scopes

---

## PP-19: Multi-Camera Editing

### Setup:
1. Select clips in bin (or on timeline)
2. Clip > Create Multi-Camera Source Sequence
3. Sync by: Timecode, Audio, Markers, In Points
4. Audio: camera audio, all audio, or switch audio
5. Sequence preset: auto or manual

### Multi-Camera Workflow:
1. Open multi-cam sequence in timeline
2. Enable multi-cam (wrench icon > Multi-Camera)
3. Program Monitor shows Multi-Camera view (grid of all angles)
4. Play sequence, click on camera angle to switch in real-time
5. Edits are recorded as cut points
6. Can adjust cuts after recording (trim, ripple, etc.)
7. Flatten when done (optional)

### Multi-Camera Operations:
- Enable/Disable Multi-Camera
- Flatten to single track
- Edit cameras (add/remove/reorder)
- Sync adjustments
- Audio follows video or stays on one camera

---

## PP-20: Captions & Subtitles

### Types:
- CEA-608 (Closed Captions)
- CEA-708 (Closed Captions)
- SRT (SubRip)
- MCC (MacCaption)
- SCC (Scenarist Closed Captions)
- STL (EBU Subtitle)
- TTML (Timed Text)
- Open Captions (burned in)

### Creating Captions:
- File > New > Captions
- Import SRT, MCC, SCC, etc.
- Auto-generate from transcript (Speech to Text)

### Editing Captions:
- Captions panel or Essential Graphics panel
- Text editing directly in timeline
- Timing adjustment
- Style: font, size, color, background, alignment, position
- Number of lines per caption

### Export:
- File > Export > Captions
- Formats: SRT, MCC, SCC, STL, TTML, Open Captions (embedded)

### Text Panel (AI Transcription):
- Auto Transcribe Sequence (Clip > Auto Transcribe)
- Edit transcript directly (text-based editing)
- Generate captions from transcript
- Search transcript
- Speaker identification
- Multiple languages supported

---

## PP-21: Titles & Graphics

### Essential Graphics Panel:
- Browse: Adobe Stock templates, installed MOGRTs
- Edit: modify selected template properties
- Create: new graphics from scratch

### Creating Titles:
1. Essential Graphics panel > Create New
2. Type Tool (T): click in Program Monitor to add text
3. Rectangle/Ellipse tools for shapes
4. Edit properties: font, size, color, stroke, shadow, alignment
5. Responsive Design - Position: pin to edges
6. Responsive Design - Time: intro/outro protected ranges
7. Export as Motion Graphics Template (.mogrt)

### Legacy Title (Deprecated):
- Title > New Title
- Full typographic controls
- Templates, styles, rolling/crawling
- Being replaced by Essential Graphics

### Motion Graphics Templates (from After Effects):
- Import .mogrt files
- Editable properties appear in Essential Graphics panel
- Media replacement for image/video swap
- Responsive design for different aspect ratios

---

## PP-22: Export Settings (Ctrl+M)

### Format Options:
- H.264 (most common web/broadcast)
- H.265 (HEVC, better compression)
- ProRes (Apple ecosystem, intermediate)
- DNxHR/DNxHD (Avid ecosystem, intermediate)
- AVI (Windows uncompressed)
- QuickTime (various codecs)
- Windows Media (WMV)
- Animated GIF
- MP3, WAV (audio only)
- Image Sequence (JPEG, PNG, TIFF, TGA)

### H.264 Settings:
- Preset: Match Source, YouTube, Vimeo, Facebook, Twitter, Broadcast
- Width/Height: custom or match source
- Frame Rate: match source or custom
- Field Order: Progressive (recommended)
- Aspect: Square Pixels
- Profile: Baseline, Main, High
- Level: Auto or specific
- Bitrate Encoding: CBR, VBR 1-Pass, VBR 2-Pass
- Target Bitrate: kbps (10–100+ for HD/4K)
- Maximum Bitrate
- Render at Maximum Depth
- Use Maximum Render Quality
- Audio: AAC, bitrate, sample rate

### Export Options:
- Source Range: Entire Sequence, Sequence In/Out, Work Area, Custom
- Export Video, Export Audio toggles
- Captions: export or burn in
- Effects: Lumetri LUT, Video Limiter
- Queue: send to Media Encoder
- Export: render directly

---

## PP-23: Adobe Media Encoder

### Features:
- Batch encoding of multiple files
- Background encoding (Premiere Pro stays free)
- Watch folders for automated encoding
- Multiple output formats per source
- Preset browser for common formats
- Queue management with priority
- Encoding progress with preview
- Hardware-accelerated encoding (GPU, Quick Sync)

### Adding to Queue:
- From Premiere Pro: Ctrl+Shift+M
- Drag files from desktop
- File > Add Source

### Presets:
- YouTube, Vimeo, Facebook, Twitter
- Broadcast (DNxHD, ProRes)
- Device presets (iPad, Android, etc.)
- Custom presets

### Encoding:
- Start Queue button
- Parallel encoding (multiple files simultaneously)
- Encoding status, ETA, errors
- Notify when complete

---

## PP-24: Proxy Workflow

### Creating Proxies:
1. Select clips in bin
2. Right-click > Proxy > Create Proxies
3. Choose format: ProRes Proxy, GoPro CineForm, H.264
4. Choose preset: resolution (1/2, 1/4, etc.)
5. Media Encoder creates proxy files
6. Proxies linked to original media

### Toggle Proxy:
- Button in Program Monitor (Toggle Proxies)
- Drag to button bar if not visible
- Blue = proxy mode, Gray = full resolution

### Benefits:
- Smooth playback of 4K/8K media
- Faster editing and preview
- Switch to full resolution for final output
- Proxy files are smaller, faster to process

---

## PP-25: Keyboard Shortcuts — Complete

### File:
| Action | Shortcut |
|---|---|
| New Project | Ctrl+Alt+N |
| New Sequence | Ctrl+N |
| Open Project | Ctrl+O |
| Save | Ctrl+S |
| Save As | Ctrl+Shift+S |
| Import | Ctrl+I |
| Export Media | Ctrl+M |
| Send to AME | Ctrl+Shift+M |
| Close | Ctrl+W |

### Edit:
| Action | Shortcut |
|---|---|
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |
| Cut | Ctrl+X |
| Copy | Ctrl+C |
| Paste | Ctrl+V |
| Paste Insert | Ctrl+Shift+V |
| Paste Attributes | Ctrl+Alt+V |
| Clear | Delete |
| Ripple Delete | Shift+Delete |
| Duplicate | Ctrl+Shift+/ |
| Select All | Ctrl+A |
| Find | Ctrl+F |
| Keyboard Shortcuts | Ctrl+Alt+K |

### Timeline:
| Action | Shortcut |
|---|---|
| Play/Stop | Space |
| Forward 1 Frame | → |
| Backward 1 Frame | ← |
| Forward 5 Frames | Shift+→ |
| Backward 5 Frames | Shift+← |
| Forward 10 Frames | Ctrl+→ |
| Backward 10 Frames | Ctrl+← |
| Go to In | Shift+I |
| Go to Out | Shift+O |
| Go to Start | Home |
| Go to End | End |
| Set In Point | I |
| Set Out Point | O |
| Clear In | Ctrl+Shift+X |
| Clear Out | Alt+X |
| Clear In & Out | Alt+X |
| Mark Clip | X |
| Mark Selection | / |
| Next Edit Point | ↓ |
| Previous Edit Point | ↑ |
| Shuttle Left | J |
| Shuttle Stop | K |
| Shuttle Right | L |
| Play Reverse | J |
| Step Forward | L |
| Step Backward | K then L etc. (shuttle) |

### Editing:
| Action | Shortcut |
|---|---|
| Insert | , (comma) |
| Overwrite | . (period) |
| Lift | ; (semicolon) |
| Extract | ' (apostrophe) |
| Add Edit | Ctrl+K |
| Add Edit All Tracks | Ctrl+Shift+K |
| Ripple Trim Previous | Ctrl+← (trim mode) |
| Ripple Trim Next | Ctrl+→ (trim mode) |
| Trim Previous | ← (trim mode) |
| Trim Next | → (trim mode) |
| Match Frame | F |
| Reverse Match Frame | Shift+F |

### Transitions & Effects:
| Action | Shortcut |
|---|---|
| Default Video Transition | Ctrl+D |
| Default Audio Transition | Ctrl+Shift+D |
| Render Effects in Work Area | Enter |
| Render In to Out | Ctrl+Enter |
| Speed/Duration | Ctrl+R |
| Nest Sequence | Ctrl+T (or right-click) |
| Audio Gain | G |

### Tools:
| Tool | Shortcut |
|---|---|
| Selection | V |
| Track Select Forward | A |
| Track Select Backward | Shift+A |
| Ripple Edit | B |
| Rolling Edit | N |
| Rate Stretch | X |
| Razor | C |
| Slip | Y |
| Slide | U |
| Pen | P |
| Hand | H |
| Zoom | Z |
| Text | T |

### View:
| Action | Shortcut |
|---|---|
| Toggle Full Screen | ` (backtick) |
| Maximize Panel | Shift+` |
| Toggle Snap | S |
| Toggle Loop | Ctrl+Shift+L |
| Zoom In Timeline | = |
| Zoom Out Timeline | - |
| Zoom to Sequence | \ |
| Show Safe Margins | ' (with monitor focus) |
| Show Guides | Ctrl+; |

### Multi-Camera:
| Action | Shortcut |
|---|---|
| Camera 1–9 | 1–9 (numpad) |
| Enable Multi-Camera | wrench icon |

---

## PP-26: Dynamic Link with After Effects

### Methods:
1. **Replace with After Effects Composition**:
   - Select clip in timeline
   - Right-click > Replace with After Effects Composition
   - Opens AE, creates linked comp
   - Edit in AE, updates in Premiere

2. **Import AE Composition**:
   - File > Import > select .aep file
   - Choose composition to import
   - Appears as linked clip in Premiere timeline

3. **Dynamic Link Properties**:
   - Live update between applications
   - No intermediate rendering needed
   - May impact playback performance
   - Can render and replace for performance

---

## PP-27: Motion Controls

### Effect Controls Panel (Motion Effect):
- **Position**: X, Y (center of frame = 960, 540 for 1080p)
- **Scale**: 0–10000% (100% = original size)
- **Scale Width/Height**: unlink to scale independently
- **Rotation**: 0–3600°
- **Anchor Point**: X, Y (pivot point)
- **Anti-flicker Filter**: 0–1.0 (reduces flicker on thin lines)
- **Opacity**: 0–100%
- **Blend Mode**: Normal, Multiply, Screen, Overlay, etc.

### Keyframing in Premiere Pro:
- Stopwatch icon to enable keyframes
- Add keyframe with diamond icon
- Navigate between keyframes with arrows
- Bezier handles available in timeline
- Less powerful than After Effects but sufficient for basic motion

---

## PP-28: Speed Changes

### Speed/Duration: Ctrl+R
- **Speed**: percentage (e.g., 50% = half speed, 200% = double speed)
- **Duration**: timecode (sets speed by specifying desired duration)
- **Reverse Speed**: checkbox
- **Maintain Audio Pitch**: preserve pitch when changing speed
- **Ripple Edit, Shifting Adjacent Clips**: on/off
- **Time Interpolation**: Frame Sampling, Frame Blending, Optical Flow

### Optical Flow:
- AI-generated intermediate frames for smooth slow motion
- Best for moderate slow motion (50%–80% of original speed)
- Artifacts possible with complex motion

### Time Remapping:
- Right-click clip > Show Clip Keyframes > Time Remapping > Speed
- Rubber band shows speed percentage
- Add keyframes, drag up/down for speed
- Creates smooth speed ramps

### Freeze Frame:
- Export Frame (camera icon in Program Monitor)
- Frame Hold: right-click > Add Frame Hold
- Insert Frame Hold Segment

---

## PP-29: Auto Reframe

### Usage:
- Select clip or sequence
- Right-click > Auto Reframe Sequence (or Effect > Video Effects > Transform > Auto Reframe)
- Choose aspect ratio: Square (1:1), Vertical (9:16), 4:5, etc.
- Adobe Sensei AI tracks subject and reframes automatically
- Adjustable tracking: Slower, Default, Faster
- Apply as effect or create new sequence

---

## PP-30: Scene Edit Detection

### Usage:
- Right-click clip in timeline > Scene Edit Detection
- Automatically detects cut points in a single-file source
- Creates separate clips at each detected cut
- Sensitivity adjustment
- Creates new sequence with separated clips

---

## PP-31: Morph Cut Transition

### Usage:
- Apply as transition between two talking head clips
- AI generates in-between frames for smooth transition
- Works best with: similar framing, minimal head movement, same background
- Applied like any transition: drag to edit point
- Analyzes and renders automatically

---

## PP-32: Audio Auto-Ducking

### Essential Sound Panel:
1. Tag clips: Dialogue, Music, SFX, Ambience
2. Select Music clip
3. Check "Ducking"
4. Duck Against: choose tagged clips (Dialogue, etc.)
5. Sensitivity, Duck Amount, Fade Duration
6. Generate Keyframes
7. Adjust rubber band manually if needed

---

## PP-33: Collaboration

### Team Projects:
- Cloud-based collaborative editing
- Version history with snapshots
- Conflict resolution tools
- Invite team members
- Requires Creative Cloud for Teams/Enterprise

### Frame.io Integration:
- Built-in review panel
- Share sequences for review
- Comment overlay on timeline
- Approval workflow
- Version comparison

### Production (Productions):
- Multiple editors working on same production
- Shared project files
- Each editor works on their own sequence/project
- Lock/unlock projects within production

---

## PP-34: Keyboard Shortcuts — Customization

### Editing Shortcuts:
- Edit > Keyboard Shortcuts (Ctrl+Alt+K)
- Search for any command
- Assign new shortcut
- Multiple shortcuts per command
- Save/load shortcut sets
- Preset schemes: Adobe Premiere Pro, Avid Media Composer, Final Cut Pro 7

### Shortcut Sets:
- Save as .kys files
- Share with team members
- Import from other users
- Backup and restore

---

## PP-35: Preferences — All Categories

### General:
- Default timeline settings, bin behavior, clip import options

### Appearance:
- UI brightness (4 levels)
- Interactive controls brightness

### Audio:
- Default audio transition duration, audio gain settings

### Audio Hardware:
- Input/output device, latency

### Audio Output Mapping:
- Channel mapping for audio output

### Auto Save:
- Auto-save interval (1–99 minutes)
- Maximum project versions (1–99)

### Captions:
- Default caption appearance, import settings

### Collaboration:
- Team Projects settings

### Color:
- Default color space for new projects

### Graphics:
- Default graphics settings

### Labels:
- 16 label colors, default assignments for clip types

### Media:
- Media Cache location, database location
- Remove media cache files options

### Memory:
- RAM reserved for Premiere Pro vs other applications

### Mercury Transmit:
- External video output (AJA, Blackmagic, etc.)
- Enable/disable video and audio output

### Multi-Camera:
- Multi-camera settings

### Playback:
- Default player, preroll/postroll

### Sync Settings:
- Adobe cloud sync for preferences, presets, shortcuts

### Timeline:
- Default track heights, timeline settings

### Timeline (Trim):
- Trim offset settings

---

## PP-36: Proxy Workflow — Complete Steps

### Setup:
1. Import 4K/8K footage
2. Select clips in Project panel
3. Right-click > Proxy > Create Proxies
4. Format: ProRes Proxy (macOS) or GoPro CineForm / H.264
5. Preset: 1024×540 or 1280×720
6. Destination: Same as project or custom
7. Premiere sends to Media Encoder
8. Media Encoder creates proxy files
9. Proxy indicator appears on clips

### Toggle:
- Button editor: add Toggle Proxies button to Program Monitor toolbar
- Or: right-click Program Monitor > Toggle Proxies
- Blue outline = Proxy mode
- No indicator = Full resolution

### When to Use:
- 4K or higher resolution footage
- H.264/H.265 source media (hard to edit natively)
- Multi-stream editing (multi-cam)
- Limited hardware (CPU/GPU/RAM)

---

## PP-37: Merge Clips

### Audio Merge (Dual-System Sound):
- Sync external audio recorder with camera audio
- Select video clip and audio clip
- Clip > Merge Clips
- Method: Timecode, Start/End, Markers, Audio
- Result: linked video + high-quality audio

### Benefits:
- Replaces camera audio with better recorder audio
- Syncs by waveform analysis (most reliable)
- Preserves all tracks

---

## PP-38: Nesting Sequences

### Creating a Nested Sequence:
- Select clips in timeline
- Right-click > Nest
- Name the nested sequence
- Clips become single nested clip in timeline

### Benefits:
- Organize complex edits
- Apply effects to nested sequence as a whole
- Reuse edited sequences multiple times
- Simplify timeline

### Editing Nested:
- Double-click nested clip to open
- Changes reflect in parent sequence
- Can have multiple levels of nesting

---

## PP-39: Master Clip Effects

### Applying to Master Clip:
- Open clip in Source Monitor
- Apply effect in Effect Controls
- Effect applies to ALL instances of that clip in any sequence
- Changes propagate automatically
- Useful for: color correction applied once, seen everywhere

### Clip Effects vs Master Clip:
- **Clip Effect**: applied to specific instance in timeline
- **Master Effect**: applied to source clip, affects all instances

---

## PP-40: Essential Sound Panel — Complete

### Tagging:
- Select clip(s) in timeline
- Tag as: Dialogue, Music, SFX, Ambience

### Dialogue Options:
- Loudness: Auto Match
- Repair: Reduce Noise, Reduce Rumble, Reduce Sibilance, Reduce Mouth Noise, DeHum
- Clarity: Dynamics, EQ (Parametric, High/Low Pass)
- Creative: Reverb

### Music Options:
- Loudness: Auto Match
- Ducking: Duck Against (Dialogue), Sensitivity, Reduce By, Fade Duration

### SFX Options:
- Loudness: Auto Match
- Creative: Reverb, EQ

### Ambience Options:
- Loudness: Auto Match
- Creative: Reverb, EQ

### Auto Match:
- Analyzes audio and normalizes to broadcast standard (-24 LUFS for dialogue)

---

## PP-41: Audio Effects — Complete List

### Amplitude and Compression:
- Amplify
- Compressor
- Dynamics
- Expander/Gate
- Multiband Compressor
- Single-band Compressor

### Delay and Echo:
- Analog Delay
- Delay
- Echo

### Filter and EQ:
- EQ (Parametric)
- FFT Filter
- Graphic EQ (10-band, 20-band)
- Notch
- High Pass
- Low Pass

### Modulation:
- Chorus
- Chorus/Flanger
- Flanger
- Phaser

### Noise Reduction/Restoration:
- DeClicker
- DeCrackler
- DeEsser
- DeHummer
- DeNoiser
- DeReverb

### Reverb:
- Convolution Reverb
- Full Reverb
- Reverb
- Studio Reverb

### Special:
- Distortion
- Pitch Shifter
- Ring Modulator
- Guitar Suite
- Mastering

### Stereo Imagery:
- Balance
- Channel Volume
- Fill Left with Right
- Fill Right with Left
- Swap Channels
- Mute
- Invert

---

## PP-42: Timeline Operations — Complete

### Snapping (S):
- Magnetic alignment of clips, transitions, markers, playhead, In/Out points
- Toggle: S key or magnet icon

### Track Targeting:
- Source patching (V1, A1, etc.)
- Determines where insert/overwrite edits go
- Toggle by clicking track header

### Sync Lock:
- Keeps tracks in sync during insert/extract operations
- Toggle per track in track header

### Linked Selection:
- When enabled, selecting video selects linked audio (and vice versa)
- Toggle: chain icon or Ctrl+Shift+L

### Track Height:
- Drag track header bottom edge
- Alt+scroll wheel to resize all tracks
- Preset heights available

### Track Operations:
- Add Tracks: Ctrl+Shift+T (dialog)
- Delete Tracks: right-click track header > Delete Tracks
- Rename Track: right-click > Rename
- Lock Track: padlock icon
- Mute Track: M icon
- Solo Track: S icon (audio)

---

## PP-43: Markers

### Types:
- **Comment**: General note (green)
- **In**: Edit start point
- **Out**: Edit end point
- **Chapter**: DVD/Blu-ray chapter (blue)
- **Segment**: Podcast/segment marker (orange)
- **Selection**: Range markers

### Adding Markers:
- M key (add marker at playhead)
- Timeline panel > Add Marker button
- Right-click in time ruler > Add Marker

### Editing Markers:
- Double-click marker to open Marker dialog
- Name, comments, duration
- Color: customizable
- Type selection

### Marker Panel:
- Window > Markers
- View all markers in sequence
- Edit, delete, navigate
- Export markers as CSV

### Markers in Source Monitor:
- Add markers to source clips
- Sync markers for merge clips

---

## PP-44: Scripting & Panels

### ExtendScript:
- JavaScript-based scripting
- Automate editing tasks
- Batch process sequences
- Custom workflows

### CEP Panels:
- HTML/CSS/JS based
- Custom UI panels in Premiere Pro
- Access to Premiere Pro API

### UXP:
- Newer plugin framework
- Cross-app compatibility
- Better security model

### Useful Script Functions:
- app.project: access project
- app.project.activeSequence: current sequence
- Sequence operations: add tracks, get clips
- Clip manipulation: insert, overwrite, delete
- Export control

---

## PP-45: Media Management

### Project Manager:
- File > Project Manager
- **Consolidate and Transcode**: re-encode used media to single codec
- **Collect and Copy**: copy used media to new location
- **Exclude Unused Clips**: only include media in timeline
- **Include Handles**: extra frames beyond edit points (recommended)
- **Include Audio Conform Files**: pre-processed audio
- **Rename Media Files to Match Clip Names**: organized naming

### Media Cache:
- Edit > Preferences > Media
- Cache location: set to fast SSD
- Database location
- Clean cache: delete unused media cache files
- Conformed audio files stored in cache

### Relinking Offline Media:
- Media appears offline (red) when files moved
- Right-click > Link Media
- Navigate to new file location
- Search by file name
- Relink all instances

---

## PP-46: VR / 360° Video Editing

### Setting Up:
1. Import 360° footage (equirectangular or fisheye)
2. Right-click > Modify > Interpret Footage
3. VR Properties: Layout (Monoscopic, Stereoscopic Over/Under, Side-by-Side), Frame Layout
4. Create VR sequence (Sequence Settings > VR Properties)

### VR View in Program Monitor:
- Toggle VR video display
- Drag to look around
- VR headset support (Mercury Transmit)
- View: Equirectangular or VR headset view

### VR Effects:
- VR Blur, VR Chromatic Aberrations, VR Color Gradients
- VR Converter, VR Denoise, VR Digital Glitch
- VR Flicker Reduce, VR Glow, VR Iris Blur
- VR Plane to Sphere, VR Rotate Sphere, VR Sharpen
- VR Sphere to Plane

### VR Audio:
- Spatial audio support
- Ambisonic audio (1st, 2nd, 3rd order)
- Spatial audio effects

---

## PP-47: Color Management

### Color Spaces:
- Rec. 709 (standard HD)
- Rec. 2020 (wide color gamut)
- PQ / HLG (HDR)
- ACES
- Display P3

### Color Management in Project Settings:
- Working color space assignment
- Color management enable/disable
- Input/output color space per clip

### HDR Workflow:
- Enable HDR in sequence settings
- HDR-capable display required
- Lumetri Color supports HDR
- PQ or HLG output
- HDR metadata in export

---

## PP-48: Performance Optimization

### Playback:
- Lower playback resolution (1/2, 1/4, 1/8)
- Disable effects during playback (global fx mute: Shift+5)
- GPU acceleration (Mercury Playback Engine)
- Smart rendering (avoid re-encoding)
- Proxy workflow for heavy media

### Timeline:
- Minimize number of video tracks
- Use adjustment layers instead of per-clip effects
- Nest complex sequences
- Render previews (Enter for work area)

### Media Cache:
- Set cache to fast NVMe SSD
- Clear unused cache regularly
- Conform media before editing

### System:
- Close unnecessary applications
- Allocate sufficient RAM to Premiere
- Update GPU drivers
- Use multiple drives: OS, Projects, Cache, Exports

### Export:
- Use hardware encoding (Intel Quick Sync, NVIDIA NVENC, Apple VideoToolbox)
- Match sequence settings to output format (avoid transcoding)
- Queue in Media Encoder (background rendering)

---

## PP-49: Troubleshooting

### Common Issues:
| Problem | Solution |
|---|---|
| Media offline | Relink: right-click > Link Media |
| Playback stutter | Lower resolution, enable GPU, clear cache |
| No audio | Check audio hardware, track output, mute |
| Crashes | Update GPU drivers, clear cache, reset preferences |
| Export errors | Check output path, disk space, format settings |
| Import failure | Check codec support, convert file |
| Slow playback | Use proxy, render previews, lower resolution |
| Sync drift | Check frame rates, merge clips with audio sync |
| Memory errors | Increase RAM allocation, close other apps |
| Corrupted project | Open auto-save version (in Auto-Save folder) |

### Reset Preferences:
- Hold Alt+Shift (Windows) or Option+Shift (macOS) while launching Premiere Pro
- Confirms preference reset dialog
- Resets all preferences to default

---

## PP-50: Best Practices

### Project Organization:
- Use bins for: Footage, Music, SFX, Graphics, Sequences, Exports
- Name clips and sequences descriptively
- Color-code with labels (by type, status, etc.)
- Use sub-bins for large projects
- Create sequence templates with standard tracks and settings

### Editing:
- Rough cut first, then refine
- Use keyboard shortcuts (dramatically speeds editing)
- Set In/Out before inserting clips
- Use ripple delete instead of delete + close gap
- Mark important points during review

### Audio:
- Normalize audio levels (-24 LUFS for broadcast dialogue)
- Always check audio in headphones
- Use Essential Sound panel for quick fixes
- Leave headroom (peaks should not exceed -6 dB for mixes)

### Color:
- Correct exposure and white balance first
- Work with scopes (don't trust eyes alone)
- Apply LUTs last (after correction)
- Match shots within scene

### Export:
- Always export test section first
- Match delivery requirements (bitrate, resolution, codec)
- Use Media Encoder for batch exports
- Archive projects with Project Manager

---

## PP-51: Keyboard Shortcut Quick Reference (Printable)

### Most Important:
| Action | Shortcut |
|---|---|
| Play/Stop | Space |
| Forward/Back 1 Frame | → / ← |
| Forward/Back 5 Frames | Shift+→ / Shift+← |
| Set In Point | I |
| Set Out Point | O |
| Clear In/Out | Alt+X |
| Insert | , |
| Overwrite | . |
| Add Edit | Ctrl+K |
| Ripple Delete | Shift+Delete |
| Default Transition | Ctrl+D |
| Speed/Duration | Ctrl+R |
| Undo | Ctrl+Z |
| Save | Ctrl+S |
| Import | Ctrl+I |
| Export | Ctrl+M |
| Selection Tool | V |
| Razor Tool | C |
| Ripple Edit | B |
| Rolling Edit | N |
| Track Select | A |
| Zoom | Z |
| Hand | H |
| Match Frame | F |
| Render Previews | Enter |
| Audio Gain | G |
| Snap | S |
| Go to Start | Home |
| Go to End | End |
| Next Edit | ↓ |
| Previous Edit | ↑ |

---
---

# ═══════════════════════════════════════════════════════════════════
# PART C: INTEGRATION & ADVANCED WORKFLOWS
# ═══════════════════════════════════════════════════════════════════

---

## INT-01: After Effects ↔ Premiere Pro Roundtrip

### Workflow Options:
1. **Dynamic Link** (recommended for live updates)
2. **Replace with After Effects Composition** (clip-level)
3. **Import AEP file** (composition-level)
4. **Intermediate rendering** (best performance)

### Roundtrip Best Practices:
- Lock edit before sending to AE (avoid re-doing work)
- Pre-compose in AE for clean handoff
- Use Dynamic Link for short sequences (performance cost)
- Render and replace for long/complex comps
- Keep project bins synced

---

## INT-02: Photoshop Integration

### Import to Premiere Pro:
- Maintain layers as individual tracks
- Layer order preserved
- Edit > Edit in Photoshop for round-trip

### Import to After Effects:
- Import as composition (layered)
- Maintain layer styles, blending modes, masks
- Edit > Edit Original to open in Photoshop
- Smart Objects remain editable

### Best Practices:
- Use consistent document size
- Name layers clearly
- Group related elements
- Use adjustment layers (convert to AE adjustment layers)
- Separate background, mid-ground, foreground

---

## INT-03: Illustrator Integration

### Import to After Effects:
- Import as composition (layered) or footage (flat)
- Continuously rasterized (always sharp)
- Convert to Shape Layers for path animation
- Maintain layer structure

### Import to Premiere Pro:
- Import as single image or layered composition
- Rescale freely (vector = infinite resolution)

### Best Practices:
- Outline fonts before exporting (or use system fonts)
- Separate elements on different layers
- Use simple paths (avoid excessive anchor points)
- AI files can be live-linked

---

## INT-04: Audition Integration

### Send from Premiere Pro:
- Edit in Adobe Audition: right-click > Edit Clip in Audition
- Audio opens in Audition with video reference
- Perform advanced audio processing
- Save: updates automatically in Premiere Pro

### Send from After Effects:
- Select audio layer > Edit in Adobe Audition

### Audition Capabilities:
- Spectral frequency display
- Noise reduction (advanced)
- De-reverb, de-hum, de-clip
- Multi-track mixing
- Podcast production
- Sound design
- Surround sound mixing
- Batch processing

---

## INT-05: Media Encoder Integration

### From Premiere Pro:
- Ctrl+Shift+M: Send sequence to AME
- Multiple sequences: queue all
- AME encodes in background
- Premiere Pro remains free for editing

### From After Effects:
- Ctrl+Alt+M: Send comp to AME
- Multiple comps: queue all
- AME encodes while AE is free

### AME Features:
- Batch encoding
- Multiple outputs per source
- Preset management
- Watch folders (auto-encode)
- Priority queue
- Parallel encoding
- Encoding preview
- Hardware acceleration

---

## INT-06: Frame.io Integration

### Setup:
- Sign in with Adobe ID
- Link Frame.io account

### Features:
- Share sequences for review
- Comment overlay on video
- Frame-accurate annotations
- Approval workflow
- Version comparison
- Team collaboration

### Workflow:
1. Upload sequence to Frame.io
2. Share link with reviewers
3. Reviewers comment with time-stamped notes
4. Comments appear as markers in Premiere Pro
5. Address notes, re-upload for approval

---

## INT-07: Team Projects

### Features:
- Cloud-based project storage
- Real-time collaboration
- Version history (snapshots)
- Conflict resolution
- Lock/unlock sequences

### Setup:
- Creative Cloud for Teams/Enterprise
- Switch to Team Projects in Premiere Pro
- Invite collaborators

### Limitations:
- Requires internet connection
- Some effects may not be supported
- Limited to Creative Cloud subscribers

---

## INT-08: Common Professional Workflows

### Documentary:
1. Transcribe all interviews (Speech to Text)
2. Organize by topic in bins
3. Rough assembly from selects
4. Structure narrative in sequences
5. B-roll overlay
6. Music and sound design
7. Color correction
8. Graphics and titles
9. Final mix in Audition
10. Export for distribution

### Short Film / Narrative:
1. Ingest and organize dailies
2. Sync audio (dual-system sound)
3. Editor's assembly
4. Director's cut
5. Fine cut
6. VFX in After Effects (via Dynamic Link)
7. Color correction
8. Sound design and mix
9. Final render and delivery

### Corporate / Commercial:
1. Review brief and footage
2. Create multiple edits (versions for different platforms)
3. Add graphics and lower thirds (MOGRTs)
4. Color correction
5. Music and VO
6. Client review (Frame.io)
7. Revisions
8. Export multiple formats (YouTube, social, broadcast)

### Social Media:
1. Select vertical (9:16) or square (1:1) format
2. Auto Reframe for aspect ratio conversion
3. Add captions (auto-generate from speech)
4. Burn in captions (open captions for social)
5. Add graphics and text overlays
6. Export with platform-specific settings

### Music Video:
1. Sync performance footage with master audio
2. Multi-cam edit of multiple takes
3. Cut to beat (marker-based editing)
4. Color grade for style
5. VFX and motion graphics in AE
6. Final export

---

## INT-09: LUTs and Color Management

### What is a LUT:
- Lookup Table: mathematically maps input colors to output colors
- Types: 1D (tone curve), 3D (full color transform)
- Formats: .cube, .3dl, .look, .mga, .csp

### Using LUTs:
- **Premiere Pro**: Lumetri Color > Input LUT or Creative Look
- **After Effects**: Apply Color LUT effect, or Lumetri Color

### LUT Workflow:
1. Shoot in Log or flat profile (maximize dynamic range)
2. Apply technical LUT to convert Log → Rec.709 (for monitoring)
3. Color correct/grade in correct color space
4. Apply creative LUT for desired look (optional)
5. Ensure output is in correct color space for delivery

### Custom LUTs:
- Create in DaVinci Resolve, Photoshop, or dedicated LUT tools
- Export as .cube file
- Import in Premiere Pro or After Effects
- Share with team or sell

---

## INT-10: HDR Workflow

### HDR Formats:
- HDR10 (PQ, static metadata)
- HDR10+ (PQ, dynamic metadata)
- Dolby Vision (PQ, dynamic metadata)
- HLG (Hybrid Log-Gamma, broadcast)

### Setup:
1. Shoot in HDR-capable format (Log, RAW, HLG)
2. Set project color space to Rec. 2020 + PQ/HLG
3. Edit in HDR sequence
4. Monitor on HDR-capable display
5. Lumetri Color handles HDR signals
6. Export with HDR metadata

### Requirements:
- HDR-capable camera footage
- HDR-capable display (monitor or TV)
- HDR-capable export format
- Proper metadata embedding

---

## INT-11: Output Delivery Formats

### Web / Streaming:
| Platform | Format | Resolution | Bitrate |
|---|---|---|---|
| YouTube | H.264/H.265 | 1080p–8K | 10–100+ Mbps |
| Vimeo | H.264 | 1080p–4K | 10–50 Mbps |
| Facebook | H.264 | 1080p | 8–12 Mbps |
| Instagram | H.264 | 1080×1080 / 1080×1350 | 6–10 Mbps |
| TikTok | H.264 | 1080×1920 (9:16) | 6–10 Mbps |
| Twitter | H.264 | 1280×720 | 5–8 Mbps |

### Broadcast:
| Format | Codec | Resolution | Notes |
|---|---|---|---|
| HD Broadcast | ProRes 422 HQ | 1920×1080 | Apple ecosystem |
| HD Broadcast | DNxHD 185 | 1920×1080 | Avid ecosystem |
| 4K Broadcast | ProRes 4444 | 3840×2160 | Apple ecosystem |
| 4K Broadcast | DNxHR HQX | 3840×2160 | Avid ecosystem |
| IMF (Netflix) | JPEG2000 | Up to 4K | Interoperable Master Format |

### Archive:
| Format | Notes |
|---|---|
| ProRes 4444 | Lossless quality, alpha support |
| DNxHR 444 | Lossless quality, alpha support |
| EXR Sequence | Multi-channel, lossless |
| DPX Sequence | Film industry standard |
| TIFF Sequence | High-quality still frames |

### Social Media Export Presets (AME):
- YouTube 1080p, 4K
- Facebook 1080p
- Twitter HD
- Vimeo 1080p, 4K
- Instagram 1:1, 4:5, 9:16
- TikTok 9:16

---
---

# ═══════════════════════════════════════════════════════════════════
# PART D: QUICK REFERENCE TABLES
# ═══════════════════════════════════════════════════════════════════

---

## QR-01: After Effects vs Premiere Pro Comparison

| Feature | After Effects | Premiere Pro |
|---|---|---|
| **Primary Use** | Motion graphics, VFX, compositing | Video editing, assembly, finishing |
| **Editing Model** | Layer-based, composition-centric | Track-based, timeline-centric |
| **Timeline** | Per-composition (stacking layers) | Multi-track (parallel clips) |
| **Keyframes** | Detailed graph editor, expressions | Basic keyframes, rubber bands |
| **3D** | Built-in 3D camera, lights, layers | None (use AE via Dynamic Link) |
| **Effects** | 250+ effects, deep customization | 150+ effects, simpler controls |
| **Color** | Lumetri Color, Colorama, Curves | Lumetri Color (better UI) |
| **Audio** | Basic (preview only) | Full audio mixing (track mixer) |
| **Export** | Render Queue + AME | Export dialog + AME |
| **Multi-cam** | Not supported | Full multi-cam support |
| **Text** | Advanced per-character animation | Essential Graphics, titles |
| **Tracking** | Point tracking, Mocha, Camera Tracker | Warp Stabilizer only |
| **Keying** | Keylight, Color Key, etc. | Ultra Key, Color Key |
| **Speed** | Not real-time (render per frame) | Real-time playback |
| **Frame Rate** | Any (composition setting) | Sequence-locked |
| **Best For** | Short sequences, effects, graphics | Long-form editing, assembly |

---

## QR-02: Codec Comparison

| Codec | Quality | File Size | Edit Performance | Use Case |
|---|---|---|---|---|
| H.264 | Good | Small | Poor (editing) | Delivery, streaming |
| H.265/HEVC | Better | Smaller | Very poor (editing) | Delivery, 4K/HDR |
| ProRes 422 | Excellent | Large | Excellent (editing) | Editing intermediate |
| ProRes 4444 | Lossless | Very large | Good | VFX, alpha |
| DNxHD/HR | Excellent | Large | Excellent (editing) | Editing intermediate |
| AVI (Uncompressed) | Perfect | Huge | Good | Archival |
| EXR | Perfect | Huge | Moderate | VFX, compositing |
| RAW | Perfect | Huge | Poor | Color grading |

---

## QR-03: Common Frame Rates

| Rate | Use Case |
|---|---|
| 23.976 fps | Film look, cinematic (most common for narrative) |
| 24 fps | True film rate (cinema projection) |
| 25 fps | PAL broadcast (Europe, parts of Asia) |
| 29.97 fps | NTSC broadcast (US, Japan) |
| 30 fps | Web video, corporate |
| 50 fps | PAL sports, slow motion (conforming) |
| 59.94 fps | NTSC sports, live events |
| 60 fps | Web, gaming, smooth motion |
| 120 fps | Slow motion (conform to 24/30) |
| 240 fps | Extreme slow motion (conform to 24/30) |

---

## QR-04: Resolution Standards

| Name | Resolution | Pixels | Aspect Ratio |
|---|---|---|---|
| SD (NTSC) | 720×480 | 345,600 | 4:3 / 16:9 |
| SD (PAL) | 720×576 | 414,720 | 4:3 / 16:9 |
| 720p (HD) | 1280×720 | 921,600 | 16:9 |
| 1080p (Full HD) | 1920×1080 | 2,073,600 | 16:9 |
| 2K DCI | 2048×1080 | 2,211,840 | ~17:9 |
| 1440p (QHD) | 2560×1440 | 3,686,400 | 16:9 |
| 4K UHD | 3840×2160 | 8,294,400 | 16:9 |
| 4K DCI | 4096×2160 | 8,847,360 | ~17:9 |
| 6K | 6144×3456 | 21,233,664 | 16:9 |
| 8K UHD | 7680×4320 | 33,177,600 | 16:9 |

---

## QR-05: Audio Sample Rates

| Rate | Use Case |
|---|---|
| 8,000 Hz | Telephone |
| 11,025 Hz | Low-quality voice |
| 22,050 Hz | Medium quality |
| 32,000 Hz | Digital broadcast |
| 44,100 Hz | CD quality (music) |
| 48,000 Hz | Video standard (film, broadcast) |
| 96,000 Hz | High-resolution audio |
| 192,000 Hz | Ultra-high-resolution |

---

## QR-06: Audio Bit Depths

| Bit Depth | Dynamic Range | Use Case |
|---|---|---|
| 8-bit | ~48 dB | Low quality, games |
| 16-bit | ~96 dB | CD quality |
| 24-bit | ~144 dB | Professional recording |
| 32-bit float | ~1528 dB | Professional editing, mixing |

---

## QR-07: Aspect Ratios

| Ratio | Use |
|---|---|
| 1:1 | Instagram posts, social media |
| 4:3 | Legacy TV, some presentations |
| 16:9 | Standard HD/UHD video |
| 17:9 | DCI cinema |
| 2:1 | Univisium (Netflix) |
| 21:9 | Ultra-wide cinema |
| 2.35:1 | Anamorphic cinema |
| 2.39:1 | Modern anamorphic |
| 9:16 | Vertical video (TikTok, Reels, Stories) |
| 4:5 | Instagram feed optimal |
| 19.5:9 | iPhone display |

---

## QR-08: Lumetri Color Order of Operations

1. **Input LUT**: Convert camera log to working space
2. **White Balance**: Correct color temperature
3. **Exposure**: Set overall brightness
4. **Contrast**: Adjust tonal range
5. **Highlights/Shadows**: Fine-tune tonal distribution
6. **Whites/Blacks**: Set absolute endpoints
7. **Saturation/Vibrance**: Color intensity
8. **Curves**: Precise tonal and color adjustments
9. **Color Wheels**: Shadow/midtone/highlight tinting
10. **HSL Secondary**: Targeted color adjustments
11. **Creative Look LUT**: Apply artistic grade
12. **Vignette**: Edge darkening

---

## QR-09: After Effects Render Order

1. Masks
2. Effects (in order applied in Timeline)
3. Transform properties
4. Time remapping
5. Frame blending
6. Motion blur
7. Layer switches (collapse, quality)
8. Track matte
9. Blending mode
10. Parenting (applied before rendering)

**Note**: Render order can be modified with adjustment layers, pre-comps, and effect order.

---

## QR-10: File Size Calculator

### Uncompressed Video (per second):
**Formula**: Width × Height × Bit Depth × Frame Rate × Channels / 8

| Format | Bit Depth | Frame Rate | Per Second | Per Minute |
|---|---|---|---|---|
| 1080p | 8-bit | 24 fps | ~142 MB | ~8.5 GB |
| 1080p | 10-bit | 24 fps | ~178 MB | ~10.7 GB |
| 4K UHD | 8-bit | 24 fps | ~570 MB | ~34.2 GB |
| 4K UHD | 10-bit | 24 fps | ~712 MB | ~42.7 GB |
| 8K UHD | 10-bit | 24 fps | ~2.85 GB | ~171 GB |

### Compressed (H.264 typical):
| Format | Bitrate | Per Minute |
|---|---|---|
| 1080p | 10 Mbps | ~75 MB |
| 1080p | 50 Mbps | ~375 MB |
| 4K UHD | 50 Mbps | ~375 MB |
| 4K UHD | 100 Mbps | ~750 MB |
| 4K UHD | 400 Mbps (ProRes) | ~3 GB |

---

## QR-11: Keyboard Shortcut Comparison (AE vs PP)

| Action | After Effects | Premiere Pro |
|---|---|---|
| New Comp/Sequence | Ctrl+N | Ctrl+N |
| Import | Ctrl+I | Ctrl+I |
| Save | Ctrl+S | Ctrl+S |
| Undo | Ctrl+Z | Ctrl+Z |
| Redo | Ctrl+Shift+Z | Ctrl+Shift+Z |
| Copy | Ctrl+C | Ctrl+C |
| Paste | Ctrl+V | Ctrl+V |
| Duplicate | Ctrl+D | Ctrl+Shift+/ |
| Select All | Ctrl+A | Ctrl+A |
| Play/Stop | Space | Space |
| Split/Cut | Ctrl+Shift+D | Ctrl+K |
| Export | Ctrl+Shift+/ | Ctrl+M |
| AME | Ctrl+Alt+M | Ctrl+Shift+M |
| Zoom In | Ctrl+= | = |
| Zoom Out | Ctrl+- | - |
| Next Frame | PgDn | → |
| Previous Frame | PgUp | ← |
| Start | Home | Home |
| End | End | End |
| Keyframe Nav | J / K | N/A (manual) |

---

## QR-12: Troubleshooting Quick Reference

| Issue | After Effects Fix | Premiere Pro Fix |
|---|---|---|
| Slow playback | Lower resolution, purge cache, MFR | Lower resolution, proxy, render previews |
| Missing media | File > Dependencies > Find Missing | Right-click > Link Media |
| Crashing | Update GPU drivers, reset prefs | Update GPU drivers, reset prefs |
| No audio | Check audio hardware prefs | Check audio hardware prefs |
| Memory errors | Increase RAM, purge cache | Increase RAM, close apps |
| GPU issues | Switch to Software Only | Switch to Software Only |
| Export fails | Check format, disk space | Check format, disk space |
| Green preview | Toggle GPU, update drivers | Toggle GPU, update drivers |
| Expression error | Check syntax, layer names | N/A |
| Effect missing | Install plugin | Install plugin |

---
---

# ═══════════════════════════════════════════════════════════════════
# END OF DOCUMENT
# ═══════════════════════════════════════════════════════════════════

---

**Document Summary:**
- **Part A**: After Effects (Sections AE-01 through AE-48) — Complete interface, menus, tools, effects, expressions, 3D, tracking, roto, keying, rendering, scripting, keyboard shortcuts, troubleshooting
- **Part B**: Premiere Pro (Sections PP-01 through PP-51) — Complete interface, menus, tools, effects, transitions, audio, color, multi-cam, captions, export, keyboard shortcuts, troubleshooting
- **Part C**: Integration Workflows (Sections INT-01 through INT-11) — Roundtrip, Photoshop, Illustrator, Audition, Media Encoder, Frame.io, Team Projects, professional workflows, LUTs, HDR, delivery
- **Part D**: Quick Reference Tables (Sections QR-01 through QR-12) — Comparisons, codec tables, resolution standards, aspect ratios, Lumetri order, render order, file sizes, keyboard shortcuts, troubleshooting

**Total Sections: ~160**
**Total Lines: ~2,500+ (maximum single response capacity)**
```