# Risks — Grid Template Card Placement

## UX risks
- New grid may feel too dense or too sparse.
- Preview/title/action hierarchy may become less clear.
- FlashCut-inspired behavior may not fit Artidor's current design language.

## Layout regression risks
- Shared card classes may affect other asset tabs.
- Hover/action controls may clip inside tighter grid cells.
- Long labels may overflow without `min-width: 0`/truncate handling.

## Responsive/mobile risks
- Narrow panels may create horizontal overflow.
- Cards may become too small to scan.
- Touch targets may shrink below usable size.

## Licensing/copying risks
- Reference repo code/license may restrict copying.
- Similar visual cloning could create attribution risk.
- Mitigation: use behavioral inspiration only; no direct code copy.

## Performance risks
- Large template lists may render many preview cards.
- Complex previews inside dense grids may increase paint cost.
- Mitigation: layout-only changes first; no heavy preview rewrite.
