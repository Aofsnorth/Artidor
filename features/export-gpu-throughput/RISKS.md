# Risks

## Technical Risks

- Too-conservative limits can reduce parallel speed on multi-GPU systems.
- Browser GPU adapter information can be unavailable or privacy-reduced.

## Security Risks

- None. The policy uses browser-exposed capability signals only.

## UX Risks

- A user may see fewer parallel workers than CPU cores; this is intentional when additional WebGPU contexts would compete for the same GPU.

## Performance Risks

- The heuristic cannot prove the fastest count without a per-device benchmark.

## Mitigations

- Preserve explicit worker-count override.
- Use conservative defaults only for automatic selection.
- Log the selected policy and retain serial fallback.
