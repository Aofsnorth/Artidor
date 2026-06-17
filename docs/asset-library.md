# Asset library research

Source research output for the "150+ items per category" expansion.

Full TypeScript file (1151 items across 8 categories) lives in
[`asset-library-research.ts.txt`](./asset-library-research.ts.txt) and is ready
to be split into per-category files in `apps/web/src/lib/`.

| Category      | Count | Subcategories                                                                  |
| ------------- | ----- | ------------------------------------------------------------------------------ |
| Stickers      | 186   | Emotions, Animals, Food, Tech, Travel, Sports, Music, Weather, Celebration, Gaming |
| Overlays      | 179   | Light Leak, Dust, Scratches, Film Grain, Lens Flares, Snow, Rain, Fog, Smoke, Glitter, Sparkle, Bokeh, Halftone, Halos, Vignettes, Glitch, Paper, Neon, Prismatic, Holographic, VHS |
| Transitions   | 162   | Fade, Slide, Push, Zoom, Rotate, Wipe, Morph, Glitch, Liquid, Light, 3D, Geometric |
| Effects       | 188   | Blur, Glow, Color (LUT), Distortion, Stylize, Particles, Texture, Light |
| Motion        | 152   | In, Out, InOut, Loop                                                            |
| Templates     | 150   | Intro, Outro, Lower-third, Title, Callout, Quote, Promo, Tutorial, Stories, Reels, Vlog, Product, Event, Music video, Cinematic |
| Adjustments   | 78    | DaVinci-style primary wheels, curves, HSL, qualifiers, LUTs, scopes |
| Inspector     | 56    | 50+ inspector tabs/features for NLE parity                                      |

## Wiring

1. Split the file into per-category modules under
   `apps/web/src/lib/presets/{stickers,overlays,transitions,effects,motion,templates,adjustments}.ts`.
2. Update the corresponding `apps/web/src/components/editor/panels/assets/views/*.tsx` to
   consume the new modules and the `category-bar` filter.
3. Keep the existing `DraggableItem` / `useTransitions` / `effectsRegistry`
   contracts intact so the rest of the editor continues to work.
