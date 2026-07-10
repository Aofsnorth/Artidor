# 75 Shape Assets — Format Detail

> Format disusun sesuai request: **Definisi bentuk**, **Bentuk asset**, **Kegunaan**, dan **Properti wajib** untuk setiap shape.

> Catatan: daftar ini adalah katalog shape asset untuk implementasi editor/motion graphics yang terinspirasi workflow Alight Motion. Sumber publik resmi belum mengonfirmasi angka 75 shape built-in secara eksplisit.

---

## 01. Circle

### Definisi bentuk

Circle bulat sempurna dengan jarak tepi yang sama dari titik tengah. Bisa dibuat sebagai shape filled, stroke-only, atau mask bulat.

### Bentuk asset

- Center point.
- Radius.
- Fill atau stroke.
- Anchor di tengah.
- Optional feather untuk mask.

### Kegunaan

- Dot animation.
- Avatar mask.
- Glowing orb.
- Face blur mask.
- Circular highlight.

### Properti wajib

- Radius.
- Fill color.
- Stroke width.
- Stroke color.
- Opacity.

---

## 02. Ellipse / Oval

### Definisi bentuk

Ellipse adalah circle yang diregangkan pada sumbu X atau Y. Bentuknya bisa oval horizontal atau oval vertikal.

### Bentuk asset

- Radius X.
- Radius Y.
- Center point.
- Fill atau stroke.
- Optional rotation.

### Kegunaan

- Spotlight lembut.
- Oval mask.
- Highlight wajah.
- Blob sederhana.
- Background decoration.

### Properti wajib

- Radius X.
- Radius Y.
- Fill.
- Stroke.
- Rotation.

---

## 03. Square

### Definisi bentuk

Square adalah bentuk kotak dengan empat sisi sama panjang dan empat sudut 90 derajat.

### Bentuk asset

- Width dan height sama.
- 4 corner point.
- Fill atau stroke.
- Anchor center.

### Kegunaan

- Icon tile.
- Pixel block.
- Checker pattern.
- Square mask.
- Minimal UI card.

### Properti wajib

- Size.
- Fill color.
- Stroke width.
- Corner radius optional.
- Opacity.

---

## 04. Rectangle

### Definisi bentuk

Rectangle adalah bentuk empat sisi dengan sudut siku-siku, biasanya dipakai sebagai panel, background, atau mask.

### Bentuk asset

- Width.
- Height.
- 4 corner point.
- Fill atau stroke.
- Anchor center.

### Kegunaan

- Lower-third.
- Title bar.
- Background panel.
- Wipe transition.
- Video crop mask.

### Properti wajib

- Width.
- Height.
- Fill.
- Stroke.
- Position.

---

## 05. Rounded Rectangle

### Definisi bentuk

Rounded rectangle adalah rectangle dengan sudut membulat. Cocok untuk tampilan UI modern dan card halus.

### Bentuk asset

- Width.
- Height.
- Corner radius.
- Fill atau stroke.
- Optional per-corner radius.

### Kegunaan

- Button.
- Caption box.
- Glass card.
- Notification panel.
- Modern UI container.

### Properti wajib

- Corner radius.
- Width.
- Height.
- Fill.
- Shadow.

---

## 06. Pill / Capsule

### Definisi bentuk

Pill adalah rounded rectangle dengan radius sangat besar sampai ujung kiri dan kanan menjadi setengah lingkaran.

### Bentuk asset

- Width.
- Height.
- Radius otomatis setengah tinggi.
- Fill atau stroke.
- Optional icon/text slot.

### Kegunaan

- Tag.
- Chip.
- Progress bar.
- Toggle button.
- CTA button.

### Properti wajib

- Height.
- Width.
- Auto radius.
- Fill.
- Padding.

---

## 07. Superellipse / Squircle

### Definisi bentuk

Superellipse atau squircle adalah campuran antara square dan circle, dengan sudut yang sangat halus dan tidak terlalu kotak.

### Bentuk asset

- Width.
- Height.
- Curve exponent.
- Corner smoothness.
- Fill/stroke.

### Kegunaan

- App icon base.
- Soft UI card.
- Premium panel.
- Profile frame.
- Modern thumbnail.

### Properti wajib

- Curve amount.
- Width.
- Height.
- Fill.
- Corner smoothing.

---

## 08. Diamond

### Definisi bentuk

Diamond adalah square yang diputar 45 derajat sehingga terlihat seperti belah ketupat.

### Bentuk asset

- 4 point simetris.
- Width/height.
- Rotation 45 derajat.
- Fill atau stroke.

### Kegunaan

- Badge.
- Sparkle base.
- Transition shard.
- Geometric pattern.
- Marker.

### Properti wajib

- Size.
- Rotation.
- Fill.
- Stroke.
- Anchor center.

---

## 09. Parallelogram

