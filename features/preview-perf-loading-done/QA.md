# QA

## Automated

| Test | Result |
| ------ | -------- |
| `render-perf-tracker.test.ts` | ✅ all assertions passed |
| `preview-quality.test.ts` (incl. adaptive) | ✅ all assertions passed |
| `bunx tsc --noEmit` | ✅ exit 0 |
| `bun run lint:web` | ✅ exit 0 |
| `bun run build:web` | ✅ build successful |

## Manual QA Checklist

### Track slider UI

- [ ] Open a project with an audio track. The volume slider shows 0–100%
      (not dB). Default is 100%.
- [ ] Click the speaker icon → track mutes, icon changes to
      `VolumeOffIcon`, slider disables, value shows "muted".
- [ ] Click again → track unmutes, icon changes to `VolumeHighIcon`,
      slider re-enables, value shows percentage.
- [ ] Open a video track. Both opacity and volume sliders are visible
      and aligned (same left icon width, same right value width).
- [ ] Click the transparency icon on opacity slider → opacity goes to 0,
      icon dims. Click again → opacity goes to 100, icon brightens.
- [ ] Drag the opacity slider → transparency icon stays bright (since
      opacity > 0). Drag to 0 → icon dims.
- [ ] Slider range is longer than before (starts further left).

### Audio combination

- [ ] Set track slider to 50%. Play audio. Audio plays at half volume.
- [ ] Set element volume to -20 dB in inspector. Set track slider to
      100%. Audio plays at -20 dB. Set track slider to 50% → audio
      plays at approximately -26 dB (half of -20 dB linear).
- [ ] Mute track via speaker icon → audio silent regardless of slider.
- [ ] No audio/clip desync during playback with various slider values.

### Preview loading overlay

- [ ] Open a large/4K video project. Scrub the timeline rapidly.
      Loading overlay ("Rendering…") appears when frame decode is slow
      (>80 ms), disappears when frame paints.
- [ ] Normal playback (small project, fast machine) → overlay never
      appears (renders complete in <80 ms).
- [ ] Overlay does NOT block pointer events, playback, or audio.
- [ ] Overlay fades in/out smoothly (150 ms transition).

### Adaptive quality (Auto mode)

- [ ] Set preview quality to Auto. Open a heavy project. Press play.
      After a few slow frames, the preview scale visibly drops
      (sharper → softer), playback becomes smoother.
- [ ] After the heavy section passes, the scale recovers
      (softer → sharper).
- [ ] Set quality to High explicitly → no adaptive change (stays 1×).
- [ ] Set quality to Medium explicitly → no adaptive change.

### Audio sync integrity

- [ ] Play a project with audio + video. During slow renders, audio
      continues uninterrupted. Video skips ahead to current playback
      time on next successful frame. No drift.
- [ ] Scrub timeline → audio follows video seek. No desync.
