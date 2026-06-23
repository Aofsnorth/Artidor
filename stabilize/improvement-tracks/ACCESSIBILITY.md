# Accessibility Checklist

> Checklist yang **bisa dilakukan di kode** untuk membuat Artidor lebih aksesibel.
> Setiap item actionable dengan implementasi konkret. Scope: WCAG 2.1 AA
> (standar industri untuk web app) di `apps/web/`.

---

## 1. Keyboard Navigation

- [ ] **Semua interactive element bisa di-focus dengan Tab**
  - `apps/web/src/components/editor/` — cek button, input, dropdown punya
    visible focus ring.
  - Default: `focus-visible:ring-2 focus-visible:ring-accent` (sesuaikan theme).
  - File referensi: `apps/web/src/components/ui/button.tsx` (cek apakah button
    primitive sudah handle focus).

- [ ] **Custom control pakai role yang benar**
  - `apps/web/src/components/editor/panels/` — dropdown, modal, popover punya
    `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
  - Slider untuk zoom, volume, opacity → `role="slider"` + `aria-valuenow`,
    `aria-valuemin`, `aria-valuemax`.

- [ ] **Skip link ke main content**
  - `apps/web/src/app/layout.tsx` — tambah `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>` di paling atas body.

- [ ] **Escape key menutup modal/popover**
  - Cek `apps/web/src/components/ui/dialog.tsx` (atau yang setara) — handler
    `Escape` registered.
  - `apps/web/src/components/editor/dialogs/` — setiap dialog respect Escape.

- [ ] **Arrow key navigation di list/grid**
  - Timeline tracks: `aria-orientation="vertical"`, Arrow Up/Down pindah track.
  - Asset list: Arrow Up/Down/Left/Right navigasi.
  - Tab list di Inspector: Arrow Left/Right pindah tab (Roving tabindex).

- [ ] **Timeline playhead bisa dikontrol keyboard**
  - `apps/web/src/components/editor/timeline/` — Space=play/pause, J/K/L=transport,
    Arrow Left/Right=frame step, Home/End=lompat awal/akhir.

---

## 2. ARIA Labels

- [ ] **Icon-only button punya `aria-label`**
  - `apps/web/src/components/icons/` + tempat dipakai — tombol yang cuma icon
    (close, settings, add) butuh `aria-label="Close"`, `aria-label="Add asset"`, dll.
  - File referensi: `apps/web/src/components/editor/dialogs/settings-dialog.tsx`.

- [ ] **Form input punya `<label>` atau `aria-label`**
  - `apps/web/src/components/editor/panels/properties/` — input number, color
    picker, slider punya label.
  - Hidden input (file upload, color hex) → `aria-label="Hex color value"`.

- [ ] **Live region untuk status update**
  - Save status: `<div role="status" aria-live="polite">Saved</div>`.
  - Export progress: `<div role="status" aria-live="polite">Exporting 45%</div>`.
  - File referensi: `apps/web/src/components/editor/dialogs/export-dialog.tsx`.

- [ ] **Alert untuk error**
  - `<div role="alert">` untuk error message (export gagal, save gagal, dsb).
  - File referensi: error toasts di `apps/web/src/components/ui/toast.tsx`.

- [ ] **Toolbar group punya `role="toolbar"`**
  - Timeline toolbar: `role="toolbar" aria-label="Timeline tools"`.
  - Properties tabs: `role="tablist" aria-label="Element properties"`.

---

## 3. Color & Contrast

- [ ] **Contrast ratio text minimal 4.5:1 (AA)**
  - Cek tema di `apps/web/src/components/ui/` — text-white/60 di atas dark
    background = kemungkinan FAIL.
  - Audit: `text-white/40`, `text-white/50`, `text-white/60` di-check kontrasnya.
  - Fix: naikkan opacity, atau pakai warna theme variable.

- [ ] **Active state tidak hanya color**
  - Tab aktif: tidak hanya border-color beda, tapi juga weight/style.
  - Selected track: tidak hanya background, tapi juga stroke atau border.
  - Cek `apps/web/src/components/editor/timeline/timeline-element.tsx`.

- [ ] **Status info tidak hanya color**
  - Save indicator: tidak hanya dot hijau, tapi juga icon atau text.
  - Error: tidak hanya red, tapi juga icon `X` atau text "Error".

- [ ] **Dark mode default OK, light mode perlu audit**
  - Cek `apps/web/src/styles/globals.css` (atau equivalent) untuk light theme.
  - Banyak library default-nya low contrast di light mode.

---

## 4. Screen Reader

- [ ] **Heading hierarchy benar**
  - `apps/web/src/app/page.tsx` (home) — `<h1>` (satu), `<h2>` (section), `<h3>` (subsection).
  - Tidak ada skip level (h1 → h3 tanpa h2).

- [ ] **Landmark regions**
  - `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` dipakai dengan benar.
  - Cek `apps/web/src/app/layout.tsx` dan route layouts.

- [ ] **Image dan SVG punya alt text**
  - `apps/web/src/components/landing/` — image deskripsi.
  - SVG icon: `role="img" aria-label="..."` atau `aria-hidden="true"` untuk
    dekoratif.
  - File referensi: `apps/web/src/components/icons/`.

- [ ] **Data table (jika ada) pakai `<table>`**
  - Cek tabel statistik atau tabel timeline (bukan `<div>` role="table").
  - Pakai `<thead>`, `<th scope="col">`, `<tbody>`, `<td>`.

- [ ] **Custom slider/knob accessible**
  - Keyframe graph editor: `role="slider"` + value + min/max.
  - Color picker knob: `aria-valuetext` untuk hex value.

- [ ] **Editor canvas state di-describe**
  - `<canvas>` element di timeline/preview: `role="img" aria-label="Video preview at 00:01:23"`.
  - Update aria-label saat playhead bergerak (throttled).

---

## 5. Focus Management

- [ ] **Modal trap focus**
  - Dialog: focus trap (Tab/Shift+Tab cycle di dalam modal).
  - First focusable element di-focus saat modal open.
  - Focus kembali ke trigger saat modal close.
  - Library: `react-aria` atau `radix-ui` sudah handle ini jika dipakai.

- [ ] **Skip ke element baru di list**
  - Asset baru di-add: announcement `aria-live="polite"` "Asset added".
  - Timeline clip baru: focus tetap di tempat user, tapi ada announcement.

- [ ] **Focus indicator tidak pernah hilang**
  - CSS: `outline: none` di-disable? Cari `outline-none` di `apps/web/src/`.
  - Fix: ganti ke `focus-visible:ring-2` style, atau `outline: revert`.

---

## 6. Motion & Animation

- [ ] **Reduce motion preference dihormati**
  - Cek `apps/web/tailwind.config.*` (jika ada `motion-safe`, `motion-reduce`).
  - Animation yang besar (slide, fade, parallax): `@media (prefers-reduced-motion)` style.
  - Cek `apps/web/src/components/whats-new/whats-new-card.tsx` (animasi muncul).

- [ ] **Auto-play punya kontrol**
  - Video preview: tidak auto-play tanpa user gesture.
  - Animation demo: pause/play button visible.
  - Timeline: play butuh click (tidak auto-play on load).

---

## 7. Forms & Validation

- [ ] **Error message dekat input**
  - Input field error: `<p id="field-error">` di bawah input, `aria-describedby="field-error"`.
  - Cek `apps/web/src/components/editor/panels/properties/` (numeric input).

- [ ] **Required field indicator**
  - `aria-required="true"` di input wajib.
  - Required field visual indicator (asterisk atau icon).

- [ ] **Autocomplete attribute untuk data pribadi**
  - `autocomplete="email"`, `autocomplete="current-password"`, dll.
  - Cek `apps/web/src/lib/auth/` dan login form (jika ada).

---

## 8. Performance Aksesibilitas

- [ ] **Touch target minimal 44×44 px (WCAG 2.5.5)**
  - Mobile: button, icon, slider thumb minimal 44px.
  - Cek `apps/web/src/components/editor/panels/assets/` (mobile breakpoint).

- [ ] **Loading state di-announce**
  - Save: aria-live "Saving..." lalu "Saved".
  - Export: aria-live "Exporting 45%...".
  - File reference: spinner components di `apps/web/src/components/ui/`.

---

## Quick Audit

```bash
# Dari root Artidor
cd "C:\Users\Arthe\Documents\MyProject\Artidor"