### Definisi bentuk

Parallelogram adalah bentuk empat sisi dengan sisi berhadapan sejajar dan bagian samping miring.

### Bentuk asset

- Width.
- Height.
- Skew angle.
- 4 corner point.
- Fill/stroke.

### Kegunaan

- Esports banner.
- Speed graphic.
- Dynamic lower-third.
- Motion block.
- Tech panel.

### Properti wajib

- Skew angle.
- Width.
- Height.
- Fill.
- Stroke.

---

## 10. Trapezoid

### Definisi bentuk

Trapezoid adalah bentuk empat sisi dengan satu pasang sisi sejajar, biasanya sisi atas dan bawah berbeda panjang.

### Bentuk asset

- Top width.
- Bottom width.
- Height.
- 4 corner point.
- Fill/stroke.

### Kegunaan

- Perspective panel.
- Stylized label.
- Transition mask.
- Stage platform.
- Info banner.

### Properti wajib

- Top width.
- Bottom width.
- Height.
- Fill.
- Skew/offset.

---

## 11. Triangle

### Definisi bentuk

Triangle adalah polygon tiga sisi. Bentuk ini paling dasar untuk pointer, warning, dan play icon.

### Bentuk asset

- 3 vertices.
- Radius atau base-height.
- Rotation.
- Fill/stroke.

### Kegunaan

- Warning icon.
- Play button.
- Pointer.
- Geometric decoration.
- Transition shard.

### Properti wajib

- Point positions.
- Fill.
- Stroke.
- Rotation.
- Size.

---

## 12. Right Triangle

### Definisi bentuk

Right triangle adalah triangle dengan satu sudut 90 derajat.

### Bentuk asset

- Base.
- Height.
- Right-angle corner.
- Fill/stroke.
- Anchor optional.

### Kegunaan

- Corner overlay.
- Diagonal wipe.
- Folded paper effect.
- UI decoration.
- Cutout mask.

### Properti wajib

- Base.
- Height.
- Right corner position.
- Fill.
- Rotation.

---

## 13. Isosceles Triangle

### Definisi bentuk

Isosceles triangle adalah triangle dengan dua sisi sama panjang dan satu sisi sebagai base.

### Bentuk asset

- Base width.
- Height.
- Top point.
- Fill/stroke.

### Kegunaan

- Pointer.
- Marker.
- Mountain silhouette.
- Play cue.
- Badge detail.

### Properti wajib

- Base width.
- Height.
- Top point alignment.
- Fill.
- Stroke.

---

## 14. Equilateral Triangle

### Definisi bentuk

Equilateral triangle adalah triangle dengan tiga sisi sama panjang.

### Bentuk asset

- 3 vertices sama jarak.
- Radius.
- Rotation.
- Fill/stroke.

### Kegunaan

- Geometric pattern.
- Warning badge.
- Abstract motion tile.
- Logo base.
- Decorative icon.

### Properti wajib

- Side length.
- Rotation.
- Fill.
- Stroke.
- Anchor center.

---

## 15. Pentagon

### Definisi bentuk

Pentagon adalah polygon lima sisi.

### Bentuk asset

- 5 vertices.
- Center point.
- Radius.
- Rotation.
- Fill/stroke.

### Kegunaan

- Badge.
- Shield simple.
- Medallion.
- Emblem.
- Icon base.

### Properti wajib

- Radius.
- Rotation.
- Fill.
- Stroke.
- Corner roundness optional.

---

## 16. Hexagon

### Definisi bentuk

Hexagon adalah polygon enam sisi, sering dipakai untuk nuansa tech atau honeycomb.

### Bentuk asset

- 6 vertices.
- Center point.
- Radius.
- Rotation.
- Fill/stroke.

### Kegunaan

- Tech UI.
- Honeycomb grid.
- Cyber badge.
- Data card.
- Pattern background.

### Properti wajib

- Radius.
- Flat/pointy orientation.
- Fill.
- Stroke.
- Grid spacing.

---

## 17. Heptagon

### Definisi bentuk

Heptagon adalah polygon tujuh sisi.

### Bentuk asset

- 7 vertices.
- Center point.
- Radius.
- Rotation.
- Fill/stroke.

### Kegunaan

- Abstract background.
- Decorative badge.
- Geometric transition.
- Unique marker.
- Pattern tile.

### Properti wajib

- Radius.
- Rotation.
- Fill.
- Stroke.
- Corner roundness.

---

## 18. Octagon

### Definisi bentuk

Octagon adalah polygon delapan sisi, dikenal juga sebagai bentuk rambu stop.

### Bentuk asset

- 8 vertices.
- Center point.
- Radius.
- Rotation.
- Fill/stroke.

### Kegunaan

- Stop sign style.
- Badge.
- Frame.
- Alert label.
- Tech icon.

### Properti wajib

