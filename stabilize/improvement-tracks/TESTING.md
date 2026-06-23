# Testing Strategy

> Strategi testing yang **bisa dilakukan di kode** (bukan teori).
> Setiap rekomendasi grounded ke struktur testing yang sudah ada di repo
> (`bun test`, `playwright test`, `cargo test`).

---

## Inventaris Test Saat Ini

### Unit / Integration (Bun Test)

Per scan `find apps/web/src -name "*.test.*" -o -name "*.spec.*"`:

| Area | Lokasi | File |
|---|---|---|
| Animation | `apps/web/src/lib/animation/__tests__/` | ada |
| Graphics | `apps/web/src/lib/graphics/__tests__/` | ada |
| Masks | `apps/web/src/lib/masks/__tests__/` | ada |
| Project file | `apps/web/src/lib/project-file/__tests__/` | ada |
| Retime | `apps/web/src/lib/retime/__tests__/` | ada |
| Stickers | `apps/web/src/lib/stickers/__tests__/` | ada |
| FPS | `apps/web/src/lib/fps/__tests__/` | ada |
| What's New | `apps/web/src/lib/whats-new/__tests__/` | ada |
| Commands | `apps/web/src/lib/commands/**/` | perlu audit |
| Managers | `apps/web/src/core/managers/` | perlu audit |
| Export | `apps/web/src/lib/export/` | belum ada |
| Storage | `apps/web/src/services/storage/` | belum ada |
| AI | `apps/web/src/lib/ai/` | perlu audit |

### E2E (Playwright)

- `tests/e2e/` — pattern dari `playwright.config.ts`.
- File config: `playwright.config.ts` (di root).

### Rust

- `rust/crates/*/tests/` — perlu audit.
- `rust/wasm/` — perlu audit apakah ada wasm-bindgen-test.

---

## Coverage Minimum per Area

| Area | Target % | Justifikasi |
|---|---|---|
| `lib/time/` (Rust, 120k ticks) | 90 | Math error = silent data loss |
| `lib/wasm/` (Rust bridge) | 80 | Public API, regression = compile fail |
| `lib/fps/` | 90 | Frame conversion, similar to time |
| `lib/commands/timeline/` | 70 | User-facing destructive operations |
| `lib/commands/media/` | 70 | Import/export edge case |
| `core/managers/save-manager.ts` | 80 | Data loss risk |
| `core/managers/playback-manager.ts` | 70 | UX-critical |
| `lib/export/` | 80 | Output file integrity |
| `lib/storage/` | 70 | Quota, persistence |
| `lib/ai/providers/` | 60 | External API surface |
| UI components | 30 (smoke) | Snapshot, no deep logic |
| `lib/animations/`, `lib/effects/` | 50 | Math + visual |

---

## Pola Test yang Disarankan

### Unit (Bun)

```ts
import { describe, expect, it } from "bun:test";
import { myFunction } from "../my-module";

describe("myFunction", () => {
	it("handles empty input", () => {
		expect(myFunction("")).toBe(/* ... */);
	});

	it("handles typical case", () => {
		expect(myFunction("input")).toBe(/* ... */);
	});

	it("handles edge case: unicode, large, negative", () => {
		expect(myFunction("🔥" .repeat(1000))).toBe(/* ... */);
	});
});
```

### Hook Test (Bun + happy-dom atau jsdom)

```ts
import { renderHook } from "@testing-library/react"; // or bun:test custom
import { useMyHook } from "../use-my-hook";

it("returns initial value", () => {
	const { result } = renderHook(() => useMyHook());
	expect(result.current).toBe(/* ... */);
});
```

### Component Test (Bun + testing-library/react)

```ts
import { render, screen } from "@testing-library/react";
import { MyButton } from "../my-button";

it("renders accessible label", () => {
	render(<MyButton icon="plus" ariaLabel="Add item" />);
	expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
});
```

### Rust Unit Test

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tick_to_frame() {
        let result = tick_to_frame(120_000);
        assert_eq!(result, /* ... */);
    }
}
```

### E2E (Playwright)

```ts
import { test, expect } from "@playwright/test";