# 1. outline-none (anti-pattern)
grep -rn "outline-none" apps/web/src/ --include="*.tsx" --include="*.ts"

# 2. dangerouslySetInnerHTML (perlu audit)
grep -rn "dangerouslySetInnerHTML" apps/web/src/

# 3. Missing alt (image tanpa alt)
grep -rn '<img' apps/web/src/ | grep -v 'alt='

# 4. Button tanpa aria-label (icon-only)
grep -rn '<button' apps/web/src/ | grep -E '(className.*[icon|Icon])' | head -20

# 5. aria-hidden yang salah
grep -rn 'aria-hidden' apps/web/src/

# 6. tabindex positif (biasanya anti-pattern)
grep -rn 'tabIndex="[1-9]' apps/web/src/
```

---

## Tools untuk Verifikasi

| Tool | Cara Pakai |
|---|---|
| **axe DevTools** (browser ext) | Buka editor di Chrome, jalankan scan |
| **Lighthouse** (Chrome DevTools) | Lighthouse → Accessibility → Generate Report |
| **WAVE** (browser ext) | Visual overlay di page |
| **NVDA / VoiceOver** | Manual screen reader test |
| **Keyboard-only** | Unplug mouse, navigate via Tab/Shift+Tab/Enter/Arrow |

Target: Lighthouse Accessibility ≥ 95, axe critical = 0.

---

## Severity & Tindak Lanjut

- **CRITICAL** — fitur utama tidak bisa dipakai screen reader user. → Fix immediate.
- **HIGH** — flow penting punya barrier. → Fix dalam 1 sprint.
- **MEDIUM** — UX suboptimal untuk assistive tech. → Fix oportunistic.
- **LOW** — polish, edge case. → Kumpulkan untuk batch.

---

## Quick Wins

1. Tambah `aria-label` ke icon-only buttons (impact besar, effort kecil).
2. `outline-none` → `focus-visible:ring-2` (effort 1 jam).
3. Tambah `<a href="#main-content">Skip to main content</a>` di layout.
4. `prefers-reduced-motion` di animasi besar.
5. Tambah `<div role="status" aria-live="polite">` ke save indicator.
6. `aria-hidden="true"` di SVG icon dekoratif.
7. Heading hierarchy fix di landing page.

---

## Catatan

- File ini **read-only reference** untuk audit dan checklist.
- Update status `- [x]` `- [⚠️]` `- [🚨]` langsung tanpa approval.
- Untuk fix individual, buat problem baru di `PROBLEM.MD` per RULES.MD.
- Lighthouse score harus di-track di `QA.md`.