- Radius.
- Rotation.
- Fill.
- Stroke.
- Corner roundness.

---

## 19. Nonagon

### Definisi bentuk

Nonagon adalah polygon sembilan sisi.

### Bentuk asset

- 9 vertices.
- Center point.
- Radius.
- Rotation.
- Fill/stroke.

### Kegunaan

- Decorative shape.
- Geometric background.
- Badge variant.
- Motion tile.
- Pattern element.

### Properti wajib

- Radius.
- Rotation.
- Fill.
- Stroke.
- Point count.

---

## 20. Decagon

### Definisi bentuk

Decagon adalah polygon sepuluh sisi.

### Bentuk asset

- 10 vertices.
- Center point.
- Radius.
- Rotation.
- Fill/stroke.

### Kegunaan

- Coin base.
- Medallion.
- Badge.
- Seal graphic.
- Pattern tile.

### Properti wajib

- Radius.
- Rotation.
- Fill.
- Stroke.
- Point count.

---

## 21. Generic Polygon

### Definisi bentuk

Generic polygon adalah polygon dengan jumlah sisi yang bisa diubah bebas.

### Bentuk asset

- Sides count.
- Radius.
- Rotation.
- Corner roundness.
- Fill/stroke.

### Kegunaan

- Morphing shape.
- Procedural pattern.
- Custom badge.
- Icon base.
- Geometry animation.

### Properti wajib

- Sides count.
- Radius.
- Rotation.
- Roundness.
- Convert to path.

---

## 22. Rounded Polygon

### Definisi bentuk

Rounded polygon adalah polygon yang setiap sudutnya dibuat membulat.

### Bentuk asset

- Sides count.
- Radius.
- Corner radius.
- Fill/stroke.
- Rotation.

### Kegunaan

- Soft badge.
- Friendly UI icon.
- Rounded tech tile.
- Modern pattern.
- Logo base.

### Properti wajib

- Sides count.
- Corner radius.
- Radius.
- Fill.
- Stroke.

---

## 23. Star 4-Point

### Definisi bentuk

Star 4-point adalah bintang sederhana dengan empat ujung, sering dipakai sebagai sparkle.

### Bentuk asset

- Outer radius.
- Inner radius.
- 4 points.
- Rotation.
- Fill/stroke.

### Kegunaan

- Sparkle.
- Shine effect.
- Glint.
- Magic particle.
- Highlight accent.

### Properti wajib

- Outer radius.
- Inner radius.
- Point count.
- Fill.
- Rotation.

---

## 24. Star 5-Point

### Definisi bentuk

Star 5-point adalah bentuk bintang klasik dengan lima ujung.

### Bentuk asset

- 5 outer points.
- 5 inner points.
- Outer radius.
- Inner radius.
- Fill/stroke.

### Kegunaan

- Rating star.
- Achievement.
- Sticker.
- Pop effect.
- Badge.

### Properti wajib

- Point count.
- Outer radius.
- Inner radius.
- Fill.
- Stroke.

---

## 25. Star 6-Point

### Definisi bentuk

Star 6-point adalah bintang enam ujung dengan struktur radial simetris.

### Bentuk asset

- 6 outer points.
- 6 inner points.
- Outer radius.
- Inner radius.
- Rotation.

### Kegunaan

- Decorative badge.
- Sparkle.
- Pattern.
- Magic effect.
- Logo ornament.

### Properti wajib

- Outer radius.
- Inner radius.
- Point count.
- Rotation.
- Fill.

---

## 26. Star 8-Point

### Definisi bentuk

Star 8-point adalah bintang delapan ujung, biasanya terlihat seperti burst kecil.

### Bentuk asset

- 8 outer points.
- 8 inner points.
- Outer radius.
- Inner radius.
- Fill/stroke.

### Kegunaan

- Burst highlight.
- Magical sparkle.
- Attention marker.
- Promo sticker.
- Light flare.

### Properti wajib

- Point count.
- Outer radius.
- Inner radius.
- Roundness.
- Fill.

---

## 27. Multi-Point Star

### Definisi bentuk

Multi-point star adalah bintang dengan jumlah ujung fleksibel.

### Bentuk asset

- Point count.
- Outer radius.
- Inner radius.
- Roundness.
- Rotation.

### Kegunaan

- Particle star.
- Procedural sparkle.
- Background decoration.
- Pop animation.
- Energy effect.

### Properti wajib

- Point count.
- Outer radius.
- Inner radius.
- Roundness.
- Rotation.

---

## 28. Burst / Sunburst

### Definisi bentuk

Burst adalah bentuk bintang dengan banyak spike tajam seperti ledakan atau matahari.

### Bentuk asset

- Spike count.
- Outer radius.
- Inner radius.
- Spike sharpness.
- Fill/stroke.

### Kegunaan