test("user can import media and add to timeline", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("button", { name: "New project" }).click();
	await page.setInputFiles('input[type="file"]', "test-assets/sample.mp4");
	await expect(page.getByText("sample.mp4")).toBeVisible();
	await page.getByText("sample.mp4").dragTo(page.getByTestId("timeline-track-1"));
	await expect(page.getByTestId("timeline-clip")).toHaveCount(1);
});
```

---

## Test yang Harus Ada (Roadmap)

### Phase 1 — Critical Path (mulai dari sini)

#### Core Math (Rust)

- [ ] `rust/crates/time/src/lib.rs`:
  - `tick_to_seconds` roundtrip
  - `seconds_to_tick` precision loss
  - `ticks_per_frame` untuk 24/25/29.97/30/50/59.94/60/120 fps
  - Frame drop / NTSC fractional fps

- [ ] `rust/crates/bridge/src/lib.rs`:
  - Serde roundtrip untuk project file
  - Error propagation `?` chain
  - Type conversion `JSValue` ↔ Rust struct

#### Save / Playback (Web)

- [ ] `apps/web/src/core/managers/__tests__/save-manager.test.ts`:
  - Debounce behavior
  - Pause/resume
  - Concurrent flush (lihat PERFORMANCE.md §1)
  - Subscribe/unsubscribe lifecycle

- [ ] `apps/web/src/core/managers/__tests__/playback-manager.test.ts`:
  - Play/pause cycle
  - Seek during play
  - Drift accumulation (mock timer)
  - Scope binding

#### Export (Web)

- [ ] `apps/web/src/lib/export/__tests__/index.test.ts`:
  - MIME type untuk mp4/webm/hevc
  - File extension generation
  - Format label rendering
  - Edge case: format = "unknown" → fallback

#### Storage (Web)

- [ ] `apps/web/src/services/storage/__tests__/indexeddb-adapter.test.ts`:
  - Get/set/remove
  - Connection reuse (no leak)
  - Quota exceeded error
  - Migration on version bump

- [ ] `apps/web/src/services/storage/__tests__/quota.test.ts`:
  - Parse size string ("1.5 GB")
  - Format bytes ke human readable

### Phase 2 — Editor Flow

#### Commands

- [ ] `apps/web/src/lib/commands/timeline/__tests__/`:
  - Split clip at playhead
  - Trim in/out
  - Ripple delete
  - Move clip between tracks
  - Undo/redo

- [ ] `apps/web/src/lib/commands/media/__tests__/`:
  - Import single file
  - Import multiple files
  - Delete asset (cascade ke timeline)
  - Quota error handling

- [ ] `apps/web/src/lib/commands/scene/__tests__/`:
  - Add scene
  - Remove scene
  - Switch scene
  - Reorder

### Phase 3 — AI

- [ ] `apps/web/src/lib/ai/tools/__tests__/`:
  - Setiap tool: valid input → command dispatched
  - Invalid input → typed error
  - Lint typed tool args

- [ ] `apps/web/src/lib/ai/style/__tests__/`:
  - Histogram calculation
  - Cut detection
  - BPM autocorrelation
  - `StyleProfile` shape

- [ ] `apps/web/src/lib/ai/providers/__tests__/`:
  - OpenAI request shape
  - Anthropic request shape
  - Ollama request shape
  - Error handling
  - Rate limit (mock)

### Phase 4 — UI Smoke (Playwright)

- [ ] `tests/e2e/smoke.spec.ts`:
  - App loads
  - Create project
  - Import sample media
  - Add to timeline
  - Play preview
  - Export (mock atau skip)

- [ ] `tests/e2e/keyboard-shortcuts.spec.ts`:
  - Space = play/pause
  - Cmd+Z = undo
  - Cmd+S = save
  - Delete = remove selected
  - Arrow keys = frame step

- [ ] `tests/e2e/accessibility.spec.ts`:
  - Lighthouse-style: focus visible
  - ARIA roles
  - Keyboard navigation

---

## CI Integration

```yaml
# .github/workflows/ci.yml (suggested addition)
- name: Unit tests
  run: bun test apps/web/src

- name: Type check
  run: cd apps/web && bunx tsc --noEmit

- name: Lint
  run: bun run lint:web