- Impact effect.
- Comic pop.
- Explosion graphic.
- Promo badge.
- Attention marker.

### Properti wajib

- Spike count.
- Inner radius.
- Outer radius.
- Sharpness.
- Rotation.

---

## 29. Rounded Burst

### Definisi bentuk

Rounded burst adalah burst dengan ujung dan lekukan yang lebih membulat.

### Bentuk asset

- Spike count.
- Outer radius.
- Inner radius.
- Roundness.
- Fill/stroke.

### Kegunaan

- Playful sticker.
- Soft promo badge.
- Cute pop effect.
- Cartoon burst.
- Label highlight.

### Properti wajib

- Spike count.
- Roundness.
- Outer radius.
- Inner radius.
- Fill.

---

## 30. Gear

### Definisi bentuk

Gear adalah bentuk roda gigi dengan teeth berulang di sekitar lingkaran.

### Bentuk asset

- Teeth count.
- Inner radius.
- Outer radius.
- Hole radius.
- Fill/stroke.

### Kegunaan

- Settings icon.
- Mechanical animation.
- Rotating UI.
- Tech decoration.
- Machine graphic.

### Properti wajib

- Teeth count.
- Outer radius.
- Inner radius.
- Hole radius.
- Rotation.

---

## 31. Ring / Donut

### Definisi bentuk

Circle berlubang di tengah. Bisa dibuat dari circle stroke tebal atau boolean subtract antara circle besar dan kecil.

### Bentuk asset

- Outer radius.
- Inner radius.
- Fill atau stroke.
- Optional gap/progress.

### Kegunaan

- Loading indicator.
- Music visualizer ring.
- Avatar border.
- Glowing halo.
- Focus target.

### Properti wajib

- Inner radius.
- Outer radius.
- Ring thickness.
- Progress.
- Gradient along stroke kalau advanced.

---

## 32. Arc

### Definisi bentuk

Arc adalah bagian dari lingkaran berupa garis lengkung terbuka.

### Bentuk asset

- Radius.
- Start angle.
- End angle.
- Stroke width.
- Cap style.

### Kegunaan

- Progress indicator.
- Circular motion path.
- Orbit trail.
- HUD gauge.
- Loader segment.

### Properti wajib

- Start angle.
- End angle.
- Radius.
- Stroke width.
- Cap style.

---

## 33. Pie Slice

### Definisi bentuk

Pie slice adalah potongan lingkaran yang tertutup ke titik tengah seperti potongan kue.

### Bentuk asset

- Center point.
- Radius.
- Start angle.
- End angle.
- Fill/stroke.

### Kegunaan

- Pie chart.
- Radial reveal.
- Timer.
- Circular transition.
- Progress visual.

### Properti wajib

- Radius.
- Start angle.
- End angle.
- Fill.
- Progress.

---

## 34. Semi Circle

### Definisi bentuk

Semi circle adalah setengah lingkaran yang bisa tertutup atau hanya stroke arc 180 derajat.

### Bentuk asset

- Radius.
- Diameter edge.
- 180-degree arc.
- Fill atau stroke.
- Rotation.

### Kegunaan

- Wave shape.
- Tab UI.
- Transition mask.
- Decorative background.
- Gauge base.

### Properti wajib

- Radius.
- Arc angle.
- Fill/stroke.
- Rotation.
- Close path toggle.

---

## 35. Quarter Circle

### Definisi bentuk

Quarter circle adalah seperempat lingkaran dengan sudut 90 derajat.

### Bentuk asset

- Radius.
- 90-degree arc.
- Corner origin.
- Fill atau stroke.
- Rotation.

### Kegunaan

- Corner mask.
- Circular wipe.
- UI decoration.
- Rounded corner overlay.
- Gauge piece.

### Properti wajib

- Radius.
- Start angle.
- End angle.
- Fill/stroke.
- Rotation.

---

## 36. Crescent

### Definisi bentuk

Crescent adalah bentuk bulan sabit dari dua circle yang overlap atau subtract.

### Bentuk asset

- Outer circle.
- Inner circle offset.
- Boolean subtract.
- Fill/stroke.
- Rotation.

### Kegunaan

- Moon icon.
- Aesthetic overlay.
- Logo mark.
- Night theme decoration.
- Mask shape.

### Properti wajib

- Outer radius.
- Inner radius.
- Offset.
- Fill.
- Boolean mode.

---

## 37. Heart

### Definisi bentuk

Heart adalah bentuk love dengan dua lobus bulat di atas dan ujung runcing di bawah.

### Bentuk asset

- Bezier path simetris.
- Top lobes.
- Bottom point.
- Fill/stroke.
- Optional roundness.

### Kegunaan

- Like animation.
- Reaction sticker.
- Romantic edit.
- Particle heart.
- Icon badge.

### Properti wajib

- Path points.
- Fill.
- Stroke.
- Scale.
- Morph support.

---

## 38. Teardrop

### Definisi bentuk

Teardrop adalah bentuk tetesan dengan satu ujung runcing dan sisi lain membulat.

### Bentuk asset

- Bezier path.
- Tip point.
- Round body.
- Fill/stroke.
- Rotation.

### Kegunaan

- Map pin base.
- Droplet.
- Liquid animation.
- Tear effect.
- Marker icon.

### Properti wajib

- Tip position.
- Body radius.
- Fill.
- Stroke.
- Rotation.

---

## 39. Drop / Water Drop

### Definisi bentuk

Water drop adalah variasi teardrop yang lebih cair dan natural.

### Bentuk asset

- Curved bezier path.
- Pointed top.
- Round bottom.
- Fill/stroke.
- Optional highlight.

### Kegunaan

- Water effect.
- Liquid overlay.
- Splash asset.
- Rain graphic.
- Organic mask.

### Properti wajib

- Path curve.
- Tip sharpness.
- Fill.
- Opacity.
- Highlight optional.

---

## 40. Leaf

### Definisi bentuk

Leaf adalah bentuk daun dengan dua kurva yang bertemu di ujung.

### Bentuk asset

- Closed bezier path.
- Tip front.
- Base point.
- Optional center vein.
- Fill/stroke.

### Kegunaan

- Nature overlay.
- Floral design.
- Organic transition.
- Decorative pattern.
- Eco icon.

### Properti wajib

- Path curve.
- Tip position.
- Fill.
- Stroke.
- Vein toggle.

---

## 41. Petal

### Definisi bentuk

Petal adalah bentuk kelopak bunga, mirip leaf tetapi lebih simetris dan lembut.

### Bentuk asset

- Almond-like path.
- Top tip.
- Bottom tip.
- Smooth curves.
- Fill/stroke.

### Kegunaan

- Flower pattern.
- Decorative animation.
- Soft transition.
- Aesthetic overlay.
- Particle petal.

### Properti wajib

- Curve handles.
- Fill.
- Stroke.
- Rotation.
- Duplicate radial support.

---

## 42. Cloud

### Definisi bentuk

Cloud adalah bentuk awan dari gabungan beberapa lengkungan/circle.

### Bentuk asset

- Multiple lobes.
- Curved top.
- Flat/curved bottom.
- Fill/stroke.
- Optional softness.

### Kegunaan

- Dreamy overlay.
- Speech background.
- Weather icon.
- Cute decoration.
- Mask area.

### Properti wajib

- Lobe count.
- Lobe radius.
- Bottom style.
- Fill.
- Roundness.

---

## 43. Blob

### Definisi bentuk

Blob adalah bentuk organik tak beraturan dengan tepi melengkung halus.

### Bentuk asset

- Random bezier points.
- Closed path.
- Smooth handles.
- Fill/stroke.
- Optional seed.

### Kegunaan

- Modern background.
- Liquid morph.
- Soft mask.
- Aesthetic card.
- Abstract decoration.

### Properti wajib

- Point count.
- Random seed.
- Smoothness.
- Fill.
- Morph support.

---

## 44. Wavy Blob

### Definisi bentuk

Wavy blob adalah blob dengan tepi bergelombang.

### Bentuk asset

- Closed path.
- Wave amplitude.
- Wave frequency.
- Smooth curves.
- Fill/stroke.

### Kegunaan

- Playful background.
- Liquid edge.
- Animated blob.
- Organic transition.
- Decorative mask.

### Properti wajib

- Amplitude.
- Frequency.
- Phase.
- Fill.
- Animation seed.

---

## 45. Wave

### Definisi bentuk

Wave adalah bentuk garis atau area bergelombang seperti sinus.

### Bentuk asset

- Amplitude.
- Frequency.
- Phase.
- Length.
- Stroke atau closed fill.

### Kegunaan

- Audio visualizer.
- Water animation.
- Lower border.
- Background decoration.
- Motion divider.

### Properti wajib

- Amplitude.
- Frequency.
- Phase.
- Stroke width.
- Loop animation.

---

## 46. Zigzag

### Definisi bentuk

Zigzag adalah garis patah-patah berulang dengan sudut tajam.

### Bentuk asset

- Segment count.
- Amplitude.
- Length.
- Stroke width.
- Cap/join style.

### Kegunaan

- Energy effect.
- Comic shock.
- Divider.
- Warning decoration.
- Motion accent.

### Properti wajib

- Segment count.
- Amplitude.
- Stroke width.
- Join style.
- Progress.

---

## 47. Spiral

### Definisi bentuk

Spiral adalah kurva yang berputar dari tengah ke luar atau sebaliknya.

### Bentuk asset

- Turn count.
- Radius growth.
- Center point.
- Stroke width.
- Direction.

### Kegunaan