- name: Rust tests
  run: cd rust && cargo test

- name: E2E (Playwright)
  run: bunx playwright test
  env:
    CI: true

- name: Coverage report
  run: |
    bun test --coverage apps/web/src > coverage.txt
    # Opsional: upload ke Codecov / Coveralls
```

---

## Coverage Tool

Pilih salah satu:

| Tool | Pro | Kontra |
|---|---|---|
| **`bun test --coverage`** (built-in) | Zero setup, integrated | Limited report format |
| **`c8`** | Istanbul-compatible, V8 native | Extra dep |
| **`vitest --coverage`** | Powerful UI | Bun sudah ada native |

**Rekomendasi:** mulai dengan `bun test --coverage` untuk baseline, lalu evaluate
apakah butuh tooling lebih.

---

## Visual Regression (Opsional)

Untuk komponen UI yang visual-heavy (timeline, keyframe editor, color picker):

- **`playwright visual comparisons`**
  - Snapshot baseline → compare di PR
  - Update baseline: manual approval

- **`chromatic.com`** (jika ada budget)
  - Storybook + visual diff per PR
  - Free untuk OSS

**Mulai dengan:** Playwright screenshot per stable state (modal open, timeline
loaded) → compare di CI.

---

## Mutation Testing (Opsional, Lanjutan)

Untuk verify quality test, jalankan:

- **`stryker-js`** (JS/TS)
- **`cargo-mutants`** (Rust)

Mutation test: ubah satu baris source, jalankan test, harus FAIL. Jika PASS,
test tidak efektif. Run mingguan, bukan per PR (lambat).

---

## Test Data

- `tests/fixtures/` — sample media untuk E2E (MP4 kecil ~1MB, MP3, JPG, PNG, SVG).
- `tests/fixtures/projects/` — sample `.artidor` project file.
- `tests/fixtures/styles/` — sample video untuk AI style extraction.
- Generate dengan `tests/scripts/generate-fixtures.ts` (Bun script).

---

## Anti-Patterns yang Harus Dihindari

Per `mcp_Superpowers:test-driven-development` (jika di-load) dan best practice:

- ❌ **Test yang test implementation, bukan behavior.**
  - Mis: `expect(component.state.foo).toBe(1)` → fragile terhadap refactor.
  - ✅ `expect(screen.getByText("...")).toBeVisible()` → test user-facing.

- ❌ **Test tanpa assertion.**
  - Mis: `it("renders", () => { render(<X />); })` — false sense of security.
  - ✅ Selalu ada assertion.

- ❌ **Snapshot test untuk layout besar.**
  - Mis: snapshot seluruh timeline component.
  - ✅ Snapshot hanya untuk pure data (parse result, formatter output).

- ❌ **Mock-heavy test.**
  - Mock semua dependency → test cuma verifikasi "kode kita panggil kode kita".
  - ✅ Real dependency (beneran) untuk integration, mock hanya untuk external (network, time).

- ❌ **Test yang flaky (timing-dependent).**
  - `await new Promise(r => setTimeout(r, 100))` → bisa timeout di slow CI.
  - ✅ `await waitFor(() => ...)` atau fake timer.

- ❌ **Test yang delete untuk pass.**
  - Per `AGENTS.md` §"Anti-Bug Rules": "Never delete tests to make a problem disappear."

---

## Quick Start (Minggu Pertama)

Jika baru mulai tambah test, urutan:

1. **`core/managers/save-manager.ts`** (lihat PERFORMANCE.md §1) — high impact, low risk.
2. **`lib/export/`** — output integrity, pure function, easy.
3. **`lib/storage/quota.ts`** — size formatting, pure function.
4. **Rust `crates/time/src/lib.rs`** — math correctness.
5. **E2E smoke test** — Playwright basic flow.

Itu 5 test suite, estimasi 3–5 hari.

---

## Catatan

- File ini **planning + reference**, bukan instruction.
- Tidak edit test existing tanpa approval (per RULES.MD §3).
- Tambah test baru = bagian dari fix yang disetujui (per RULES.MD §5).
- Update `MAINTENANCE.MD` setiap kali test suite baru ditambahkan.