- Hypnotic transition.
- Swirl motion.
- Decorative line.
- Magic effect.
- Tunnel graphic.

### Properti wajib

- Turns.
- Radius.
- Stroke width.
- Direction.
- Progress.

---

## 48. Swirl

### Definisi bentuk

Swirl adalah spiral bebas yang lebih organik dan dekoratif.

### Bentuk asset

- Bezier open path.
- Curved tail.
- Stroke width.
- Cap style.
- Optional taper.

### Kegunaan

- Magical effect.
- Flourish.
- Motion trail.
- Decorative stroke.
- Wind effect.

### Properti wajib

- Path points.
- Stroke width.
- Taper.
- Progress.
- Cap style.

---

## 49. Straight Line

### Definisi bentuk

Straight line adalah garis lurus dari satu titik ke titik lain.

### Bentuk asset

- Start point.
- End point.
- Stroke width.
- Cap style.
- Optional arrow head.

### Kegunaan

- Underline.
- Divider.
- Connector.
- Speed line.
- Guide line.

### Properti wajib

- Start point.
- End point.
- Stroke color.
- Stroke width.
- Cap style.

---

## 50. Dashed Line

### Definisi bentuk

Dashed line adalah garis dengan pola dash dan gap berulang.

### Bentuk asset

- Path.
- Dash length.
- Gap length.
- Phase/offset.
- Stroke width.

### Kegunaan

- Route path.
- Guide line.
- Animated border.
- Motion trail.
- Map animation.

### Properti wajib

- Dash length.
- Gap length.
- Offset.
- Stroke width.
- Progress.

---

## 51. Dotted Line

### Definisi bentuk

Dotted line adalah garis yang tersusun dari titik-titik.

### Bentuk asset

- Path.
- Dot size.
- Dot spacing.
- Dot count.
- Stroke/fill color.

### Kegunaan

- Travel route.
- UI guide.
- Playful divider.
- Motion trail.
- Loading path.

### Properti wajib

- Dot size.
- Spacing.
- Path length.
- Color.
- Progress.

---

## 52. Curved Path

### Definisi bentuk

Curved path adalah garis lengkung berbasis Bezier.

### Bentuk asset

- Anchor points.
- Bezier handles.
- Stroke width.
- Cap style.
- Open path.

### Kegunaan

- Motion path.
- Trail.
- Orbit path.
- Animated route.
- Logo outline.

### Properti wajib

- Path points.
- Handles.
- Stroke width.
- Progress.
- Tangent support.

---

## 53. S-Curve

### Definisi bentuk

S-curve adalah path melengkung seperti huruf S.

### Bentuk asset

- Bezier path.
- Two opposing curves.
- Start point.
- End point.
- Stroke style.

### Kegunaan

- Elegant transition.
- Motion route.
- Camera path.
- Decorative line.
- Reveal stroke.

### Properti wajib

- Curve handles.
- Stroke width.
- Progress.
- Start/end points.
- Smoothness.

---

## 54. Arrow Right

### Definisi bentuk

Arrow right adalah panah yang mengarah ke kanan.

### Bentuk asset

- Shaft.
- Arrow head.
- Stroke atau filled polygon.
- Length.
- Thickness.

### Kegunaan

- Tutorial pointer.
- Swipe cue.
- Navigation.
- Direction marker.
- Next button.

### Properti wajib

- Length.
- Head size.
- Thickness.
- Fill/stroke.
- Direction.

---

## 55. Arrow Left

### Definisi bentuk

Arrow left adalah panah yang mengarah ke kiri.

### Bentuk asset

- Shaft.
- Arrow head.
- Stroke atau filled polygon.
- Length.
- Thickness.

### Kegunaan

- Back cue.
- Previous button.
- Transition direction.
- Pointer.
- Navigation hint.

### Properti wajib

- Length.
- Head size.
- Thickness.
- Fill/stroke.
- Direction.

---

## 56. Arrow Up

### Definisi bentuk

Arrow up adalah panah yang mengarah ke atas.

### Bentuk asset

- Vertical shaft.
- Arrow head.
- Stroke/fill.
- Length.
- Thickness.

### Kegunaan

- Upload cue.
- Growth indicator.
- Scroll hint.
- Move-up tutorial.
- Pointer.

### Properti wajib

- Length.
- Head size.
- Thickness.
- Fill/stroke.
- Direction.

---

## 57. Arrow Down

### Definisi bentuk

Arrow down adalah panah yang mengarah ke bawah.

### Bentuk asset

- Vertical shaft.
- Arrow head.
- Stroke/fill.
- Length.
- Thickness.

### Kegunaan

- Download cue.
- Scroll indicator.
- Drop marker.
- Move-down tutorial.
- Pointer.

### Properti wajib

- Length.
- Head size.
- Thickness.
- Fill/stroke.
- Direction.

---

## 58. Double Arrow

### Definisi bentuk

Double arrow adalah panah dengan dua kepala di ujung berlawanan.

### Bentuk asset

- Line shaft.
- Two arrow heads.
- Stroke/fill.
- Length.
- Thickness.

### Kegunaan

- Resize handle.
- Compare marker.
- Distance marker.
- Stretch indicator.
- Bidirectional motion.

### Properti wajib

- Length.
- Head size.
- Thickness.
- Direction axis.
- Stroke/fill.

---

## 59. Curved Arrow

### Definisi bentuk

Curved arrow adalah panah yang mengikuti garis lengkung atau arc.

### Bentuk asset

- Curved path.
- Arrow head.
- Radius/curve.
- Stroke width.
- Cap style.

### Kegunaan

- Rotate hint.
- Circular motion indicator.
- Undo/redo visual.
- Motion guide.
- Orbit cue.

### Properti wajib

- Path curve.
- Head size.
- Stroke width.
- Start/end angle.
- Progress.

---

## 60. Chevron

### Definisi bentuk

Chevron adalah bentuk V atau panah tanpa shaft.

### Bentuk asset

- Two angled strokes.
- Angle.
- Stroke width.
- Fill optional.
- Direction.

### Kegunaan

- Swipe indicator.
- Carousel cue.
- List UI.
- Next marker.
- Motion accent.

### Properti wajib

- Angle.
- Stroke width.
- Direction.
- Spacing.
- Color.

---

## 61. Double Chevron

### Definisi bentuk

Double chevron adalah dua chevron berurutan.

### Bentuk asset

- Two chevrons.
- Spacing.
- Angle.
- Stroke width.
- Direction.

### Kegunaan

- Fast-forward cue.
- Swipe prompt.
- Attention marker.
- Navigation hint.
- Motion repeat.

### Properti wajib

- Chevron count.
- Spacing.
- Angle.
- Stroke width.
- Direction.

---

## 62. Speech Bubble

### Definisi bentuk

Speech bubble adalah kotak/oval dialog dengan ekor kecil yang menunjuk ke pembicara.

### Bentuk asset

- Bubble body.
- Tail pointer.
- Rounded corners.
- Fill/stroke.
- Optional text padding.

### Kegunaan

- Dialogue.
- Comment overlay.
- Chat message.
- Comic text.
- Tutorial note.

### Properti wajib

- Body size.
- Tail position.
- Corner radius.
- Fill.
- Padding.

---

## 63. Thought Bubble

### Definisi bentuk

Thought bubble adalah bubble awan dengan titik-titik kecil menuju karakter.

### Bentuk asset

- Cloud body.
- Small dot bubbles.
- Fill/stroke.
- Lobe count.
- Optional text area.

### Kegunaan

- Thought caption.
- Comic edit.
- Dream bubble.
- Cute overlay.
- Narration graphic.

### Properti wajib

- Lobe count.
- Dot count.
- Dot spacing.
- Fill.
- Text padding.

---

## 64. Callout Label

### Definisi bentuk

Callout label adalah label dengan pointer atau garis yang menunjuk objek tertentu.

### Bentuk asset

- Label box.
- Pointer tail/line.
- Anchor target.
- Fill/stroke.
- Optional text slot.

### Kegunaan

- Annotation.
- Tutorial label.
- Product callout.
- Feature highlight.
- Explainer video.

### Properti wajib

- Label size.
- Pointer position.
- Target anchor.
- Fill.
- Text padding.

---

## 65. Bracket

### Definisi bentuk

Bracket adalah bentuk kurung siku atau curly untuk menandai area.

### Bentuk asset

- Stroke path.
- Corner/curve.
- Height.
- Width.
- Stroke style.

### Kegunaan

- Highlight section.
- Tutorial overlay.
- Code-like annotation.
- Selection marker.
- Group indicator.

### Properti wajib

- Height.
- Width.
- Stroke width.
- Bracket style.
- Position.

---

## 66. Frame Rectangle

### Definisi bentuk

Frame rectangle adalah rectangle hollow yang hanya menampilkan border.

### Bentuk asset

- Outer rectangle.
- Inner cutout atau stroke-only.
- Border thickness.
- Corner radius optional.

### Kegunaan

- Focus frame.
- Camera HUD.
- Border template.
- Selection box.
- Photo frame.

### Properti wajib

- Outer size.
- Border thickness.
- Corner radius.
- Stroke/fill.
- Opacity.

---

## 67. Frame Circle

### Definisi bentuk

Frame circle adalah frame bulat berupa ring atau circle stroke.

### Bentuk asset

- Outer radius.
- Inner radius atau stroke width.
- Fill/stroke.
- Optional gap.

### Kegunaan

- Profile frame.
- Target HUD.
- Magnifier focus.
- Circular border.
- Avatar outline.

### Properti wajib

- Radius.
- Stroke width.
- Gap/progress.
- Color.
- Glow optional.

---

## 68. Corner Frame

### Definisi bentuk

Corner frame adalah frame yang hanya muncul di empat sudut.

### Bentuk asset

- 4 L-shaped corners.
- Corner length.
- Stroke width.
- Gap center.
- Optional animation.

### Kegunaan

- Camera focus.
- Scan UI.
- Cyber overlay.
- Selection marker.
- Target lock.

### Properti wajib

- Corner length.
- Stroke width.
- Corner gap.
- Color.
- Progress.

---

## 69. Cross / Plus

### Definisi bentuk

Cross atau plus adalah dua bar yang saling tegak lurus.

### Bentuk asset

- Horizontal bar.
- Vertical bar.
- Bar thickness.
- Center overlap.
- Fill/stroke.

### Kegunaan

- Add icon.
- Medical plus.
- Target marker.
- Crosshair element.
- UI button.

### Properti wajib

- Bar length.
- Bar thickness.
- Fill.
- Stroke.
- Rotation.

---

## 70. X / Close

### Definisi bentuk

X adalah dua garis diagonal yang bersilang.

### Bentuk asset

- Diagonal stroke 1.
- Diagonal stroke 2.
- Stroke width.
- Cap style.
- Rotation.

### Kegunaan

- Close icon.
- Error marker.
- Impact graphic.
- Cancel button.
- Cross transition.

### Properti wajib

- Stroke width.
- Angle.
- Length.
- Color.
- Cap style.

---

## 71. Checkmark

### Definisi bentuk

Checkmark adalah garis patah dua segmen yang membentuk tanda centang.

### Bentuk asset

- Two-segment polyline.
- Stroke width.
- Cap style.
- Join style.
- Progress animation.

### Kegunaan

- Success indicator.
- Checklist animation.
- Approval badge.
- Task complete.
- UI feedback.

### Properti wajib

- Point positions.
- Stroke width.
- Cap style.
- Progress.
- Color.

---

## 72. Lightning Bolt

### Definisi bentuk

Lightning bolt adalah bentuk petir tajam dengan zigzag angular.

### Bentuk asset

- Angular polygon.
- Sharp corners.
- Fill/stroke.
- Optional glow.
- Rotation.

### Kegunaan

- Energy effect.
- Speed effect.
- Power icon.
- Impact edit.
- Electric transition.

### Properti wajib

- Point positions.
- Sharpness.
- Fill.
- Glow.
- Rotation.

---

## 73. Shield

### Definisi bentuk

Shield adalah bentuk perisai dengan bagian atas lebar dan bawah mengerucut.

### Bentuk asset

- Top edge.
- Side curves/edges.
- Bottom point.
- Fill/stroke.
- Optional inner border.

### Kegunaan

- Security icon.
- Achievement badge.
- Team emblem.
- Protection marker.
- Game UI.

### Properti wajib

- Path points.
- Fill.
- Stroke.
- Inner border.
- Symmetry lock.

---

## 74. Ribbon

### Definisi bentuk

Ribbon adalah strip banner dengan ujung lipatan atau V-cut.

### Bentuk asset

- Center rectangle.
- Left/right tails.
- Fold triangles.
- Fill/stroke.
- Optional shadow.

### Kegunaan

- Promo label.
- Title ribbon.
- Achievement badge.
- Sale banner.
- Decorative header.

### Properti wajib

- Width.
- Height.
- Tail size.
- Fold depth.
- Fill.

---

## 75. Custom SVG / Imported Vector Shape

### Definisi bentuk

Custom SVG adalah shape dari file/vector eksternal yang dikonversi menjadi path internal.

### Bentuk asset

- One or many vector paths.
- Groups.
- Fill/stroke.
- ViewBox.
- Transform data.

### Kegunaan

- Logo.
- Icon pack.
- Complex mask.
- Decorative asset.
- Brand element.

### Properti wajib

- SVG parser.
- Path import.
- Fill/stroke mapping.
- Scale normalization.
- Group preservation.

---

## Properti Global Semua Shape

### Definisi bentuk

Semua shape sebaiknya diperlakukan sebagai vector/parametric asset, bukan gambar statis. Dengan begitu shape bisa diskalakan, dianimasikan, dijadikan mask, dan dikonversi ke path.

### Bentuk asset

- Geometry data.
- Style data.
- Transform data.
- Keyframe data.
- Mask/composite data.
- Effect stack data.

### Kegunaan

- Shape layer.
- Motion graphic element.
- Mask/reveal.
- Reusable element.
- Template/preset.

### Properti wajib

- Fill.
- Stroke.
- Opacity.
- Blend mode.
- Position.
- Scale.
- Rotation.
- Anchor.
- Keyframe support.
- Convert to path.
